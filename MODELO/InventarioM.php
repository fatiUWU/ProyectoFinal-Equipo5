<?php
// MODELO/InventarioM.php
require_once __DIR__ . '/../CONFIG/db.php';

class InventarioM {
    private $db;

    public function __construct($pdo) {
        $this->db = $pdo;
    }
    
    public function editarProducto($id_producto, $nombre, $tipo_producto, $unidad_medida, $precio, $descripcion, $estado) {
        $sql = "UPDATE productos SET nombre = ?, tipo_producto = ?, unidad_medida = ?, precio = ?, descripcion = ?, estado = ? WHERE id_producto = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$nombre, $tipo_producto, $unidad_medida, $precio, $descripcion, $estado, $id_producto]);
    }

    public function registrarProducto($nombre, $tipo_producto, $descripcion, $unidad_medida, $stock_inicial, $stock_minimo, $precio) {
        $estado_inicial = ($stock_inicial > 0) ? 'Disponible' : 'No Disponible';
        $sql = "INSERT INTO productos (nombre, tipo_producto, descripcion, unidad_medida, stock, stock_minimo, precio, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$nombre, $tipo_producto, $descripcion, $unidad_medida, $stock_inicial, $stock_minimo, $precio, $estado_inicial]);
    }

    public function actualizarStock($id_producto, $cantidad) {
        $stmt = $this->db->prepare("UPDATE productos SET stock = stock + ? WHERE id_producto = ?");
        $stmt->execute([$cantidad, $id_producto]);

        // Evitar stocks negativos y recalcular estado
        $stmtCheck = $this->db->prepare("SELECT stock FROM productos WHERE id_producto = ?");
        $stmtCheck->execute([$id_producto]);
        $producto = $stmtCheck->fetch();

        if ($producto && $producto['stock'] <= 0) {
            $stmtEstado = $this->db->prepare("UPDATE productos SET stock = 0, estado = 'No Disponible' WHERE id_producto = ?");
            $stmtEstado->execute([$id_producto]);
        }
    }

    public function registrarMovimiento($id_producto, $tipo, $cantidad) {
        $stmt = $this->db->prepare("INSERT INTO movimientos_inventario (id_producto, tipo_movimiento, cantidad) VALUES (?, ?, ?)");
        return $stmt->execute([$id_producto, $tipo, $cantidad]);
    }

    public function listarProductos() {
        $stmt = $this->db->query("SELECT * FROM productos ORDER BY id_producto DESC");
        return $stmt->fetchAll();
    }

    public function obtenerAlertasStockBajo() {
        $stmt = $this->db->query("SELECT * FROM productos WHERE stock <= stock_minimo");
        return $stmt->fetchAll();
    }
}
?>