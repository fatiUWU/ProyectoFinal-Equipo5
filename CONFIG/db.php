<?php
// CONFIG/db.php - Conexión a InfinityFree

$host = 'sql107.infinityfree.com'; 
$dbname = 'if0_42063724_id12345_ecologistica'; 
$username = 'if0_42063724'; 

// 👇 Reemplaza esto por tu contraseña real del panel (vPanel Password) 👇
$password = 'MX2OiMgTaw5i'; 

try {
    // Se establece la conexión utilizando PDO
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    
    // Configuración para el manejo de errores y formato de los datos
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    
} catch (PDOException $e) {
    // Si hay un error, se detiene el script y se muestra el problema
    die("Error crítico de conexión a la base de datos en la nube: " . $e->getMessage());
}
?>