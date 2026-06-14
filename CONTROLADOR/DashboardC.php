<?php
// CONTROLADOR/DashboardC.php
require_once __DIR__ . '/../CONFIG/db.php';

header('Content-Type: application/json');

try {
    // 1. INDICADOR: Pedidos Pendientes (Cuenta órdenes con estado 'Pendiente')
    $stmtPendientes = $pdo->query("SELECT COUNT(*) AS total FROM pedidos WHERE estado = 'Pendiente'");
    $pedidosPendientes = $stmtPendientes->fetch()['total'];

    // 2. INDICADOR: Entregas Hoy (Cuenta órdenes con estado 'Entregado' en la fecha actual)
    $stmtEntregasHoy = $pdo->query("SELECT COUNT(*) AS total FROM pedidos WHERE estado = 'Entregado' AND DATE(fecha_creacion) = CURRENT_DATE()");
    $entregasHoy = $stmtEntregasHoy->fetch()['total'];

    // 3. INDICADOR: Productos en Stock (Suma total de kg/litros disponibles en almacén)
    $stmtTotalStock = $pdo->query("SELECT SUM(stock) AS total FROM productos");
    $productosEnStock = $stmtTotalStock->fetch()['total'] ?? 0;

    // 4. INDICADOR: Alertas Stock Bajo (Cuenta productos cuyo stock es menor o igual al mínimo)
    $stmtAlertas = $pdo->query("SELECT COUNT(*) AS total FROM productos WHERE stock <= stock_minimo");
    $alertasStock = $stmtAlertas->fetch()['total'];

    // 5. TABLA: Pedidos Recientes (Trae los últimos 4 pedidos con el nombre de su cliente)
    $sqlRecientes = "SELECT p.id_pedido, u.nombre AS nombre_cliente, p.fecha_creacion, p.estado, p.total 
                     FROM pedidos p
                     INNER JOIN usuarios u ON p.id_usu = u.id_usu 
                     ORDER BY p.id_pedido DESC 
                     LIMIT 4";
    $stmtRecientes = $pdo->query($sqlRecientes);
    $pedidosRecientes = $stmtRecientes->fetchAll();

    // Enviar todas las estadísticas calculadas en un JSON limpio
    echo json_encode([
        'ok' => true,
        'kpis' => [
            'pedidos_pendientes' => $pedidosPendientes,
            'entregas_hoy'       => $entregasHoy,
            'productos_stock'    => $productosEnStock,
            'alertas_stock'      => $alertasStock
        ],
        'pedidos_recientes' => $pedidosRecientes
    ]);

} catch (Exception $e) {
    echo json_encode([
        'ok' => false,
        'msg' => 'Error al cargar las métricas del Dashboard: ' . $e->getMessage()
    ]);
}
?>