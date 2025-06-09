<?php
require_once __DIR__ . '/../models/Ritmo.php';

class RitmoService {
    public static function getDatosRitmo() {
        $rawDatos = Reloj::obtenerDatos();
        $datos = [];

        foreach ($rawDatos as $registro) {
            $datos[] = [
                "id" => (int)$registro["id"],
                "dispositivo" => $registro["reloj_id"],
                "ritmo" => [
                    "valor" => (int)$registro["ritmo_cardiaco"],
                    "unidad" => $registro["unidad"]
                ],
                "timestamp" => (int)$registro["timestamp"]
            ];
        }

        return $datos;
    }

    public static function guardarDato($dispositivo, $ritmo_cardiaco, $unidad, $timestamp) {
        return Reloj::guardarDato($dispositivo, $ritmo_cardiaco, $unidad, $timestamp);
    }
}
?>
