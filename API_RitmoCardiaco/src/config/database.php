<?php
namespace Config;

use mysqli;

class Database {
    public static function connect() {
        $host = "mysql_db";
        $port = 3306; 
        $user = "usuario_api";
        $password = "password_usuario_api";
        $database = "basedatos_api";

        $conn = new mysqli($host, $user, $password, $database, $port);

        if ($conn->connect_error) {
            die("Error de conexión a la base de datos: " . $conn->connect_error);
        }

        $conn->set_charset("utf8mb4");

        return $conn;
    }
}
?>