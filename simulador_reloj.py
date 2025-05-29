import paho.mqtt.client as mqtt
import time
import json
import random
import sys

# Parámetros de conexión
broker = "localhost"
port = 1883

# Validar argumento de dispositivo
if len(sys.argv) < 2:
    print("Uso: python envio-datos-mqtt.py <nombre_dispositivo>")
    sys.exit(1)

dispositivo = sys.argv[1]
topic = f"dispositivos/{dispositivo}/ritmo_cardiaco"

# Callback cuando se conecta al broker
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("Conectado exitosamente al broker MQTT")
    else:
        print(f"Error de conexión. Código de retorno: {rc}")

# Función para generar el ritmo cardíaco simulado
def generar_ritmo_cardiaco():
    return random.randint(30, 130)

# Función para construir el mensaje JSON
def construir_mensaje(dispositivo, ritmo):
    return json.dumps({
        "dispositivo": dispositivo,
        "ritmo_cardiaco": ritmo,
        "unidad": "bpm",
        "timestamp": int(time.time())
    })

# Crear cliente MQTT y asignar callback
client = mqtt.Client()
client.on_connect = on_connect

# Conectar al broker
client.connect(broker, port, 60)
client.loop_start()

try:
    while True:
        ritmo = generar_ritmo_cardiaco()
        mensaje = construir_mensaje(dispositivo, ritmo)
        client.publish(topic, mensaje)
        print(f"Mensaje enviado a '{topic}': {mensaje}")
        time.sleep(5)

except KeyboardInterrupt:
    print("Deteniendo el envío de datos...")

finally:
    client.loop_stop()
    client.disconnect()
