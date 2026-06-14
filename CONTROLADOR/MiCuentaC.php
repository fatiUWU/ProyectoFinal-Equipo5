<?php
// ==========================================================================
// CONTROLADOR: MI CUENTA (INDEPENDIENTE CON PDO DIRECTO)
// ==========================================================================
session_start();
require_once __DIR__ . '/../CONFIG/db.php';

header('Content-Type: application/json');

$json = file_get_contents('php://input');
$data = json_decode($json, true);
$accion = isset($_GET['accion']) ? trim($_GET['accion']) : '';

// 1. Detección inteligente de la variable de sesión
$id_sesion_activa = null;
if (isset($_SESSION['id_usu'])) {
    $id_sesion_activa = $_SESSION['id_usu'];
} else if (isset($_SESSION['id_usuario'])) {
    $id_sesion_activa = $_SESSION['id_usuario'];
}

// Bloqueo de seguridad si no hay sesión
if (!$id_sesion_activa) {
    echo json_encode(['ok' => false, 'msg' => 'Tu sesión ha caducado. Por favor, inicia sesión de nuevo.']);
    exit;
}

try {
    // ======================================================================
    // ACCIÓN: TRAER DATOS DEL PERFIL
    // ======================================================================
    if ($accion === 'ver_perfil') {
        
        $stmt = $pdo->prepare("SELECT nombre, correo FROM usuarios WHERE id_usu = ?");
        $stmt->execute([$id_sesion_activa]);
        $usuario = $stmt->fetch(PDO::FETCH_ASSOC); 
        
        if ($usuario) {
            echo json_encode([
                'ok' => true, 
                'nombre' => $usuario['nombre'], 
                'correo' => $usuario['correo']
            ]);
        } else {
            echo json_encode(['ok' => false, 'msg' => 'No localizamos tus datos en la base de datos.']);
        }
        exit;
    }
    
    // ======================================================================
    // ACCIÓN: ACTUALIZAR LA CONTRASEÑA
    // ======================================================================
    else if ($accion === 'actualizar_contra') {
        $contra_actual = isset($data['contra_actual']) ? $data['contra_actual'] : '';
        $nueva_contra = isset($data['contra']) ? trim($data['contra']) : '';
        
        if (empty($contra_actual)) {
            echo json_encode(['ok' => false, 'msg' => 'Debes ingresar tu contraseña actual por seguridad.']);
            exit;
        }

        if (empty($nueva_contra) || strlen($nueva_contra) < 6) {
            echo json_encode(['ok' => false, 'msg' => 'La nueva contraseña no cumple con la longitud mínima de seguridad.']);
            exit;
        }

        // 1. Obtener la contraseña actual de la base de datos
        $stmtVerificar = $pdo->prepare("SELECT contra FROM usuarios WHERE id_usu = ?");
        $stmtVerificar->execute([$id_sesion_activa]);
        $usuarioDb = $stmtVerificar->fetch(PDO::FETCH_ASSOC);

        if (!$usuarioDb) {
            echo json_encode(['ok' => false, 'msg' => 'Usuario no encontrado en la base de datos.']);
            exit;
        }

        $contra_db = $usuarioDb['contra'];
        $esValida = false;

        // 2. SÚPER VALIDACIÓN: Comprobamos todos los métodos
        if ($contra_db === $contra_actual) {
            $esValida = true; // Coincide en texto plano (como "Recess")
        } else if ($contra_db === md5($contra_actual)) {
            $esValida = true; // Coincide con MD5
        } else if (password_verify($contra_actual, $contra_db)) {
            $esValida = true; // Coincide con BCRYPT
        }

        if (!$esValida) {
            echo json_encode(['ok' => false, 'msg' => 'La contraseña actual es incorrecta.']);
            exit;
        }

        // 3. ENCRIPTAMOS LA NUEVA CONTRASEÑA ANTES DE GUARDARLA
        $contra_encriptada = password_hash($nueva_contra, PASSWORD_DEFAULT);

        // 4. Actualización a la base de datos
        $stmt = $pdo->prepare("UPDATE usuarios SET contra = ? WHERE id_usu = ?");
        $stmt->execute([$contra_encriptada, $id_sesion_activa]);
        
        echo json_encode(['ok' => true, 'msg' => '¡Tu contraseña ha sido actualizada y encriptada exitosamente!']);
        exit;
    }

} catch (Throwable $e) {
    echo json_encode(['ok' => false, 'msg' => 'Falla interna del servidor BD: ' . $e->getMessage()]);
}
?>