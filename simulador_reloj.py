import paho.mqtt.client as mqtt
import time
import json
import random
import sys
import requests  # <-- Agregado para enviar datos HTTP

broker = "localhost"
port = 1883

if len(sys.argv) < 2:
    print("Debe proporcionar el nombre como argumento. Uso: python simulador_reloj.py <nombre_dispositivo>")
    sys.exit(1)

nombre_dispositivo = sys.argv[1]
topic = f"dispositivos/{nombre_dispositivo}/ritmo_cardiaco"
api_url = "http://api_php:5000/api/ritmo"


def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("Conectado exitosamente al broker MQTT")
    else:
        print(f"Error de conexión. Código de retorno: {rc}")

def generar_ritmo_cardiaco():
    return random.randint(30, 130)

def construir_mensaje(dispositivo, ritmo):
    return {
        "dispositivo": dispositivo,
        "ritmo_cardiaco": ritmo,
        "unidad": "bpm",
        "timestamp": int(time.time())
    }

def enviar_a_api(mensaje):
    try:
        response = requests.post(api_url, json=mensaje)
        if response.status_code == 200 or response.status_code == 201:
            print(f"Datos enviados a la API: {mensaje}")
        else:
            print(f"Error al enviar a API: {response.status_code} - {response.text}")
    except requests.exceptions.RequestException as e:
        print(f"Error al conectar con la API: {e}")

client = mqtt.Client()
client.on_connect = on_connect
client.connect(broker, port, 60)
client.loop_start()

try:
    while True:
        ritmo = generar_ritmo_cardiaco()
        mensaje = construir_mensaje(nombre_dispositivo, ritmo)
        client.publish(topic, json.dumps(mensaje))
        print(f"MQTT -> '{topic}': {mensaje}")
        
        enviar_a_api(mensaje)  # <-- Enviar también a la API
        time.sleep(5)

except KeyboardInterrupt:
    print("Deteniendo el envío de datos...")

finally:
    client.loop_stop()
    client.disconnect()
