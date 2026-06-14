<?php
// MODELO/LogisticaM.php
require_once __DIR__ . '/../CONFIG/db.php';

class LogisticaM {
    private $db;

    public function __construct($pdo) {
        $this->db = $pdo;
    }

    public function listarPedidosPendientes() {
        $sql = "SELECT p.id_pedido, u.nombre AS nombre_cliente, p.calle_numero, p.colonia, p.municipio_ciudad 
                FROM pedidos p
                INNER JOIN usuarios u ON p.id_usu = u.id_usu
                WHERE p.estado = 'Pendiente' ORDER BY p.id_pedido ASC";
        return $this->db->query($sql)->fetchAll();
    }

    public function listarChoferes() {
        return $this->db->query("SELECT id_usu, nombre FROM usuarios WHERE tipo = 2 AND estatus = 1")->fetchAll();
    }

    public function listarVehiculos() {
        return $this->db->query("SELECT * FROM vehiculos")->fetchAll();
    }

    public function asignarRuta($id_chofer, $id_vehiculo, $fecha_salida, $hora_salida, $pedidosIds) {
        try {
            $this->db->beginTransaction();

            // 1. Registrar la cabecera de la ruta de distribución
            $sql = "INSERT INTO rutas (id_chofer, id_vehiculo, fecha_salida, hora_salida) VALUES (?, ?, ?, ?)";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$id_chofer, $id_vehiculo, $fecha_salida, $hora_salida]);
            $id_route = $this->db->lastInsertId();

            // 2. Asociar los pedidos uno a uno y actualizar su estado logístico
            foreach ($pedidosIds as $id_pedido) {
                $stmtDet = $this->db->prepare("INSERT INTO detalles_ruta (id_route, id_pedido) VALUES (?, ?)");
                $stmtDet->execute([$id_route, intval($id_pedido)]);

                // El pedido avanza en el flujo y pasa automáticamente a "En Preparacion"
                $stmtPed = $this->db->prepare("UPDATE pedidos SET estado = 'En Preparacion' WHERE id_pedido = ?");
                $stmtPed->execute([intval($id_pedido)]);

                // --- SOLUCIÓN: REGISTRAR EL SALTO EN EL HISTORIAL ---
                // Registramos que pasó de "Pendiente" a "En Preparacion" para que aparezca en la línea de tiempo
                $stmtHist = $this->db->prepare("INSERT INTO historial_pedidos (id_pedido, estado_anterior, estado_nuevo, fecha_cambio) VALUES (?, 'Pendiente', 'En Preparacion', NOW())");
                $stmtHist->execute([intval($id_pedido)]);
            }

            $this->db->commit();
            return true;
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }
}
?>