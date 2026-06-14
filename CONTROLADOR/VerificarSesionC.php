<?php
// CONTROLADOR/VerificarSesionC.php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json');

// Revisamos si existe la variable de sesión
if (isset($_SESSION['id_usuario']) || isset($_SESSION['id_usu'])) {
    echo json_encode(['ok' => true, 'msg' => 'Sesión activa y válida.']);
} else {
    echo json_encode(['ok' => false, 'msg' => 'Acceso denegado. No hay sesión.']);
}
?>