<?php
// MODELO/UsuM.php
require_once __DIR__ . '/../CONFIG/db.php';

class UsuM {
    private $db;

    public function __construct($pdo) {
        $this->db = $pdo;
    }

    // 1. Buscar usuario por correo (Login)
    public function buscarPorCorreo($correo) {
        $stmt = $this->db->prepare("SELECT * FROM usuarios WHERE correo = ?");
        $stmt->execute([$correo]);
        return $stmt->fetch();
    }

    // 2. Registrar usuario general (Clientes tipo = 0)
    public function registrarUsuario($nombre, $correo, $contra) {
        $contraHash = password_hash($contra, PASSWORD_BCRYPT);
        $stmt = $this->db->prepare("INSERT INTO usuarios (nombre, correo, contra, tipo, estatus) VALUES (?, ?, ?, 0, 1)");
        return $stmt->execute([$nombre, $correo, $contraHash]);
    }

    // 3. Registrar Chofer desde el panel de Administrador (tipo = 2)
    public function registrarChofer($nombre, $correo, $contra) {
        $contraHash = password_hash($contra, PASSWORD_BCRYPT);
        $stmt = $this->db->prepare("INSERT INTO usuarios (nombre, correo, contra, tipo, estatus) VALUES (?, ?, ?, 2, 1)");
        return $stmt->execute([$nombre, $correo, $contraHash]);
    }

    // 4. Listar únicamente a los Choferes (tipo = 2) del sistema (Activos o Inactivos)
   // Busca esta función dentro de MODELO/UsuM.php y reemplázala por completo:

public function listarChoferes() {
    // Consulta limpia y segura: solo traemos los campos básicos para evitar errores de columnas de fecha
    $sql = "SELECT id_usu, nombre, correo, estatus FROM usuarios WHERE tipo = 2 ORDER BY id_usu DESC";
    $stmt = $this->db->query($sql);
    return $stmt->fetchAll();
}

    // 5. NUEVO: Modificar el estatus de un conductor (Dar de Baja o Re-activar)
    public function cambiarEstatusUsuario($id_usu, $nuevo_estatus) {
        $stmt = $this->db->prepare("UPDATE usuarios SET estatus = ? WHERE id_usu = ?");
        return $stmt->execute([$nuevo_estatus, $id_usu]);
    }
}
?>