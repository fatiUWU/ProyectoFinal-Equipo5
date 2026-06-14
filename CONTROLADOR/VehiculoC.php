<?php
// CONTROLADOR/VehiculoC.php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../CONFIG/db.php';
header('Content-Type: application/json');

$accion = isset($_GET['accion']) ? $_GET['accion'] : '';
$json = file_get_contents('php://input');
$data = json_decode($json, true);

// Validación de seguridad
if (!isset($_SESSION['id_usuario']) && !isset($_SESSION['id_usu'])) {
    echo json_encode(['ok' => false, 'msg' => 'Sesión expirada o inválida.']);
    exit;
}

try {
    // 1. LISTAR TODOS LOS VEHÍCULOS
    if ($accion === 'listar') {
        $stmt = $pdo->query("SELECT * FROM vehiculos ORDER BY id_vehiculo DESC");
        $vehiculos = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['ok' => true, 'vehiculos' => $vehiculos]);
    }
    
    // 2. AGREGAR UN VEHÍCULO
    else if ($accion === 'agregar') {
        $modelo = trim($data['modelo']);
        $placas = trim(strtoupper($data['placas']));

        if (empty($modelo) || empty($placas)) {
            echo json_encode(['ok' => false, 'msg' => 'Por favor completa el modelo y las placas.']);
            exit;
        }

        // Por defecto en la BD se guarda como 'activo'
        $stmt = $pdo->prepare("INSERT INTO vehiculos (modelo, placas) VALUES (?, ?)");
        $stmt->execute([$modelo, $placas]);
        
        echo json_encode(['ok' => true, 'msg' => '¡Vehículo registrado con éxito en el sistema!']);
    }
    
    // 3. ELIMINAR UN VEHÍCULO
    else if ($accion === 'eliminar') {
        $id_vehiculo = isset($data['id_vehiculo']) ? intval($data['id_vehiculo']) : 0;
        
        if ($id_vehiculo <= 0) {
            echo json_encode(['ok' => false, 'msg' => 'ID de vehículo no válido.']);
            exit;
        }

        $stmt = $pdo->prepare("DELETE FROM vehiculos WHERE id_vehiculo = ?");
        $stmt->execute([$id_vehiculo]);
        
        echo json_encode(['ok' => true, 'msg' => 'Vehículo eliminado correctamente.']);
    } 

    // 4. EDITAR UN VEHÍCULO
    else if ($accion === 'editar') {
        $id_vehiculo = isset($data['id_vehiculo']) ? intval($data['id_vehiculo']) : 0;
        $modelo = trim($data['modelo']);
        $placas = trim(strtoupper($data['placas']));

        if ($id_vehiculo <= 0 || empty($modelo) || empty($placas)) {
            echo json_encode(['ok' => false, 'msg' => 'Datos incompletos para la actualización.']);
            exit;
        }

        $stmt = $pdo->prepare("UPDATE vehiculos SET modelo = ?, placas = ? WHERE id_vehiculo = ?");
        $stmt->execute([$modelo, $placas, $id_vehiculo]);
        
        echo json_encode(['ok' => true, 'msg' => '¡Vehículo actualizado correctamente!']);
    }

    // 5. CAMBIAR ESTADO DEL VEHÍCULO (ACTIVO/INACTIVO)
    else if ($accion === 'cambiar_estado') {
        $id_vehiculo = isset($data['id_vehiculo']) ? intval($data['id_vehiculo']) : 0;
        $estado_actual = isset($data['estado']) ? $data['estado'] : 'activo';
        
        // Si estaba activo, lo pone inactivo. Y viceversa.
        $nuevo_estado = ($estado_actual === 'activo') ? 'inactivo' : 'activo';

        if ($id_vehiculo <= 0) {
            echo json_encode(['ok' => false, 'msg' => 'ID de vehículo no válido.']);
            exit;
        }

        $stmt = $pdo->prepare("UPDATE vehiculos SET estado = ? WHERE id_vehiculo = ?");
        $stmt->execute([$nuevo_estado, $id_vehiculo]);
        
        echo json_encode(['ok' => true, 'msg' => 'Estado del vehículo actualizado.']);
    }
    
    else {
        echo json_encode(['ok' => false, 'msg' => 'Acción no reconocida.']);
    }

} catch (Exception $e) {
    echo json_encode(['ok' => false, 'msg' => 'Error en base de datos: ' . $e->getMessage()]);
}
?>