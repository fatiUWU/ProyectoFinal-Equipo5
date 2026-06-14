<?php
// CONTROLADOR/ReportesC.php
require_once __DIR__ . '/../CONFIG/db.php';

header('Content-Type: application/json');

try {
    // 1. MÉTRICA: Ventas Totales (Suma el total de pedidos que no estén cancelados)
    $stmtVentas = $pdo->query("SELECT SUM(total) AS total_ventas FROM pedidos WHERE estado != 'Cancelado'");
    $ventasTotales = $stmtVentas->fetch()['total_ventas'] ?? 0.00;

    // 2. MÉTRICA: Pedidos Realizados (Conteo total de órdenes en el sistema)
    $stmtPedidos = $pdo->query("SELECT COUNT(*) AS total_pedidos FROM pedidos");
    $pedidosRealizados = $stmtPedidos->fetch()['total_pedidos'] ?? 0;

    // 3. CORREGIDO: Clientes Registrados (Ahora contamos de forma estricta a los tipo = 0)
    $stmtClientes = $pdo->query("SELECT COUNT(*) AS total_clientes FROM usuarios WHERE tipo = 0");
    $clientesTotales = $stmtClientes->fetch()['total_clientes'] ?? 0;

    // 4. TABLA: Top 5 Productos Más Vendidos
    $sqlTop = "SELECT pr.id_producto, pr.nombre, pr.tipo_producto, pr.unidad_medida, pr.precio, SUM(dp.cantidad) AS total_vendido
               FROM detalles_pedido dp
               INNER JOIN productos pr ON dp.id_producto = pr.id_producto
               GROUP BY dp.id_producto
               ORDER BY total_vendido DESC 
               LIMIT 5";
    $stmtTop = $pdo->query($sqlTop);
    $topProductos = $stmtTop->fetchAll();

    // Enviar los datos calculados de forma estructurada
    echo json_encode([
        'ok' => true,
        'metricas' => [
            'ventas_totales'     => number_format($ventasTotales, 2, '.', ''),
            'pedidos_realizados' => $pedidosRealizados,
            'clientes_totales'   => $clientesTotales
        ],
        'top_productos' => $topProductos
    ]);

} catch (Exception $e) {
    echo json_encode([
        'ok' => false,
        'msg' => 'Error al compilar las métricas de reportes: ' . $e->getMessage()
    ]);
}
?>