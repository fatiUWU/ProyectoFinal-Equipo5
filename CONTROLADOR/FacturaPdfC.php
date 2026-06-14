<?php
// CONTROLADOR/FacturaPdfC.php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../CONFIG/db.php';
require_once __DIR__ . '/../LIBS/fpdf.php';

// Verificar seguridad de sesión
if (!isset($_SESSION['id_usuario'])) {
    echo "Acceso denegado. Por favor, inicia sesión.";
    exit;
}

$id_pedido = isset($_GET['id_pedido']) ? intval($_GET['id_pedido']) : 0;

if ($id_pedido <= 0) {
    echo "Folio de pedido inválido.";
    exit;
}

try {
    // 1. CONSULTAR DATOS CORRECTOS DEL CLIENTE Y CABECERA DEL PEDIDO
    $sqlPedido = "SELECT p.*, u.nombre AS nombre_cliente, u.correo AS correo_cliente 
                  FROM pedidos p
                  INNER JOIN usuarios u ON p.id_usu = u.id_usu
                  WHERE p.id_pedido = ?";
    $stmtP = $pdo->prepare($sqlPedido);
    $stmtP->execute([$id_pedido]);
    $pedido = $stmtP->fetch();

    if (!$pedido) {
        echo "El pedido solicitado no existe.";
        exit;
    }

    // Seguridad: Un cliente solo puede autofacturar sus propios pedidos
    if (intval($_SESSION['tipo_usuario']) === 0 && intval($_SESSION['id_usuario']) !== intval($pedido['id_usu'])) {
        echo "No tienes permisos para facturar este pedido.";
        exit;
    }

    // 2. CONSULTAR DETALLES DE PRODUCTOS ADQUIRIDOS
    $sqlDetalles = "SELECT dp.*, pr.nombre AS nombre_producto, pr.unidad_medida 
                    FROM detalles_pedido dp
                    INNER JOIN productos pr ON dp.id_producto = pr.id_producto
                    WHERE dp.id_pedido = ?";
    $stmtD = $pdo->prepare($sqlDetalles);
    $stmtD->execute([$id_pedido]);
    $productos = $stmtD->fetchAll();

    // 3. CONSULTAR DATOS DE LOGÍSTICA (CHOFER Y FECHA)
    $logistica = null;
    try {
        $sqlLogistica = "SELECT r.fecha_salida, u.nombre AS nombre_chofer, v.modelo, v.placas 
                         FROM detalles_ruta dr
                         INNER JOIN rutas r ON r.id_route = dr.id_route
                         INNER JOIN usuarios u ON r.id_chofer = u.id_usu
                         LEFT JOIN vehiculos v ON r.id_vehiculo = v.id_vehiculo
                         WHERE dr.id_pedido = ? LIMIT 1";
        $stmtL = $pdo->prepare($sqlLogistica);
        $stmtL->execute([$id_pedido]);
        $logistica = $stmtL->fetch(PDO::FETCH_ASSOC);
    } catch (Exception $ex) {
        try {
            $sqlLogisticaFallback = "SELECT r.fecha_salida, u.nombre AS nombre_chofer, v.modelo, v.placas 
                                     FROM detalles_ruta dr
                                     INNER JOIN rutas r ON r.id_route = dr.id_ruta
                                     INNER JOIN usuarios u ON r.id_chofer = u.id_usu
                                     LEFT JOIN vehiculos v ON r.id_vehiculo = v.id_vehiculo
                                     WHERE dr.id_pedido = ? LIMIT 1";
            $stmtLF = $pdo->prepare($sqlLogisticaFallback);
            $stmtLF->execute([$id_pedido]);
            $logistica = $stmtLF->fetch(PDO::FETCH_ASSOC);
        } catch (Exception $ex2) {
            $logistica = null;
        }
    }

    // 4. MAQUETACIÓN DEL DOCUMENTO CON FPDF
    $pdf = new FPDF('P', 'mm', 'A4');
    $pdf->AddPage();
    $pdf->SetFont('Arial', '', 10);

    // --- ENCABEZADO / DATOS EMISOR ---
    $pdf->SetFont('Arial', 'B', 16);
    $pdf->SetTextColor(22, 91, 28); // Verde oficial #165b1c
    $pdf->Cell(120, 8, utf8_decode('EcoLogística Veracruz'), 0, 0, 'L');
    
    $pdf->SetFont('Arial', 'B', 12);
    $pdf->SetTextColor(30, 41, 59);
    $pdf->Cell(70, 8, utf8_decode('NOTA DE VENTA / FACTURA'), 0, 1, 'R');
    
    $pdf->SetFont('Arial', '', 9);
    $pdf->SetTextColor(100, 116, 139);
    $pdf->Cell(120, 5, utf8_decode('Distribución de Hortalizas y Productos Sustentables'), 0, 0, 'L');
    $pdf->SetFont('Arial', 'B', 10);
    $pdf->SetTextColor(239, 68, 68); // Rojo folio
    $pdf->Cell(70, 5, utf8_decode('Folio: ECO-FAC-000' . $pedido['id_pedido']), 0, 1, 'R');

    $pdf->SetFont('Arial', '', 9);
    $pdf->SetTextColor(100, 116, 139);
    $pdf->Cell(120, 5, utf8_decode('RFC: EVE260530AAA - Heroica Veracruz, México'), 0, 0, 'L');
    $pdf->SetTextColor(51, 65, 85);
    $pdf->Cell(70, 5, utf8_decode('Fecha Emisión: ' . date('d/m/Y H:i')), 0, 1, 'R');

    $pdf->Ln(8);
    $pdf->SetDrawColor(22, 91, 28);
    $pdf->SetLineWidth(0.6);
    $pdf->Line(10, 36, 200, 36);

    // --- DATOS RECEPTOR (CLIENTE Y DESTINO) ---
    $pdf->SetFont('Arial', 'B', 11);
    $pdf->Cell(0, 6, utf8_decode('Datos del Receptor / Cliente'), 0, 1, 'L');
    $pdf->SetFont('Arial', '', 10);
    $pdf->Cell(100, 5, utf8_decode('Nombre: ' . $pedido['nombre_cliente']), 0, 0, 'L');
    $pdf->Cell(90, 5, utf8_decode('Teléfono: ' . $pedido['telefono_contacto']), 0, 1, 'R');
    $pdf->Cell(0, 5, utf8_decode('Email: ' . $pedido['correo_cliente']), 0, 1, 'L');
    
    $direccionCompleta = $pedido['calle_numero'] . ', Col. ' . $pedido['colonia'] . ', C.P. ' . $pedido['cp'] . ', ' . $pedido['municipio_ciudad'] . ', ' . $pedido['estado_provincia'];
    $pdf->Cell(0, 5, utf8_decode('Destino: ' . $direccionCompleta), 0, 1, 'L');

    $pdf->Ln(6);

    // =========================================================
    // --- NUEVO: LÍNEA DIVISORIA VISUAL ENTRE SECCIONES ---
    // =========================================================
    $currentY = $pdf->GetY();
    $pdf->SetDrawColor(203, 213, 225); // Un gris claro y elegante (#cbd5e1)
    $pdf->SetLineWidth(0.3);
    $pdf->Line(10, $currentY, 200, $currentY);
    $pdf->Ln(4); // Espacio de respiro después de la línea

    // --- SECCIÓN: DATOS DE LOGÍSTICA ---
    $pdf->SetFont('Arial', 'B', 11);
    $pdf->SetTextColor(22, 91, 28);
    $pdf->Cell(0, 6, utf8_decode('Datos de Logística y Entrega'), 0, 1, 'L');
    $pdf->SetFont('Arial', '', 10);
    $pdf->SetTextColor(51, 65, 85);

    if ($logistica) {
        $fecha_entrega = date('d/m/Y', strtotime($logistica['fecha_salida']));
        
        $pdf->Cell(110, 5, utf8_decode('Conductor Asignado: ' . $logistica['nombre_chofer']), 0, 0, 'L');
        $pdf->Cell(80, 5, utf8_decode('Fecha Programada: ' . $fecha_entrega), 0, 1, 'R');
        
        if (!empty($logistica['modelo'])) {
            $pdf->Cell(0, 5, utf8_decode('Unidad de Transporte: ' . $logistica['modelo'] . ' (Placas: ' . $logistica['placas'] . ')'), 0, 1, 'L');
        }
    } else {
        $pdf->SetTextColor(239, 68, 68); // Rojo
        $pdf->Cell(0, 5, utf8_decode('Aviso: Detalles de logística en proceso de asignación.'), 0, 1, 'L');
        $pdf->SetTextColor(51, 65, 85);
    }

    $pdf->Ln(8); // Un poco más de espacio antes de la tabla verde

    // --- TABLA DE CONCEPTOS / PRODUCTOS ---
    $pdf->SetFillColor(22, 91, 28); // Fondo verde
    $pdf->SetTextColor(255, 255, 255); // Texto blanco
    $pdf->SetFont('Arial', 'B', 9);
    
    $pdf->Cell(20, 7, utf8_decode('Cantidad'), 1, 0, 'C', true);
    $pdf->Cell(100, 7, utf8_decode('Descripción del Producto'), 1, 0, 'L', true);
    $pdf->Cell(35, 7, utf8_decode('Precio Unitario'), 1, 0, 'C', true);
    $pdf->Cell(35, 7, utf8_decode('Importe'), 1, 1, 'C', true);

    $pdf->SetTextColor(51, 65, 85);
    $pdf->SetFont('Arial', '', 9);

    foreach ($productos as $prod) {
        $importeItem = floatval($prod['cantidad']) * floatval($prod['precio_unitario']);
        
        $pdf->Cell(20, 7, $prod['cantidad'] . ' ' . $prod['unidad_medida'], 1, 0, 'C');
        $pdf->Cell(100, 7, utf8_decode($p_nom = $prod['nombre_producto']), 1, 0, 'L');
        $pdf->Cell(35, 7, '$' . number_format($prod['precio_unitario'], 2), 1, 0, 'C');
        $pdf->Cell(35, 7, '$' . number_format($importeItem, 2), 1, 1, 'C');
    }

    $pdf->Ln(6);

    // --- DESGLOSE DE TOTALES E IMPUESTOS ---
    $totalNeto = floatval($pedido['total']);
    $costoEnvio = floatval($pedido['envio']);
    $baseImponible = $totalNeto - $costoEnvio;
    $subtotalSinIva = $baseImponible / 1.16;
    $ivaCalculado = $subtotalSinIva * 0.16;

    $pdf->SetFont('Arial', '', 10);
    $pdf->Cell(120, 6, '', 0, 0);
    $pdf->Cell(35, 6, utf8_decode('Subtotal:'), 0, 0, 'R');
    $pdf->SetFont('Arial', 'B', 10);
    $pdf->Cell(35, 6, '$' . number_format($subtotalSinIva, 2), 0, 1, 'C');

    $pdf->SetFont('Arial', '', 10);
    $pdf->Cell(120, 6, '', 0, 0);
    $pdf->Cell(35, 6, utf8_decode('I.V.A. (16%):'), 0, 0, 'R');
    $pdf->SetFont('Arial', 'B', 10);
    $pdf->Cell(35, 6, '$' . number_format($ivaCalculado, 2), 0, 1, 'C');

    $pdf->SetFont('Arial', '', 10);
    $pdf->Cell(120, 6, '', 0, 0);
    $pdf->Cell(35, 6, utf8_decode('Costo de Envío:'), 0, 0, 'R');
    $pdf->SetFont('Arial', 'B', 10);
    $pdf->Cell(35, 6, '$' . number_format($costoEnvio, 2), 0, 1, 'C');

    $pdf->SetFont('Arial', 'B', 11);
    $pdf->SetTextColor(22, 91, 28);
    $pdf->Cell(120, 7, utf8_decode('Estatus del Pago: LIQUIDADO CONTRA ENTREGA'), 0, 0, 'L');
    $pdf->SetTextColor(30, 41, 59);
    $pdf->Cell(35, 7, utf8_decode('Total General:'), 0, 0, 'R');
    $pdf->SetFillColor(241, 245, 249);
    $pdf->Cell(35, 7, '$' . number_format($totalNeto, 2), 1, 1, 'C', true);

    $pdf->Ln(15);
    $pdf->SetFont('Arial', 'I', 8);
    $pdf->SetTextColor(148, 163, 184);
    $pdf->Cell(0, 5, utf8_decode('Este documento es una representación impresa simplificada de una nota de venta digital.'), 0, 1, 'C');
    $pdf->Cell(0, 5, utf8_decode('Gracias por apoyar el comercio local y sostenible de Veracruz.'), 0, 1, 'C');

    // 'I' envía el archivo directo al navegador
    $pdf->Output('I', 'Factura_ECO_' . $pedido['id_pedido'] . '.pdf');

} catch (Exception $e) {
    echo "Error crítico al compilar la factura electrónica: " . $e->getMessage();
}
?>