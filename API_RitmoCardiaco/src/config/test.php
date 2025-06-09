<?php
require_once 'Database.php';

use Config\Database;

$conn = Database::connect();
echo "Conexión exitosa a la base de datos.";
$conn->close();
?>
