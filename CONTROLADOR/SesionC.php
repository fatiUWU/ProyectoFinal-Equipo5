<?php
// CONTROLADOR/SesionC.php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json');

// Si existe una sesión activa, mandamos los datos, si no, avisamos que no está logueado
if (isset($_SESSION['tipo_usuario'])) {
    echo json_encode([
        'logueado' => true,
        'tipo' => intval($_SESSION['tipo_usuario']),
        'nombre' => $_SESSION['nombre']
    ]);
} else {
    echo json_encode(['logueado' => false]);
}
?>