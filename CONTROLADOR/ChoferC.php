<?php
// CONTROLADOR/ChoferC.php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../CONFIG/db.php';

header('Content-Type: application/json');

// --- SOLUCIÓN DE SESIÓN: Usamos las mismas variables que en InventarioC ---
$id_chofer_real = null;
if (isset($_SESSION['id_usu'])) {
    $id_chofer_real = intval($_SESSION['id_usu']);
} else if (isset($_SESSION['id_usuario'])) {
    $id_chofer_real = intval($_SESSION['id_usuario']);
}

// Si no se encuentra el ID, bloqueamos el acceso
if (!$id_chofer_real) {
    echo json_encode(['ok' => false, 'msg' => 'Acceso denegado o sesión de chofer inválida.']);
    exit;
}

$accion = isset($_GET['accion']) ? $_GET['accion'] : '';

try {
    // ACCIÓN A: CARGAR LA RUTA DE ENTREGAS DEL CHOFER Y RUTAS FUTURAS
    if ($accion === 'cargar_ruta') {
        
        // --------------------------------------------------------
        // 1. OBTENER PRÓXIMAS JORNADAS DEL CHOFER
        // --------------------------------------------------------
        $stmtFuturos = $pdo->prepare("
            SELECT r.fecha_salida AS fecha_entrega, COUNT(dr.id_pedido) as total_pedidos 
            FROM rutas r
            LEFT JOIN detalles_ruta dr ON r.id_route = dr.id_route
            WHERE r.id_chofer = ? AND r.fecha_salida > CURDATE() AND r.estatus_ruta != 'Finalizada'
            GROUP BY r.fecha_salida 
            ORDER BY r.fecha_salida ASC 
            LIMIT 5
        ");
        $stmtFuturos->execute([$id_chofer_real]); 
        $entregas_futuras = $stmtFuturos->fetchAll(PDO::FETCH_ASSOC);

        // --------------------------------------------------------
        // 2. OBTENER RUTA DE HOY
        // --------------------------------------------------------
        $sqlRuta = "SELECT r.id_route, r.fecha_salida, v.modelo, v.placas 
                    FROM rutas r
                    INNER JOIN vehiculos v ON r.id_vehiculo = v.id_vehiculo
                    WHERE r.id_chofer = ? AND r.estatus_ruta != 'Finalizada'
                    ORDER BY r.id_route DESC LIMIT 1";
        
        $stmtR = $pdo->prepare($sqlRuta);
        $stmtR->execute([$id_chofer_real]);
        $ruta = $stmtR->fetch();

        // Si el chofer no tiene ruta para hoy, devolvemos las futuras de todas formas
        if (!$ruta) {
            echo json_encode(['ok' => true, 'tiene_ruta' => false, 'futuras' => $entregas_futuras]);
            exit;
        }

        // --------------------------------------------------------
        // 3. OBTENER LOS PEDIDOS DE LA RUTA DE HOY
        // --------------------------------------------------------
        $sqlPedidos = "SELECT p.id_pedido, u.nombre AS nombre_cliente, p.estado, 
                              p.calle_numero, p.colonia, p.municipio_ciudad, p.telefono_contacto, p.total
                       FROM detalles_ruta dr
                       INNER JOIN pedidos p ON dr.id_pedido = p.id_pedido
                       INNER JOIN usuarios u ON p.id_usu = u.id_usu
                       WHERE dr.id_route = ? AND p.estado IN ('En Preparacion', 'Enviado')
                       ORDER BY p.id_pedido ASC";
        
        $stmtP = $pdo->prepare($sqlPedidos);
        $stmtP->execute([$ruta['id_route']]);
        $pedidos = $stmtP->fetchAll();

        echo json_encode([
            'ok' => true,
            'tiene_ruta' => true,
            'fecha' => $ruta['fecha_salida'],
            'vehiculo' => $ruta['modelo'] . " [" . $ruta['placas'] . "]",
            'pedidos' => $pedidos,
            'futuras' => $entregas_futuras
        ]);
    }

    // ACCIÓN B: ACTUALIZAR EL ESTADO LOGÍSTICO DE UN PEDIDO
    else if ($accion === 'actualizar_estado_pedido') {
        $json = file_get_contents('php://input');
        $data = json_decode($json, true);

        $id_pedido = intval($data['id_pedido']);
        $nuevo_estado = trim($data['nuevo_estado']);

        if ($id_pedido <= 0 || !in_array($nuevo_estado, ['Enviado', 'Entregado'])) {
            echo json_encode(['ok' => false, 'msg' => 'Parámetros de actualización inválidos.']);
            exit;
        }

        $stmtUpdate = $pdo->prepare("UPDATE pedidos SET estado = ? WHERE id_pedido = ?");
        $stmtUpdate->execute([$nuevo_estado, $id_pedido]);

        echo json_encode(['ok' => true, 'msg' => '¡Estatus del envío actualizado a ' . $nuevo_estado . '!']);
    }

} catch (Exception $e) {
    echo json_encode(['ok' => false, 'msg' => 'Error SQL: ' . $e->getMessage()]);
}
?>