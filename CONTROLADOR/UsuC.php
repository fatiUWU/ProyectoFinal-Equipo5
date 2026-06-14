<?php
// CONTROLADOR/UsuC.php
require_once __DIR__ . '/../CONFIG/db.php';
require_once __DIR__ . '/../MODELO/UsuM.php';

header('Content-Type: application/json');

$json = file_get_contents('php://input');
$data = json_decode($json, true);

// Forzamos a capturar la acción de manera limpia
$accion = isset($_GET['accion']) ? trim($_GET['accion']) : '';

$usuarioModel = new UsuM($pdo);

try {
    if ($accion === 'registrar_cliente' || empty($accion)) {
        $nombre = isset($data['nombre']) ? trim($data['nombre']) : '';
        $correo = isset($data['correo']) ? trim($data['correo']) : '';
        $contra = isset($data['contra']) ? trim($data['contra']) : '';

        if (empty($nombre) || empty($correo) || empty($contra)) {
            echo json_encode(['ok' => false, 'msg' => 'Todos los campos son obligatorios desde el servidor.']);
            exit;
        }

        if ($usuarioModel->buscarPorCorreo($correo)) {
            echo json_encode(['ok' => false, 'msg' => 'El correo electrónico ya se encuentra registrado.']);
            exit;
        }

        $usuarioModel->registrarUsuario($nombre, $correo, $contra);
        echo json_encode(['ok' => true, 'msg' => '¡Cuenta de cliente creada con éxito!']);
        exit;
    }

    // ADMINISTRADOR CREA UN CHOFER (tipo = 2)
    else if ($accion === 'crear_chofer') {
        $nombre = trim($data['nombre']);
        $correo = trim($data['correo']);
        $contra = trim($data['contra']);

        if (empty($nombre) || empty($correo) || empty($contra)) {
            echo json_encode(['ok' => false, 'msg' => 'Por favor, llena todos los campos del formulario.']);
            exit;
        }

        if ($usuarioModel->buscarPorCorreo($correo)) {
            echo json_encode(['ok' => false, 'msg' => 'Este correo ya está en uso por otro usuario.']);
            exit;
        }

        $usuarioModel->registrarChofer($nombre, $correo, $contra);
        echo json_encode(['ok' => true, 'msg' => '¡Conductor registrado de forma correcta en el sistema!']);
        exit;
    }

    // TRAER LA LISTA DE CHOFERES A LA TABLA
    else if ($accion === 'listar_choferes') {
        $choferes = $usuarioModel->listarChoferes();
        echo json_encode([
            'ok' => true, 
            'choferes' => $choferes ? $choferes : []
        ]);
        exit;
    }

    // DAR DE BAJA O REACTIVAR UN CONDUCTOR
    else if ($accion === 'cambiar_estatus') {
        $id_usu = intval($data['id_usu']);
        $nuevo_estatus = intval($data['estatus']); 

        $usuarioModel->cambiarEstatusUsuario($id_usu, $nuevo_estatus);
        
        $msgFinal = ($nuevo_estatus === 0) 
            ? 'Conductor dado de baja del sistema correctamente.' 
            : 'Acceso del conductor reactivado con éxito.';

        echo json_encode(['ok' => true, 'msg' => $msgFinal]);
        exit;
    }

    // --- NUEVO: EDITAR DATOS DEL CONDUCTOR ---
    else if ($accion === 'editar_chofer') {
        $id_usu = intval($data['id_usu']);
        $nombre = trim($data['nombre']);
        $correo = trim($data['correo']);

        if ($id_usu <= 0 || empty($nombre) || empty($correo)) {
            echo json_encode(['ok' => false, 'msg' => 'Datos incompletos para actualizar.']);
            exit;
        }

        // Validación: Evitar que ponga un correo que ya le pertenece a otro usuario en la BD
        $stmtCheck = $pdo->prepare("SELECT id_usu FROM usuarios WHERE correo = ? AND id_usu != ?");
        $stmtCheck->execute([$correo, $id_usu]);
        if ($stmtCheck->rowCount() > 0) {
            echo json_encode(['ok' => false, 'msg' => 'Este correo ya está en uso por otro usuario.']);
            exit;
        }

        // Actualizamos directo mediante el objeto PDO
        $stmt = $pdo->prepare("UPDATE usuarios SET nombre = ?, correo = ? WHERE id_usu = ?");
        $stmt->execute([$nombre, $correo, $id_usu]);
        
        echo json_encode(['ok' => true, 'msg' => 'Datos del conductor actualizados correctamente.']);
        exit;
    }

} catch (Exception $e) {
    echo json_encode(['ok' => false, 'msg' => 'Error en el controlador de usuarios: ' . $e->getMessage()]);
}
?>