<?php
require_once __DIR__ . '/../services/RitmoService.php';

class RitmoController {
    public static function index() {
        $datosRitmo = RitmoService::getDatosRitmo();
        header('Content-Type: application/json; charset=utf-8');

        // Verificar si hay datos
        if (empty($datosRitmo)) {
            http_response_code(200); // 200 porque la consulta fue exitosa, solo que no hay datos
            echo json_encode([
                "mensaje" => "No hay datos de ritmo cardíaco disponibles",
                "datos" => []
            ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
            return;
        }

        echo json_encode($datosRitmo, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    }

    public static function store() {
        // Leer JSON recibido
        $input = json_decode(file_get_contents('php://input'), true);

        // Validar que el JSON sea válido
        if ($input === null) {
            http_response_code(400);
            echo json_encode(["error" => "JSON inválido"]);
            return;
        }

        // Validar datos mínimos
        if (!isset($input['dispositivo'], $input['ritmo_cardiaco'], $input['unidad'], $input['timestamp'])) {
            http_response_code(400);
            echo json_encode(["error" => "Datos incompletos. Se requieren: dispositivo, ritmo_cardiaco, unidad, timestamp"]);
            return;
        }

        // Validar tipos de datos
        if (!is_numeric($input['ritmo_cardiaco']) || !is_numeric($input['timestamp'])) {
            http_response_code(400);
            echo json_encode(["error" => "ritmo_cardiaco y timestamp deben ser números"]);
            return;
        }

        // Validar rangos lógicos
        if ($input['ritmo_cardiaco'] < 0 || $input['ritmo_cardiaco'] > 300) {
            http_response_code(400);
            echo json_encode(["error" => "El ritmo cardíaco debe estar entre 0 y 300 bpm"]);
            return;
        }

        $exito = RitmoService::guardarDato(
            $input['dispositivo'],
            (int)$input['ritmo_cardiaco'],
            $input['unidad'],
            (int)$input['timestamp']
        );

        if ($exito) {
            http_response_code(201);
            echo json_encode(["mensaje" => "Dato guardado correctamente"]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Error al guardar el dato en la base de datos"]);
        }
    }
}
?>