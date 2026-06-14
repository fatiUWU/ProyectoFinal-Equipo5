<?php
// CONTROLADOR/FacturacionC.php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../CONFIG/db.php';
header('Content-Type: application/json');

// Protección simple de seguridad (Revisar que alguien esté logueado)
if (!isset($_SESSION['id_usuario']) && !isset($_SESSION['id_usu'])) {
    echo json_encode(['ok' => false, 'msg' => 'Acceso denegado.']);
    exit;
}

try {
    // Consultamos los pedidos omitiendo los "Pendientes" (No tienen asignado chofer/factura) y los "Cancelados"
    // Unimos con la tabla de usuarios para traernos el nombre del cliente
    $sql = "SELECT 
                p.id_pedido, 
                p.fecha_creacion, 
                p.total, 
                p.estado, 
                u.nombre AS nombre_cliente 
            FROM pedidos p 
            INNER JOIN usuarios u ON p.id_usu = u.id_usu 
            WHERE p.estado NOT IN ('Pendiente', 'Cancelado') 
            ORDER BY p.id_pedido DESC";

    $stmt = $pdo->query($sql);
    $facturas = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'ok' => true, 
        'facturas' => $facturas
    ]);

} catch (Exception $e) {
    echo json_encode(['ok' => false, 'msg' => 'Error al leer la base de datos de facturación: ' . $e->getMessage()]);
}
?>