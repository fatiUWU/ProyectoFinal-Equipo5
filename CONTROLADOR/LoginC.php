<?php
// CONTROLADOR/LoginC.php
require_once __DIR__ . '/../CONFIG/db.php';
require_once __DIR__ . '/../MODELO/UsuM.php';

// Iniciar sesión para guardar los datos del usuario en el servidor
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json');

$json = file_get_contents('php://input');
$data = json_decode($json, true);

if (!$data) {
    echo json_encode(['ok' => false, 'msg' => 'Error de comunicación: No se recibieron los datos correctamente.']);
    exit;
}

// =========================================================================
// 🛑 PROTECCIÓN CONTRA FUERZA BRUTA (BLOQUEO DE 10 MINUTOS)
// =========================================================================
if (isset($_SESSION['bloqueo_hasta'])) {
    if (time() < $_SESSION['bloqueo_hasta']) {
        // Aún está bloqueado
        $tiempo_restante = ceil(($_SESSION['bloqueo_hasta'] - time()) / 60);
        echo json_encode(['ok' => false, 'msg' => "Demasiados intentos fallidos. Por seguridad, vuelve a intentarlo en $tiempo_restante minuto(s)."]);
        exit;
    } else {
        // Ya pasó el tiempo de castigo, le damos una nueva oportunidad
        unset($_SESSION['intentos_fallidos']);
        unset($_SESSION['bloqueo_hasta']);
    }
}

try {
    $correo = trim($data['correo']);
    $contra = trim($data['contra']);

    if (empty($correo) || empty($contra)) {
        echo json_encode(['ok' => false, 'msg' => 'Por favor, introduce tu correo y contraseña.']);
        exit;
    }

    $usuarioModel = new UsuM($pdo);
    $user = $usuarioModel->buscarPorCorreo($correo);

    // Verificar si el usuario existe y si la contraseña coincide
    if ($user && password_verify($contra, $user['contra'])) {
        
        // Validar si el usuario está activo
        if (intval($user['estatus']) !== 1) {
            echo json_encode(['ok' => false, 'msg' => 'Tu cuenta se encuentra suspendida o inactiva.']);
            exit;
        }

        // ✅ ¡ACCESO CORRECTO! Limpiamos el historial de errores
        unset($_SESSION['intentos_fallidos']);
        unset($_SESSION['bloqueo_hasta']);

        // Guardamos las variables de sesión
        $_SESSION['id_usuario']   = $user['id_usu'];
        $_SESSION['id_usu']       = $user['id_usu']; 
        $_SESSION['nombre']       = $user['nombre'];
        $_SESSION['tipo_usuario'] = intval($user['tipo']);
        $_SESSION['ultimo_acceso'] = time(); // <--- IMPORTANTE PARA LA INACTIVIDAD

        // Redirección
        $urlRedireccion = 'inicioC.html'; 
        switch (intval($user['tipo'])) {
            case 1: $urlRedireccion = 'dashboard.html'; break;
            case 0: $urlRedireccion = 'inicioC.html'; break;
            case 2: $urlRedireccion = 'inicioChofer.html'; break;
        }

        echo json_encode(['ok' => true, 'msg' => '¡Acceso concedido exitosamente!', 'url' => $urlRedireccion]);

    } else {
        // ❌ ¡CONTRASEÑA INCORRECTA! Sumamos un intento fallido
        if (!isset($_SESSION['intentos_fallidos'])) {
            $_SESSION['intentos_fallidos'] = 1;
        } else {
            $_SESSION['intentos_fallidos']++;
        }

        // Si llegó a 5 errores, lo bloqueamos 10 minutos (600 segundos)
        if ($_SESSION['intentos_fallidos'] >= 5) {
            $_SESSION['bloqueo_hasta'] = time() + 600; 
            echo json_encode(['ok' => false, 'msg' => 'Has superado el límite de 5 intentos. Tu cuenta ha sido bloqueada temporalmente por 10 minutos.']);
        } else {
            $intentos_restantes = 5 - $_SESSION['intentos_fallidos'];
            echo json_encode(['ok' => false, 'msg' => "El correo o la contraseña son incorrectos. Te quedan $intentos_restantes intento(s)."]);
        }
    }

} catch (Exception $e) {
    echo json_encode(['ok' => false, 'msg' => 'Error interno en el servidor: ' . $e->getMessage()]);
}
?>