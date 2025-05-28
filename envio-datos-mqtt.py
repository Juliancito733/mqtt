import paho.mqtt.client as mqtt
import time
import json
import random

# Parámetros de conexión
broker = "localhost"
port = 1883
topic = "sensor/datos"

# Callback cuando se conecta al broker
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("Conectado exitosamente al broker MQTT")
    else:
        print(f"Error de conexión. Código de retorno: {rc}")

# Crear cliente MQTT y asignar callback
client = mqtt.Client()
client.on_connect = on_connect

# Conectar al broker
client.connect(broker, port, 60)

# Iniciar el bucle de red en segundo plano
client.loop_start()

try:
    while True:
        # Simular ritmo cardíaco entre 30 y 130 bpm
        ritmo_cardiaco = random.randint(30, 130)

        # Crear mensaje JSON
        mensaje = json.dumps({
            "sensor": "reloj_inteligente",
            "ritmo_cardiaco": ritmo_cardiaco,
            "unidad": "bpm",
            "timestamp": int(time.time())
        })

        # Publicar mensaje en el topic MQTT
        client.publish(topic, mensaje)
        print(f"Mensaje enviado: {mensaje}")

        # Esperar 5 segundos antes de enviar el siguiente dato
        time.sleep(5)

except KeyboardInterrupt:
    print("Deteniendo el envío de datos...")

finally:
    client.loop_stop()
    client.disconnect()
