<?php
require_once __DIR__ . '/../../config/database.php';
use Config\Database;

class Reloj {
    public static function guardarDato($dispositivo, $ritmo_cardiaco, $unidad, $timestamp) {
        $conn = Database::connect();

        $sql = "INSERT INTO datos_relojes (reloj_id, ritmo_cardiaco, unidad, timestamp)
                VALUES (?, ?, ?, ?)";

        $stmt = $conn->prepare($sql);
        $stmt->bind_param("sisi", $dispositivo, $ritmo_cardiaco, $unidad, $timestamp);
        $stmt->execute();

        $success = $stmt->affected_rows > 0;

        $stmt->close();
        return $success;
    }

    public static function obtenerDatos() {
        $conn = Database::connect();

        $sql = "SELECT
                    id,
                    reloj_id,
                    ritmo_cardiaco,
                    unidad,
                    timestamp
                FROM datos_relojes
                ORDER BY timestamp DESC";

        $result = $conn->query($sql);
        return $result->fetch_all(MYSQLI_ASSOC);
    }
}
?>
