<?php
// CONTROLADOR/ObtenerSesionC.php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json');

if (isset($_SESSION['tipo_usuario'])) {
    echo json_encode([
        'logueado' => true,
        'tipo' => intval($_SESSION['tipo_usuario']),
        'nombre' => $_SESSION['nombre']
    ]);
} else {
    // Si no hay sesión, simulamos un cliente temporal para evitar que se rompa el desarrollo
    echo json_encode([
        'logueado' => false,
        'tipo' => 0, 
        'nombre' => 'Invitado'
    ]);
}
?>