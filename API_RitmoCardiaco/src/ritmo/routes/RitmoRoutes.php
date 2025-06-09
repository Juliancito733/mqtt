<?php
require_once __DIR__ . '/../controllers/RitmoController.php';

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER["REQUEST_METHOD"];

$routes = [
    'GET' => [
        '/api/ritmo' => [RitmoController::class, 'index']
    ],
    'POST' => [
        '/api/ritmo' => [RitmoController::class, 'store']
    ]
];


if (isset($routes[$method][$path])) {
    call_user_func($routes[$method][$path]);
} else {
    header("HTTP/1.1 404 Not Found");
    echo "<h1>Error 404</h1><p>Ruta no encontrada: $path</p>";
}
?>
