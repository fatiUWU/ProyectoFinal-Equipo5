<?php
// CONTROLADOR/PedidoC.php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../CONFIG/db.php';
header('Content-Type: application/json');

$accion = isset($_GET['accion']) ? $_GET['accion'] : '';

if (!isset($_SESSION['id_usuario']) && !isset($_SESSION['id_usu'])) {
    echo json_encode(['ok' => false, 'msg' => 'Sesión expirada o inválida.']);
    exit;
}

$id_usuario_real = isset($_SESSION['id_usuario']) ? intval($_SESSION['id_usuario']) : intval($_SESSION['id_usu']);
// Variable auxiliar para usar en los logs de inventario (por si cancelan un pedido)
$id_sesion_activa = $id_usuario_real; 

try {
    // =========================================================================
    // CASO A: CREAR UN NUEVO PEDIDO
    // =========================================================================
    if ($accion === 'crear') {
        $json = file_get_contents('php://input');
        $data = json_decode($json, true);

        if (!$data) { echo json_encode(['ok' => false, 'msg' => 'No se recibieron datos válidos.']); exit; }

        $subtotal  = floatval($data['subtotal']);
        $envio     = floatval($data['envio']);
        $total     = floatval($data['total']);
        $productos = isset($data['productos']) ? $data['productos'] : [];
        $dir       = isset($data['direccion']) ? $data['direccion'] : null;

        if (empty($productos) || !$dir) { echo json_encode(['ok' => false, 'msg' => 'Faltan datos.']); exit; }

        $pdo->beginTransaction();

        $sqlPedido = "INSERT INTO pedidos (id_usu, fecha_creacion, subtotal, envio, total, estado) VALUES (?, NOW(), ?, ?, ?, 'Pendiente')";
        $stmtPed = $pdo->prepare($sqlPedido);
        $stmtPed->execute([$id_usuario_real, $subtotal, $envio, $total]);
        $id_pedido = $pdo->lastInsertId();

        foreach ($productos as $prod) {
            $id_prod  = intval($prod['id_producto']);
            $cantidad = intval($prod['cantidad']);
            $precio   = floatval($prod['precio']);

            $sqlDetalle = "INSERT INTO detalles_pedido (id_pedido, id_producto, cantidad, precio_unitario) VALUES (?, ?, ?, ?)";
            $pdo->prepare($sqlDetalle)->execute([$id_pedido, $id_prod, $cantidad, $precio]);

            $sqlStock = "UPDATE productos SET stock = stock - ? WHERE id_producto = ? AND stock >= ?";
            $stmtStock = $pdo->prepare($sqlStock);
            $stmtStock->execute([$cantidad, $id_prod, $cantidad]);

            if ($stmtStock->rowCount() === 0) { throw new Exception("Sin stock suficiente."); }
        }

        $sqlDir = "UPDATE pedidos SET calle_numero = ?, colonia = ?, cp = ?, municipio_ciudad = ?, estado_provincia = ?, telefono_contacto = ? WHERE id_pedido = ?";
        $pdo->prepare($sqlDir)->execute([
            trim($dir['calle_numero']), trim($dir['colonia']), trim($dir['cp']),
            trim($dir['municipio_ciudad']), trim($dir['estado_provincia']), trim($dir['telefono_contacto']), $id_pedido
        ]);

        $stmtHist = $pdo->prepare("INSERT INTO historial_pedidos (id_pedido, estado_anterior, estado_nuevo, fecha_cambio) VALUES (?, 'Creación', 'Pendiente', NOW())");
        $stmtHist->execute([$id_pedido]);

        $pdo->commit();
        echo json_encode(['ok' => true, 'msg' => '¡Pedido procesado!', 'id_pedido' => $id_pedido]);
    }

    // =========================================================================
    // CASO B: CAMBIAR ESTADO (ADMIN) - CON VALIDACIÓN LINEAL + DEVOLUCIONES
    // =========================================================================
    else if ($accion === 'cambiar_estado') {
        $json = file_get_contents('php://input');
        $data = json_decode($json, true);

        $id_pedido = intval($data['id_pedido']);
        $nuevo_estado = trim($data['nuevo_estado']);
        $motivo = isset($data['motivo']) ? trim($data['motivo']) : null;
        $reembolso = isset($data['reembolso']) ? trim($data['reembolso']) : 'No Aplica';

        $stmtOld = $pdo->prepare("SELECT estado FROM pedidos WHERE id_pedido = ?");
        $stmtOld->execute([$id_pedido]);
        $estado_anterior = $stmtOld->fetchColumn();

        if ($estado_anterior !== $nuevo_estado) {
            
            // --- INICIO DE VALIDACIÓN DE FLUJO LINEAL ---
            $error_flujo = false;
            $paso_esperado = '';

            if ($estado_anterior === 'Pendiente') {
                if ($nuevo_estado !== 'En Preparacion' && $nuevo_estado !== 'Cancelado') {
                    $error_flujo = true;
                    $paso_esperado = 'En Preparación';
                }
            } 
            else if ($estado_anterior === 'En Preparacion') {
                if ($nuevo_estado !== 'Enviado' && $nuevo_estado !== 'Cancelado') {
                    $error_flujo = true;
                    $paso_esperado = 'Enviado';
                }
            } 
            else if ($estado_anterior === 'Enviado') {
                if ($nuevo_estado !== 'Entregado' && $nuevo_estado !== 'Devuelto') { // Desde enviado puede llegar o devolverse
                    $error_flujo = true;
                    $paso_esperado = 'Entregado';
                }
            } 
            else if ($estado_anterior === 'Entregado') {
                if ($nuevo_estado !== 'Devuelto') {
                    echo json_encode(['ok' => false, 'msg' => '⚠️ Un pedido Entregado solo puede cambiar a Devuelto.']);
                    exit;
                }
            } 
            else if ($estado_anterior === 'Cancelado' || $estado_anterior === 'Devuelto') {
                echo json_encode(['ok' => false, 'msg' => '⚠️ El pedido ya finalizó su ciclo (Cancelado/Devuelto) y no puede ser modificado.']);
                exit;
            }

            if ($error_flujo) {
                echo json_encode([
                    'ok' => false, 
                    'msg' => "🛑 Flujo inválido: No puedes pasar de '$estado_anterior' a '$nuevo_estado'. El siguiente paso debe ser: $paso_esperado."
                ]);
                exit;
            }
            // --- FIN DE VALIDACIÓN DE FLUJO LINEAL ---

            $pdo->beginTransaction();

            // LÓGICA DE INVENTARIO: ¿Regresamos los productos al stock?
            if ($nuevo_estado === 'Cancelado' || ($nuevo_estado === 'Devuelto' && $motivo !== 'Producto Dañado')) {
                
                // Obtenemos los productos de este pedido
                $stmtDetalles = $pdo->prepare("SELECT id_producto, cantidad FROM detalles_pedido WHERE id_pedido = ?");
                $stmtDetalles->execute([$id_pedido]);
                $detalles = $stmtDetalles->fetchAll(PDO::FETCH_ASSOC);
                
                foreach($detalles as $det) {
                    // 1. Regresar la cantidad al inventario
                    $pdo->prepare("UPDATE productos SET stock = stock + ? WHERE id_producto = ?")
                        ->execute([$det['cantidad'], $det['id_producto']]);
                    
                    // 2. Registrar en la bitácora de movimientos (ajuste positivo por cancelación)
                    $pdo->prepare("INSERT INTO movimientos_inventario (id_producto, tipo_movimiento, cantidad, fecha_movimiento, id_usu) VALUES (?, 'ajuste_positivo', ?, NOW(), ?)")
                        ->execute([$det['id_producto'], $det['cantidad'], $id_sesion_activa]);
                }
            }

            // Actualizamos el pedido con el nuevo estado, motivo y estado de reembolso
            $stmt = $pdo->prepare("UPDATE pedidos SET estado = ?, motivo_cancelacion = ?, estado_reembolso = ? WHERE id_pedido = ?");
            $stmt->execute([$nuevo_estado, $motivo, $reembolso, $id_pedido]);

            // Guardamos el historial del pedido
            $stmtHist = $pdo->prepare("INSERT INTO historial_pedidos (id_pedido, estado_anterior, estado_nuevo, fecha_cambio) VALUES (?, ?, ?, NOW())");
            $stmtHist->execute([$id_pedido, $estado_anterior, $nuevo_estado]);

            $pdo->commit();
            echo json_encode(['ok' => true, 'msg' => '¡Estado y devoluciones procesados correctamente!']);
            exit;
        }

        echo json_encode(['ok' => true, 'msg' => 'No hubo cambios en el estado.']);
    }

    // =========================================================================
    // CASO C: VER HISTORIAL (LÍNEA DE TIEMPO)
    // =========================================================================
    else if ($accion === 'ver_historial') {
        $id_pedido = isset($_GET['id_pedido']) ? intval($_GET['id_pedido']) : 0;
        
        $stmt = $pdo->prepare("SELECT estado_anterior, estado_nuevo, DATE_FORMAT(fecha_cambio, '%d/%m/%Y %h:%i %p') AS fecha_formato FROM historial_pedidos WHERE id_pedido = ? ORDER BY fecha_cambio DESC");
        $stmt->execute([$id_pedido]);
        $historial = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['ok' => true, 'historial' => $historial]);
    }

    // =========================================================================
    // GUARDAR CALIFICACIÓN DEL CLIENTE
    // =========================================================================
    else if ($accion === 'guardar_calificacion') {
        $json = file_get_contents('php://input');
        $data = json_decode($json, true);

        $id_pedido = intval($data['id_pedido']);
        $tiempo = intval($data['tiempo']);
        $servicio = intval($data['servicio']);
        $calidad = intval($data['calidad']);
        $comentario = trim($data['comentario']);

        $stmtCheck = $pdo->prepare("SELECT id_calificacion FROM calificaciones_pedidos WHERE id_pedido = ?");
        $stmtCheck->execute([$id_pedido]);
        if ($stmtCheck->fetch()) {
            echo json_encode(['ok' => false, 'msg' => 'Este pedido ya fue calificado anteriormente.']);
            exit;
        }

        $stmt = $pdo->prepare("INSERT INTO calificaciones_pedidos (id_pedido, calificacion_tiempo, calificacion_servicio, calificacion_calidad, comentario) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$id_pedido, $tiempo, $servicio, $calidad, $comentario]);

        echo json_encode(['ok' => true]);
    }

    // =========================================================================
    // LISTAR MIS PEDIDOS
    // =========================================================================
    else if ($accion === 'listar_mis_pedidos') {
        $sql = "SELECT p.id_pedido, p.fecha_creacion, p.estado, p.total, p.calle_numero, p.colonia, p.municipio_ciudad, c.id_calificacion 
                FROM pedidos p 
                LEFT JOIN calificaciones_pedidos c ON p.id_pedido = c.id_pedido
                WHERE p.id_usu = ? 
                ORDER BY p.id_pedido DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$id_usuario_real]);
        echo json_encode(['ok' => true, 'pedidos' => $stmt->fetchAll()]);
    }

    // =========================================================================
    // LISTAR TODAS LAS EVALUACIONES PARA EL ADMIN
    // =========================================================================
    else if ($accion === 'listar_evaluaciones') {
        $sql = "SELECT c.*, p.fecha_creacion, u.nombre AS nombre_cliente 
                FROM calificaciones_pedidos c 
                INNER JOIN pedidos p ON c.id_pedido = p.id_pedido 
                INNER JOIN usuarios u ON p.id_usu = u.id_usu 
                ORDER BY c.fecha_registro DESC";
        $stmt = $pdo->query($sql);
        echo json_encode(['ok' => true, 'evaluaciones' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    // =========================================================================
    // ELIMINAR Y DEFAULT
    // =========================================================================
    else if ($accion === 'eliminar') {
        $json = file_get_contents('php://input');
        $data = json_decode($json, true);
        $id_pedido = isset($data['id_pedido']) ? intval($data['id_pedido']) : (isset($_GET['id']) ? intval($_GET['id']) : 0);

        if ($id_pedido <= 0) { echo json_encode(['ok' => false, 'msg' => 'ID inválido.']); exit; }

        $pdo->beginTransaction();
        $pdo->prepare("DELETE FROM calificaciones_pedidos WHERE id_pedido = ?")->execute([$id_pedido]); 
        $pdo->prepare("DELETE FROM historial_pedidos WHERE id_pedido = ?")->execute([$id_pedido]); 
        $pdo->prepare("DELETE FROM detalles_pedido WHERE id_pedido = ?")->execute([$id_pedido]);
        $pdo->prepare("DELETE FROM detalles_ruta WHERE id_pedido = ?")->execute([$id_pedido]);
        $pdo->prepare("DELETE FROM pedidos WHERE id_pedido = ?")->execute([$id_pedido]);
        $pdo->commit();
        echo json_encode(['ok' => true, 'msg' => 'Pedido removido.']);
    }

    else {
        // DEFAULT: LISTAR TODOS LOS PEDIDOS AL ADMIN
        $stmt = $pdo->query("SELECT p.*, u.nombre AS nombre_cliente FROM pedidos p INNER JOIN usuarios u ON p.id_usu = u.id_usu ORDER BY p.id_pedido DESC");
        echo json_encode(['ok' => true, 'pedidos' => $stmt->fetchAll()]);
    }

} catch (Exception $e) {
    if ($pdo->inTransaction()) { $pdo->rollBack(); }
    echo json_encode(['ok' => false, 'msg' => 'Error: ' . $e->getMessage()]);
}
?>