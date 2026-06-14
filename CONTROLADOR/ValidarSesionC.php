<?php
// CONTROLADOR/ValidarSesionC.php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json');

// Revisamos si existe alguna de las dos variables de sesión que usas en tu sistema
if (isset($_SESSION['id_usuario']) || isset($_SESSION['id_usu'])) {
    echo json_encode(['ok' => true, 'msg' => 'Sesión activa y válida.']);
} else {
    echo json_encode(['ok' => false, 'msg' => 'Acceso denegado. No hay sesión.']);
}
?>