<?php
// CONTROLADOR/RecuperarC.php
require_once __DIR__ . '/../CONFIG/db.php';
header('Content-Type: application/json');

$json = file_get_contents('php://input');
$data = json_decode($json, true);
$accion = isset($_GET['accion']) ? trim($_GET['accion']) : '';

try {
    // =========================================================================
    // 1. SOLICITAR RECUPERACIÓN (MODO REDIRECCIÓN AUTOMÁTICA FORZADA)
    // =========================================================================
    if ($accion === 'solicitar') {
        $correo = trim($data['correo']);

        if (empty($correo)) {
            echo json_encode(['ok' => false, 'msg' => 'Por favor, ingresa un correo electrónico.']);
            exit;
        }

        // Verificar si el correo existe
        $stmt = $pdo->prepare("SELECT id_usu, nombre FROM usuarios WHERE correo = ?");
        $stmt->execute([$correo]);
        $usuario = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$usuario) {
            echo json_encode(['ok' => true, 'msg' => 'Si el correo existe, hemos enviado un enlace de recuperación.']);
            exit;
        }

        // Generar el token y la caducidad
        $token = bin2hex(random_bytes(32));
        $expiry = date('Y-m-d H:i:s', strtotime('+1 hour'));

        // Guardar el token en la BD
        $stmtUpdate = $pdo->prepare("UPDATE usuarios SET reset_token = ?, reset_expiry = ? WHERE id_usu = ?");
        $stmtUpdate->execute([$token, $expiry, $usuario['id_usu']]);

        // FORZAMOS LA REDIRECCIÓN (Ignoramos el servidor de correo por completo)
        echo json_encode([
            'ok' => true, 
            'redirect' => true,
            'token' => $token,
            'msg' => 'Aprobado. Redirigiendo a la zona segura para cambiar tu contraseña...'
        ]);
        exit;
    }

    // =========================================================================
    // 2. RESTABLECER LA CONTRASEÑA (VERIFICAR TOKEN)
    // =========================================================================
    else if ($accion === 'restablecer') {
        $token = trim($data['token']);
        $nueva_contra = trim($data['nueva_contra']);

        if (empty($token) || empty($nueva_contra)) {
            echo json_encode(['ok' => false, 'msg' => 'Datos incompletos.']);
            exit;
        }

        // Buscar al usuario por el token
        $stmt = $pdo->prepare("SELECT id_usu FROM usuarios WHERE reset_token = ? AND reset_expiry > NOW()");
        $stmt->execute([$token]);
        $usuario = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$usuario) {
            echo json_encode(['ok' => false, 'msg' => 'El enlace de recuperación es inválido o ya ha caducado.']);
            exit;
        }

        // Encriptar la nueva contraseña de forma segura (Bcrypt)
        $contra_encriptada = password_hash($nueva_contra, PASSWORD_DEFAULT);

        // Actualizar la contraseña y destruir el token
        $stmtUpdate = $pdo->prepare("UPDATE usuarios SET contra = ?, reset_token = NULL, reset_expiry = NULL WHERE id_usu = ?");
        $stmtUpdate->execute([$contra_encriptada, $usuario['id_usu']]);

        echo json_encode(['ok' => true, 'msg' => 'Contraseña actualizada correctamente.']);
        exit;
    }

} catch (Exception $e) {
    echo json_encode(['ok' => false, 'msg' => 'Error interno: ' . $e->getMessage()]);
}
?>