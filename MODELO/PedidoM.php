<?php
// MODELO/PedidoM.php
require_once __DIR__ . '/../CONFIG/db.php';

class PedidoM {
    private $db;

    public function __construct($pdo) {
        $this->db = $pdo;
    }

    // 1. Crear Pedido Completo (Mantenemos tu lógica intacta)
    public function crearPedido($id_usuario, $subtotal, $envio, $total, $productos, $direccion) {
        try {
            $this->db->beginTransaction();

            $sqlPedido = "INSERT INTO pedidos (id_usu, subtotal, envio, total, estado, calle_numero, colonia, cp, municipio_ciudad, estado_provincia, telefono_contacto) 
                          VALUES (?, ?, ?, ?, 'Pendiente', ?, ?, ?, ?, ?, ?)";
            
            $stmtPed = $this->db->prepare($sqlPedido);
            $stmtPed->execute([
                $id_usuario, $subtotal, $envio, $total,
                $direccion['calle_numero'], $direccion['colonia'], $direccion['cp'],
                $direccion['municipio_ciudad'], $direccion['estado_provincia'], $direccion['telefono_contacto']
            ]);
            
            $id_pedido = $this->db->lastInsertId();

            foreach ($productos as $item) {
                $id_prod = intval($item['id_producto']);
                $cant = intval($item['cantidad']);

                $stmtStock = $this->db->prepare("SELECT stock, nombre FROM productos WHERE id_producto = ?");
                $stmtStock->execute([$id_prod]);
                $producto = $stmtStock->fetch();

                if (!$producto || $producto['stock'] < $cant) {
                    $this->db->rollBack();
                    return ['ok' => false, 'msg' => "Stock insuficiente para: " . ($producto ? $producto['nombre'] : "Desconocido")];
                }

                $sqlDetalle = "INSERT INTO detalles_pedido (id_pedido, id_producto, cantidad, precio_unitario) VALUES (?, ?, ?, ?)";
                $stmtDet = $this->db->prepare($sqlDetalle);
                $stmtDet->execute([$id_pedido, $id_prod, $cant, $item['precio']]);

                $sqlRestar = "UPDATE productos SET stock = stock - ? WHERE id_producto = ?";
                $stmtRest = $this->db->prepare($sqlRestar);
                $stmtRest->execute([$cant, $id_prod]);

                $sqlMov = "INSERT INTO movimientos_inventario (id_producto, tipo_movimiento, cantidad) VALUES (?, 'venta', ?)";
                $stmtMov = $this->db->prepare($sqlMov);
                $stmtMov->execute([$id_prod, $cant]);

                $sqlCheckZero = "UPDATE productos SET estado = 'No Disponible' WHERE id_producto = ? AND stock <= 0";
                $stmtZero = $this->db->prepare($sqlCheckZero);
                $stmtZero->execute([$id_prod]);
            }

            $this->db->commit();
            return ['ok' => true, 'id_pedido' => $id_pedido];

        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    // 2. NUEVO: Listar todos los pedidos con el nombre del Cliente (INNER JOIN)
    public function listarPedidos() {
        $sql = "SELECT p.*, u.nombre AS nombre_cliente 
                FROM pedidos p
                INNER JOIN usuarios u ON p.id_usu = u.id_usu 
                ORDER BY p.id_pedido DESC";
        $stmt = $this->db->query($sql);
        return $stmt->fetchAll();
    }

    // 3. NUEVO: Actualizar estado de la orden
    public function actualizarEstado($id_pedido, $nuevo_estado) {
        $stmt = $this->db->prepare("UPDATE pedidos SET estado = ? WHERE id_pedido = ?");
        return $stmt->execute([$nuevo_estado, $id_pedido]);
    }

    // 4. NUEVO: Eliminar o Cancelar Pedido de forma lógica
    public function eliminarPedido($id_pedido) {
        $stmt = $this->db->prepare("DELETE FROM pedidos WHERE id_pedido = ?");
        return $stmt->execute([$id_pedido]);
    }
}
?>