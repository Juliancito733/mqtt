<?php
require_once __DIR__ . '/../services/RitmoService.php';

class RitmoController {
    public static function index() {
        $datosRitmo = RitmoService::getDatosRitmo();
        header('Content-Type: application/json; charset=utf-8');

        echo json_encode($datosRitmo, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    }

    public static function store() {
        // Leer JSON recibido
        $input = json_decode(file_get_contents('php://input'), true);

        // Validar datos mínimos
        if (!isset($input['dispositivo'], $input['ritmo_cardiaco'], $input['unidad'], $input['timestamp'])) {
            http_response_code(400);
            echo json_encode(["error" => "Datos incompletos"]);
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
            echo json_encode(["error" => "Error al guardar el dato"]);
        }
    }
}
?>
