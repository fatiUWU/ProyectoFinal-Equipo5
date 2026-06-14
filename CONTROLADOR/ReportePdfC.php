<?php
// CONTROLADOR/ReportePdfC.php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../CONFIG/db.php';
require_once __DIR__ . '/../LIBS/fpdf.php';

class PDF extends FPDF {
    function Header() {
        $this->SetFont('Arial', 'B', 18);
        $this->SetTextColor(22, 91, 28); // #165b1c
        $this->Cell(0, 10, utf8_decode('EcoLogística Veracruz'), 0, 1, 'L');
        
        $this->SetFont('Arial', '', 10);
        $this->SetTextColor(100, 116, 139);
        $this->Cell(0, 5, utf8_decode('Reporte Ejecutivo de Ventas y Rendimiento Almacén'), 0, 1, 'L');
        
        $this->SetFont('Arial', 'I', 9);
        $this->Cell(0, 5, utf8_decode('Fecha de emisión: ' . date('d/m/Y H:i')), 0, 1, 'R');
        
        $this->SetDrawColor(22, 91, 28);
        $this->SetLineWidth(0.8);
        $this->Line(10, 32, 200, 32);
        $this->Ln(10);
    }

    function Footer() {
        $this->SetY(-15);
        $this->SetFont('Arial', 'I', 8);
        $this->SetTextColor(148, 163, 184);
        $this->Cell(0, 10, utf8_decode('Página ') . $this->PageNo() . '/{nb} - EcoLogística Veracruz © 2026', 0, 0, 'C');
    }
}

try {
    // Tarjeta A: Ventas Totales
    $stmtVentas = $pdo->query("SELECT SUM(total) AS total_ventas FROM pedidos WHERE estado != 'Cancelado'");
    $ventasTotales = $stmtVentas->fetch()['total_ventas'] ?? 0.00;

    // Tarjeta B: Pedidos Realizados
    $stmtPedidos = $pdo->query("SELECT COUNT(*) AS total_pedidos FROM pedidos");
    $pedidosRealizados = $stmtPedidos->fetch()['total_pedidos'] ?? 0;

    // Tarjeta C: CORREGIDO - Clientes Nuevos (Contamos tipo = 0 de forma exacta)
    $stmtClientes = $pdo->query("SELECT COUNT(*) AS total_clientes FROM usuarios WHERE tipo = 0");
    $clientesNuesvos = $stmtClientes->fetch()['total_clientes'] ?? 0;

    // Listado D: Productos más vendidos
    $sqlTop = "SELECT pr.nombre, pr.tipo_producto, pr.unidad_medida, SUM(dp.cantidad) AS total_vendido
               FROM detalles_pedido dp
               INNER JOIN productos pr ON dp.id_producto = pr.id_producto
               GROUP BY dp.id_producto
               ORDER BY total_vendido DESC 
               LIMIT 5";
    $topProductos = $pdo->query($sqlTop)->fetchAll();

    // Generar PDF
    $pdf = new PDF();
    $pdf->AliasNbPages();
    $pdf->AddPage();
    $pdf->SetFont('Arial', '', 11);

    // --- BLOQUE 1: INDICADORES CLAVE (KPIS) ---
    $pdf->SetFont('Arial', 'B', 13);
    $pdf->SetTextColor(30, 41, 59);
    $pdf->Cell(0, 10, utf8_decode('1. Resumen Estadístico del Mes'), 0, 1, 'L');
    $pdf->Ln(2);

    $pdf->SetFont('Arial', '', 11);
    $pdf->Cell(60, 8, utf8_decode('Ventas Consolidadas:'), 0, 0);
    $pdf->SetFont('Arial', 'B', 11);
    $pdf->Cell(40, 8, '$' . number_format($ventasTotales, 2), 0, 1);

    $pdf->SetFont('Arial', '', 11);
    $pdf->Cell(60, 8, utf8_decode('Órdenes de Compra Procesadas:'), 0, 0);
    $pdf->SetFont('Arial', 'B', 11);
    $pdf->Cell(40, 8, $pedidosRealizados . ' pedidos', 0, 1);

    $pdf->SetFont('Arial', '', 11);
    $pdf->Cell(60, 8, utf8_decode('Clientes Registrados:'), 0, 0);
    $pdf->SetFont('Arial', 'B', 11);
    $pdf->Cell(40, 8, $clientesNuesvos . ' usuarios', 0, 1);
    
    $pdf->Ln(10);

    // --- BLOQUE 2: TABLA ---
    $pdf->SetFont('Arial', 'B', 13);
    $pdf->Cell(0, 10, utf8_decode('2. Top de Productos con Mayor Demanda en Almacén'), 0, 1, 'L');
    $pdf->Ln(3);

    $pdf->SetFillColor(22, 91, 28);
    $pdf->SetTextColor(255, 255, 255);
    $pdf->SetFont('Arial', 'B', 10);
    
    $pdf->Cell(15, 8, utf8_decode('# Pos'), 1, 0, 'C', true);
    $pdf->Cell(85, 8, utf8_decode('Nombre del Producto'), 1, 0, 'L', true);
    $pdf->Cell(45, 8, utf8_decode('Categoría'), 1, 0, 'C', true);
    $pdf->Cell(45, 8, utf8_decode('Volumen Total Vendido'), 1, 1, 'C', true);

    $pdf->SetTextColor(51, 65, 85);
    $pdf->SetFont('Arial', '', 10);
    
    $posicion = 1;
    if (empty($topProductos)) {
        $pdf->Cell(190, 8, utf8_decode('No se registran ventas acumuladas en los detalles.'), 1, 1, 'C');
    } else {
        foreach ($topProductos as $prod) {
            $pdf->Cell(15, 8, $posicion, 1, 0, 'C');
            $pdf->Cell(85, 8, utf8_decode($prod['nombre']), 1, 0, 'L');
            $pdf->Cell(45, 8, utf8_decode($prod['tipo_producto']), 1, 0, 'C');
            $pdf->Cell(45, 8, $prod['total_vendido'] . ' ' . $prod['unidad_medida'], 1, 1, 'C');
            $posicion++;
        }
    }

    $pdf->Output('I', 'Reporte_Ventas_EcoLogistica.pdf');

} catch (Exception $e) {
    echo "Error crítico al compilar el reporte PDF: " . $e->getMessage();
}
?>