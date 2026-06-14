<?php
// ==========================================================================
// CONTROLADOR: GESTIÓN DE INVENTARIO (LÍMITES + RESPONSABLE + LOTES + RF-01)
// ==========================================================================
session_start();
require_once __DIR__ . '/../CONFIG/db.php';

header('Content-Type: application/json');

$json = file_get_contents('php://input');
$data = json_decode($json, true);
$accion = isset($_GET['accion']) ? trim($_GET['accion']) : '';

$id_sesion_activa = null;
if (isset($_SESSION['id_usu'])) {
    $id_sesion_activa = $_SESSION['id_usu'];
} else if (isset($_SESSION['id_usuario'])) {
    $id_sesion_activa = $_SESSION['id_usuario'];
}

if (!$id_sesion_activa) {
    echo json_encode(['ok' => false, 'msg' => 'Sesión caducada. Inicia sesión de nuevo para realizar cambios.']);
    exit;
}

try {
    // 1. LISTAR TODOS LOS PRODUCTOS
    if (empty($accion)) {
        $stmt = $pdo->query("SELECT id_producto, nombre, tipo_producto, unidad_medida, stock, stock_minimo, precio, estado, descripcion, numero_lote, fecha_produccion, fecha_caducidad FROM productos ORDER BY id_producto DESC");
        $productos = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['ok' => true, 'productos' => $productos ? $productos : []]);
        exit;
    }

    // 2. REGISTRAR UN NUEVO PRODUCTO
    else if ($accion === 'registrar') {
        $nombre = isset($data['nombre']) ? trim($data['nombre']) : '';
        $tipo_producto = isset($data['tipo_producto']) ? trim($data['tipo_producto']) : '';
        $descripcion = isset($data['descripcion']) ? trim($data['descripcion']) : '';
        $unidad_medida = isset($data['unidad_medida']) ? trim($data['unidad_medida']) : '';
        $stock = isset($data['stock']) ? intval($data['stock']) : 0;
        $stock_minimo = isset($data['stock_minimo']) ? intval($data['stock_minimo']) : 0;
        $precio = isset($data['precio']) ? floatval($data['precio']) : 0.00;

        $numero_lote = isset($data['numero_lote']) && $data['numero_lote'] !== '' ? trim($data['numero_lote']) : null;
        $fecha_produccion = isset($data['fecha_produccion']) && $data['fecha_produccion'] !== '' ? $data['fecha_produccion'] : null;
        $fecha_caducidad = isset($data['fecha_caducidad']) && $data['fecha_caducidad'] !== '' ? $data['fecha_caducidad'] : null;

        if (empty($nombre) || empty($tipo_producto) || empty($unidad_medida)) {
            echo json_encode(['ok' => false, 'msg' => 'Nombre, Categoría y Medida son obligatorios.']);
            exit;
        }

        if ($stock > 5500) {
            echo json_encode(['ok' => false, 'msg' => '¡Capacidad excedida! No puedes registrar un producto inicial con más de 5,500 unidades.']);
            exit;
        }

        $estado = ($stock === 0) ? 'No Disponible' : (($stock <= $stock_minimo) ? 'Bajo' : 'Disponible');

        $stmt = $pdo->prepare("INSERT INTO productos (nombre, tipo_producto, descripcion, unidad_medida, stock, stock_minimo, precio, estado, numero_lote, fecha_produccion, fecha_caducidad) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$nombre, $tipo_producto, $descripcion, $unidad_medida, $stock, $stock_minimo, $precio, $estado, $numero_lote, $fecha_produccion, $fecha_caducidad]);
        
        $id_nuevo_producto = $pdo->lastInsertId();
        
        if ($stock > 0) {
            $stmtMov = $pdo->prepare("INSERT INTO movimientos_inventario (id_producto, tipo_movimiento, cantidad, fecha_movimiento, id_usu) VALUES (?, 'entrada', ?, NOW(), ?)");
            $stmtMov->execute([$id_nuevo_producto, $stock, $id_sesion_activa]);
        }

        echo json_encode(['ok' => true, 'msg' => 'Producto agregado al catálogo correctamente.']);
        exit;
    }

    // 3. EDITAR PRODUCTO Y RF-01
    else if ($accion === 'editar') {
        $id_producto = isset($data['id_producto']) ? intval($data['id_producto']) : 0;
        
        if ($id_producto <= 0) {
            echo json_encode(['ok' => false, 'msg' => 'Error crítico: ID de producto no válido.']);
            exit;
        }

        $nombre = isset($data['nombre']) ? trim($data['nombre']) : '';
        $tipo_producto = isset($data['tipo_producto']) ? trim($data['tipo_producto']) : '';
        $unidad_medida = isset($data['unidad_medida']) ? trim($data['unidad_medida']) : '';
        $precio = isset($data['precio']) ? floatval($data['precio']) : 0.00;
        $stock_minimo = isset($data['stock_minimo']) ? intval($data['stock_minimo']) : 0; 
        $estado_manual = isset($data['estado']) ? trim($data['estado']) : 'Disponible';
        $descripcion = isset($data['descripcion']) ? trim($data['descripcion']) : '';
        
        $ajuste_tipo = isset($data['ajuste_tipo']) ? trim($data['ajuste_tipo']) : 'ninguno';
        $ajuste_cantidad = isset($data['ajuste_cantidad']) ? intval($data['ajuste_cantidad']) : 0;

        $numero_lote = isset($data['numero_lote']) && $data['numero_lote'] !== '' ? trim($data['numero_lote']) : null;
        $fecha_produccion = isset($data['fecha_produccion']) && $data['fecha_produccion'] !== '' ? $data['fecha_produccion'] : null;
        $fecha_caducidad = isset($data['fecha_caducidad']) && $data['fecha_caducidad'] !== '' ? $data['fecha_caducidad'] : null;

        if (empty($nombre)) {
            echo json_encode(['ok' => false, 'msg' => 'Faltan datos para procesar.']);
            exit;
        }

        $stmtStock = $pdo->prepare("SELECT stock FROM productos WHERE id_producto = ?");
        $stmtStock->execute([$id_producto]);
        $prodActual = $stmtStock->fetch(PDO::FETCH_ASSOC);
        
        if (!$prodActual) {
            echo json_encode(['ok' => false, 'msg' => 'El producto no existe.']);
            exit;
        }

        $stock_final = intval($prodActual['stock']);
        $tipo_movimiento_log = 'edit';
        $cantidad_log = 0;

        // NUEVA LÓGICA RF-01 (AJUSTES ADMINISTRATIVOS)
        $tipos_suma = ['entrada', 'ajuste_positivo'];
        $tipos_resta = ['salida', 'dañado', 'merma', 'robo', 'ajuste_negativo'];

        if (in_array($ajuste_tipo, $tipos_suma) && $ajuste_cantidad > 0) {
            if (($stock_final + $ajuste_cantidad) > 5500) {
                $espacio_disponible = 5500 - $stock_final;
                echo json_encode(['ok' => false, 'msg' => "¡Límite de almacén superado! Tienes {$stock_final} en stock y el máximo es 5,500. Solo puedes ingresar {$espacio_disponible} unidades más."]);
                exit;
            }
            $stock_final += $ajuste_cantidad;
            $tipo_movimiento_log = $ajuste_tipo;
            $cantidad_log = $ajuste_cantidad;
            
        } else if (in_array($ajuste_tipo, $tipos_resta) && $ajuste_cantidad > 0) {
            if ($ajuste_cantidad > $stock_final) {
                $nombre_ajuste = str_replace('_', ' ', $ajuste_tipo);
                echo json_encode(['ok' => false, 'msg' => "¡Operación denegada! Intentas retirar {$ajuste_cantidad} unidades por concepto de '$nombre_ajuste', pero solo hay {$stock_final} en existencia."]);
                exit;
            }
            $stock_final -= $ajuste_cantidad;
            $tipo_movimiento_log = $ajuste_tipo;
            $cantidad_log = $ajuste_cantidad;
        }

        if ($ajuste_tipo !== 'ninguno') {
            if ($stock_final <= 0) {
                $estado_final = 'No Disponible';
            } else if ($stock_minimo > 0 && $stock_final <= $stock_minimo) {
                $estado_final = 'Bajo';
            } else {
                $estado_final = 'Disponible';
            }
        } else {
            $estado_final = $estado_manual;
            if ($stock_final <= 0) {
                $estado_final = 'No Disponible';
            }
        }

        $stmtUpdate = $pdo->prepare("UPDATE productos SET nombre = ?, tipo_producto = ?, unidad_medida = ?, stock = ?, precio = ?, stock_minimo = ?, estado = ?, descripcion = ?, numero_lote = ?, fecha_produccion = ?, fecha_caducidad = ? WHERE id_producto = ?");
        $stmtUpdate->execute([$nombre, $tipo_producto, $unidad_medida, $stock_final, $precio, $stock_minimo, $estado_final, $descripcion, $numero_lote, $fecha_produccion, $fecha_caducidad, $id_producto]);

        $stmtLog = $pdo->prepare("INSERT INTO movimientos_inventario (id_producto, tipo_movimiento, cantidad, fecha_movimiento, id_usu) VALUES (?, ?, ?, NOW(), ?)");
        $insertado = $stmtLog->execute([$id_producto, $tipo_movimiento_log, $cantidad_log, $id_sesion_activa]);

        if (!$insertado) {
            $error = $stmtLog->errorInfo();
            echo json_encode(['ok' => false, 'msg' => 'Error al guardar bitácora en la BD: ' . $error[2]]);
            exit;
        }

        echo json_encode(['ok' => true, 'msg' => 'Cambios guardados con éxito y bitácora actualizada.']);
        exit;
    }

    // 3.5. VER HISTORIAL
    else if ($accion === 'historial') {
        $stmtHistorial = $pdo->query("
            SELECT m.id_movimiento, p.nombre AS producto, m.tipo_movimiento, m.cantidad, m.fecha_movimiento, u.nombre AS responsable 
            FROM movimientos_inventario m 
            INNER JOIN productos p ON m.id_producto = p.id_producto 
            LEFT JOIN usuarios u ON m.id_usu = u.id_usu
            ORDER BY m.fecha_movimiento DESC 
            LIMIT 100
        ");
        $historial = $stmtHistorial->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['ok' => true, 'historial' => $historial ? $historial : []]);
        exit;
    }

    // 4. ALERTAS ROJAS
    else if ($accion === 'alertas') {
        $stmtAlertas = $pdo->query("SELECT nombre, stock, stock_minimo, unidad_medida FROM productos WHERE stock <= stock_minimo ORDER BY stock ASC");
        $alertas = $stmtAlertas->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['ok' => true, 'alertas' => $alertas ? $alertas : []]);
        exit;
    }

} catch (Throwable $e) {
    echo json_encode(['ok' => false, 'msg' => 'Falla en el servidor: ' . $e->getMessage()]);
}
?>