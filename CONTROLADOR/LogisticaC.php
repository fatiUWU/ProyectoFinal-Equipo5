<?php
// CONTROLADOR/LogisticaC.php
require_once __DIR__ . '/../CONFIG/db.php';
require_once __DIR__ . '/../MODELO/LogisticaM.php';

header('Content-Type: application/json; charset=utf-8');

function responder($array) {
    echo json_encode($array, JSON_UNESCAPED_UNICODE);
    exit;
}

function tablaExiste($pdo, $tabla) {
    $sql = "SELECT COUNT(*) 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = ?";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([$tabla]);

    return $stmt->fetchColumn() > 0;
}

function obtenerColumnas($pdo, $tabla) {
    $sql = "SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = ?";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([$tabla]);

    return $stmt->fetchAll(PDO::FETCH_COLUMN);
}

function columnaExiste($pdo, $tabla, $columna) {
    $columnas = obtenerColumnas($pdo, $tabla);
    return in_array($columna, $columnas);
}

function primeraColumnaDisponible($columnas, $posiblesColumnas) {
    foreach ($posiblesColumnas as $columna) {
        if (in_array($columna, $columnas)) {
            return $columna;
        }
    }

    return null;
}

function exprColumna($alias, $columnas, $posiblesColumnas, $valorDefault = "''") {
    $columna = primeraColumnaDisponible($columnas, $posiblesColumnas);

    if ($columna) {
        return $alias . ".`" . $columna . "`";
    }

    return $valorDefault;
}

function exprNombrePersona($alias, $columnas, $valorDefault = "'Sin nombre'") {
    if (
        in_array('nombre', $columnas) &&
        in_array('apellido_paterno', $columnas) &&
        in_array('apellido_materno', $columnas)
    ) {
        return "TRIM(CONCAT_WS(' ', $alias.`nombre`, $alias.`apellido_paterno`, $alias.`apellido_materno`))";
    }

    if (
        in_array('nombre', $columnas) &&
        in_array('apellidos', $columnas)
    ) {
        return "TRIM(CONCAT_WS(' ', $alias.`nombre`, $alias.`apellidos`))";
    }

    if (in_array('nombre', $columnas)) {
        return "$alias.`nombre`";
    }

    if (in_array('nombre_completo', $columnas)) {
        return "$alias.`nombre_completo`";
    }

    if (in_array('nombre_cliente', $columnas)) {
        return "$alias.`nombre_cliente`";
    }

    if (in_array('cliente', $columnas)) {
        return "$alias.`cliente`";
    }

    return $valorDefault;
}

function listarPedidosEnTransito($pdo) {
    if (!tablaExiste($pdo, 'pedidos')) {
        throw new Exception('No existe la tabla pedidos.');
    }

    if (!tablaExiste($pdo, 'rutas')) {
        throw new Exception('No existe la tabla rutas.');
    }

    if (!tablaExiste($pdo, 'detalles_ruta')) {
        throw new Exception('No existe la tabla detalles_ruta.');
    }

    if (!tablaExiste($pdo, 'usuarios')) {
        throw new Exception('No existe la tabla usuarios.');
    }

    if (!tablaExiste($pdo, 'vehiculos')) {
        throw new Exception('No existe la tabla vehiculos.');
    }

    $colsPedidos = obtenerColumnas($pdo, 'pedidos');
    $colsRutas = obtenerColumnas($pdo, 'rutas');
    $colsDetalles = obtenerColumnas($pdo, 'detalles_ruta');
    $colsUsuarios = obtenerColumnas($pdo, 'usuarios');
    $colsVehiculos = obtenerColumnas($pdo, 'vehiculos');

    $pkPedido = primeraColumnaDisponible($colsPedidos, ['id_pedido']);

    if (!$pkPedido) {
        throw new Exception('No se encontró la columna id_pedido en la tabla pedidos.');
    }

    $pkRuta = primeraColumnaDisponible($colsRutas, ['id_route', 'id_ruta', 'id']);

    if (!$pkRuta) {
        throw new Exception('No se encontró la llave principal de la tabla rutas. Revisa si se llama id_route.');
    }

    $detalleRuta = primeraColumnaDisponible($colsDetalles, ['id_route', 'id_ruta']);

    if (!$detalleRuta) {
        throw new Exception('No se encontró la columna id_route en detalles_ruta.');
    }

    $detallePedido = primeraColumnaDisponible($colsDetalles, ['id_pedido']);

    if (!$detallePedido) {
        throw new Exception('No se encontró la columna id_pedido en detalles_ruta.');
    }

    $pkUsuario = primeraColumnaDisponible($colsUsuarios, ['id_usu', 'id_usuario', 'id_user', 'id']);

    if (!$pkUsuario) {
        throw new Exception('No se encontró la llave principal de la tabla usuarios.');
    }

    $pkVehiculo = primeraColumnaDisponible($colsVehiculos, ['id_vehiculo']);

    if (!$pkVehiculo) {
        throw new Exception('No se encontró la columna id_vehiculo en la tabla vehiculos.');
    }

    $nombreChoferExpr = exprNombrePersona('u', $colsUsuarios, "'Conductor no encontrado'");

    $modeloVehiculoExpr = exprColumna('v', $colsVehiculos, ['modelo', 'nombre', 'descripcion', 'tipo'], "'Vehículo'");
    $placasVehiculoExpr = exprColumna('v', $colsVehiculos, ['placas', 'placa', 'matricula'], "'Sin placas'");

    $calleExpr = exprColumna('p', $colsPedidos, ['calle_numero', 'calle', 'direccion', 'domicilio'], "''");
    $coloniaExpr = exprColumna('p', $colsPedidos, ['colonia'], "''");
    $municipioExpr = exprColumna('p', $colsPedidos, ['municipio_ciudad', 'municipio', 'ciudad'], "''");

    $direccionExpr = "
        TRIM(CONCAT_WS(', ',
            NULLIF($calleExpr, ''),
            NULLIF(CONCAT('Col. ', $coloniaExpr), 'Col. '),
            NULLIF($municipioExpr, '')
        ))
    ";

    $municipioCiudadExpr = $municipioExpr;

    $joinCliente = "";
    $nombreClienteExpr = null;

    if (
        in_array('nombre_cliente', $colsPedidos) ||
        in_array('cliente', $colsPedidos) ||
        in_array('nombre_completo', $colsPedidos)
    ) {
        $nombreClienteExpr = exprNombrePersona('p', $colsPedidos, "'Cliente no registrado'");
    }

    if (!$nombreClienteExpr) {
        $fkUsuarioPedido = primeraColumnaDisponible($colsPedidos, [
            'id_usu',
            'id_cliente',
            'id_usuario',
            'id_cliente_usuario'
        ]);

        if ($fkUsuarioPedido) {
            $joinCliente = "LEFT JOIN usuarios uc ON p.`$fkUsuarioPedido` = uc.`$pkUsuario`";
            $nombreClienteExpr = exprNombrePersona('uc', $colsUsuarios, "'Cliente no registrado'");
        } else {
            $nombreClienteExpr = "'Cliente no registrado'";
        }
    }

    /*
        IMPORTANTE:
        Aquí se toma el estado REAL desde la tabla pedidos.
        En tu base de datos la columna se llama: estado
        Por eso primero buscamos p.estado.
    */
    $estadoPedidoCol = primeraColumnaDisponible($colsPedidos, [
        'estado',
        'estado_pedido',
        'estatus_pedido',
        'estatus',
        'status'
    ]);

    if ($estadoPedidoCol) {
        $estadoExpr = "
            CASE
                WHEN p.`$estadoPedidoCol` IS NULL OR p.`$estadoPedidoCol` = '' 
                THEN 'En Preparacion'
                ELSE p.`$estadoPedidoCol`
            END
        ";
    } else if (in_array('estatus_ruta', $colsRutas)) {
        $estadoExpr = "
            CASE
                WHEN r.`estatus_ruta` IS NULL OR r.`estatus_ruta` = ''
                THEN 'En Preparacion'
                ELSE r.`estatus_ruta`
            END
        ";
    } else {
        $estadoExpr = "'En Preparacion'";
    }

    $fechaSalidaExpr = in_array('fecha_salida', $colsRutas) ? "r.`fecha_salida`" : "NULL";
    $horaSalidaExpr = in_array('hora_salida', $colsRutas) ? "r.`hora_salida`" : "NULL";

    $sql = "
        SELECT
            p.`$pkPedido` AS id_pedido,
            CONCAT('PED-', LPAD(p.`$pkPedido`, 5, '0')) AS folio_pedido,

            $nombreClienteExpr AS nombre_cliente,

            $direccionExpr AS direccion_completa,
            $municipioCiudadExpr AS municipio_ciudad,

            $nombreChoferExpr AS nombre_chofer,

            $modeloVehiculoExpr AS modelo_vehiculo,
            $placasVehiculoExpr AS placas,

            $fechaSalidaExpr AS fecha_salida,
            $horaSalidaExpr AS hora_salida,

            $estadoExpr AS estado_actual

        FROM detalles_ruta dr
        INNER JOIN pedidos p ON dr.`$detallePedido` = p.`$pkPedido`
        INNER JOIN rutas r ON dr.`$detalleRuta` = r.`$pkRuta`
        INNER JOIN usuarios u ON r.`id_chofer` = u.`$pkUsuario`
        INNER JOIN vehiculos v ON r.`id_vehiculo` = v.`$pkVehiculo`
        $joinCliente

        ORDER BY r.`$pkRuta` DESC, p.`$pkPedido` DESC
    ";

    $stmt = $pdo->query($sql);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

$json = file_get_contents('php://input');
$data = json_decode($json, true);
$data = is_array($data) ? $data : [];

$accion = isset($_GET['accion']) ? $_GET['accion'] : '';

$logModel = new LogisticaM($pdo);

try {
    if ($accion === 'cargar_catalogos') {
        if (columnaExiste($pdo, 'vehiculos', 'estado')) {
            $stmtV = $pdo->query("SELECT * FROM vehiculos WHERE estado = 'activo' ORDER BY id_vehiculo DESC");
        } else {
            $stmtV = $pdo->query("SELECT * FROM vehiculos ORDER BY id_vehiculo DESC");
        }

        $vehiculosActivos = $stmtV->fetchAll(PDO::FETCH_ASSOC);

        responder([
            'ok' => true,
            'pedidos' => $logModel->listarPedidosPendientes(),
            'choferes' => $logModel->listarChoferes(),
            'vehiculos' => $vehiculosActivos
        ]);
    }

    else if ($accion === 'listar_en_transito') {
        responder([
            'ok' => true,
            'pedidos' => listarPedidosEnTransito($pdo)
        ]);
    }

    else if ($accion === 'asignar') {
        $id_chofer = intval($data['id_chofer'] ?? 0);
        $id_vehiculo = intval($data['id_vehiculo'] ?? 0);
        $fecha_salida = $data['fecha_salida'] ?? '';
        $hora_salida = date('H:i:s');

        $pedidos = isset($data['pedidos']) && is_array($data['pedidos'])
            ? array_map('intval', $data['pedidos'])
            : [];

        $pedidos = array_values(array_filter($pedidos, function($id) {
            return $id > 0;
        }));

        if ($id_chofer <= 0 || $id_vehiculo <= 0 || empty($fecha_salida) || empty($pedidos)) {
            responder([
                'ok' => false,
                'msg' => 'Por favor, selecciona conductor, vehículo y al menos un pedido haciendo clic sobre él.'
            ]);
        }

        $sqlValidacionVehiculo = "SELECT COUNT(*) FROM rutas WHERE id_vehiculo = ? AND fecha_salida = ?";
        $stmtValidacionV = $pdo->prepare($sqlValidacionVehiculo);
        $stmtValidacionV->execute([$id_vehiculo, $fecha_salida]);
        $vehiculoOcupado = $stmtValidacionV->fetchColumn();

        if ($vehiculoOcupado > 0) {
            responder([
                'ok' => false,
                'msg' => '⚠️ Operación denegada: El vehículo seleccionado ya tiene una ruta asignada para esa fecha. Por favor, selecciona otra unidad.'
            ]);
        }

        $sqlValidacionChofer = "SELECT COUNT(*) FROM rutas WHERE id_chofer = ? AND fecha_salida = ?";
        $stmtValidacionC = $pdo->prepare($sqlValidacionChofer);
        $stmtValidacionC->execute([$id_chofer, $fecha_salida]);
        $choferOcupado = $stmtValidacionC->fetchColumn();

        if ($choferOcupado > 0) {
            responder([
                'ok' => false,
                'msg' => '⚠️ Operación denegada: El conductor seleccionado ya tiene asignada una jornada de trabajo para esa fecha.'
            ]);
        }

        $logModel->asignarRuta($id_chofer, $id_vehiculo, $fecha_salida, $hora_salida, $pedidos);

        responder([
            'ok' => true,
            'msg' => '¡Ruta y pedidos asignados correctamente al conductor con éxito!'
        ]);
    }

    responder([
        'ok' => false,
        'msg' => 'Acción no válida.'
    ]);

} catch (Exception $e) {
    responder([
        'ok' => false,
        'msg' => 'Error en logística: ' . $e->getMessage()
    ]);
}
?>