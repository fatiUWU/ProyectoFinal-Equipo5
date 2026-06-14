<?php
// CONTROLADOR/ReporteMensualPdfC.php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../CONFIG/db.php';
require_once __DIR__ . '/../LIBS/fpdf.php';

// Validar que un administrador esté solicitando el reporte
if (!isset($_SESSION['id_usuario']) && !isset($_SESSION['id_usu'])) {
    echo "Acceso denegado. Por favor, inicia sesión.";
    exit;
}

$fecha_inicio = isset($_GET['inicio']) ? $_GET['inicio'] : '';
$fecha_fin = isset($_GET['fin']) ? $_GET['fin'] : '';

if (empty($fecha_inicio) || empty($fecha_fin)) {
    echo "Fechas no válidas.";
    exit;
}

try {
    // 1. CONSULTA SQL PODEROSA: Extrae el mes, el producto y suma las cantidades de pedidos confirmados
    $sql = "SELECT 
                DATE_FORMAT(p.fecha_creacion, '%Y-%m') AS mes_anio,
                pr.nombre AS producto,
                pr.tipo_producto AS categoria,
                SUM(dp.cantidad) AS total_vendido,
                pr.unidad_medida
            FROM pedidos p
            INNER JOIN detalles_pedido dp ON p.id_pedido = dp.id_pedido
            INNER JOIN productos pr ON dp.id_producto = pr.id_producto
            WHERE p.estado != 'Cancelado' 
              AND DATE(p.fecha_creacion) BETWEEN ? AND ?
            GROUP BY mes_anio, pr.id_producto
            ORDER BY mes_anio ASC, total_vendido DESC";
            
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$fecha_inicio, $fecha_fin]);
    $resultados = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 2. INICIAR PDF
    $pdf = new FPDF('P', 'mm', 'A4');
    $pdf->AddPage();
    
    // --- CABECERA DEL REPORTE ---
    $pdf->SetFont('Arial', 'B', 16);
    $pdf->SetTextColor(22, 91, 28);
    $pdf->Cell(0, 8, utf8_decode('EcoLogística Veracruz'), 0, 1, 'C');
    
    $pdf->SetFont('Arial', 'B', 12);
    $pdf->SetTextColor(30, 41, 59);
    $pdf->Cell(0, 6, utf8_decode('Reporte de Ventas por Producto'), 0, 1, 'C');
    
    $pdf->SetFont('Arial', '', 10);
    $pdf->SetTextColor(100, 116, 139);
    // Formatear fechas para que se vean bien
    $f_ini_f = date("d/m/Y", strtotime($fecha_inicio));
    $f_fin_f = date("d/m/Y", strtotime($fecha_fin));
    $pdf->Cell(0, 6, utf8_decode("Periodo analizado: $f_ini_f  al  $f_fin_f"), 0, 1, 'C');
    $pdf->Ln(5);

    if (count($resultados) === 0) {
        $pdf->SetFont('Arial', 'I', 12);
        $pdf->SetTextColor(239, 68, 68);
        $pdf->Cell(0, 10, utf8_decode('No se encontraron ventas confirmadas en este rango de fechas.'), 0, 1, 'C');
        $pdf->Output('I', 'Reporte_Mensual.pdf');
        exit;
    }

    // Array para traducir los meses al español
    $nombresMeses = ['01'=>'Enero', '02'=>'Febrero', '03'=>'Marzo', '04'=>'Abril', '05'=>'Mayo', '06'=>'Junio', '07'=>'Julio', '08'=>'Agosto', '09'=>'Septiembre', '10'=>'Octubre', '11'=>'Noviembre', '12'=>'Diciembre'];

    // 3. LOGICA PARA DIBUJAR TABLAS DIVIDIDAS POR MES
    $mes_actual = '';

    foreach ($resultados as $row) {
        // Si el mes cambia en el ciclo, dibujamos un nuevo título y cabecera de tabla
        if ($row['mes_anio'] !== $mes_actual) {
            $mes_actual = $row['mes_anio'];
            list($anio, $mesNum) = explode('-', $mes_actual);
            $nombreMesFormal = $nombresMeses[$mesNum] . ' ' . $anio;

            $pdf->Ln(5);
            // Título del Mes
            $pdf->SetFont('Arial', 'B', 12);
            $pdf->SetTextColor(255, 255, 255);
            $pdf->SetFillColor(30, 64, 175); // Azul corporativo para los meses
            $pdf->Cell(0, 8, utf8_decode(' Mes de Ventas: ' . $nombreMesFormal), 0, 1, 'L', true);

            // Cabeceras de la tabla
            $pdf->SetFillColor(241, 245, 249); // Gris clarito
            $pdf->SetTextColor(51, 65, 85);
            $pdf->SetFont('Arial', 'B', 10);
            $pdf->Cell(95, 8, utf8_decode('Producto'), 1, 0, 'C', true);
            $pdf->Cell(50, 8, utf8_decode('Categoría'), 1, 0, 'C', true);
            $pdf->Cell(45, 8, utf8_decode('Cantidad Total'), 1, 1, 'C', true);
        }

        // Imprimir cada producto
        $pdf->SetFont('Arial', '', 10);
        $pdf->SetTextColor(30, 41, 59);
        
        $pdf->Cell(95, 7, utf8_decode($row['producto']), 1, 0, 'L');
        $pdf->Cell(50, 7, utf8_decode($row['categoria']), 1, 0, 'C');
        
        // Ponemos el número en negritas para que destaque
        $pdf->SetFont('Arial', 'B', 10);
        $pdf->Cell(45, 7, $row['total_vendido'] . ' ' . $row['unidad_medida'], 1, 1, 'C');
    }

    $pdf->Ln(10);
    $pdf->SetFont('Arial', 'I', 8);
    $pdf->SetTextColor(148, 163, 184);
    $pdf->Cell(0, 5, utf8_decode('Reporte generado automáticamente por EcoLogística Veracruz el ' . date('d/m/Y H:i')), 0, 1, 'C');

    $pdf->Output('I', 'Reporte_Ventas_' . $f_ini_f . '_al_' . $f_fin_f . '.pdf');

} catch (Exception $e) {
    echo "Error al generar el reporte: " . $e->getMessage();
}
?>