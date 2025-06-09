<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

$request_uri = $_SERVER['REQUEST_URI'];
$request_method = $_SERVER['REQUEST_METHOD'];

if (strpos($request_uri, '/api/ritmo') === 0) {
    include '../src/ritmo/index.php';
} else {
    header("HTTP/1.1 404 Not Found");
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(["error" => "Ruta no encontrada"]);
}
?>
