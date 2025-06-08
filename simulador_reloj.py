"""
Simulador del reloj con un sensor que mide el ritmo cardiaco.

Este script simula un reloj inteligente que envía datos de ritmo cardíaco a un broker MQTT.
Este simulador actúa como PUBLICADOR, generando datos de ritmo cardíaco.

La comunicación entre los componentes se realiza mediante el protocolo MQTT
utilizando una estructura de tópicos dinámica basada en el nombre del dispositivo.
"""

import paho.mqtt.client as mqtt  # Biblioteca para comunicación MQTT
import time                      
import json                      
import random                    
import sys                       # Para acceder a los argumentos de línea de comandos

# Parámetros de conexión al broker MQTT
broker = "localhost"
port = 1883                      

# Validar que se ha proporcionado el nombre del dispositivo como argumento
if len(sys.argv) < 2:
    print("Debe proporcionar el nombre como argumento. Uso: python simulador_reloj.py <nombre_dispositivo>")
    sys.exit(1)

# Obtener el nombre del dispositivo desde los argumentos y configurar el tópico
nombre_dispositivo = sys.argv[1]
topic = f"dispositivos/{nombre_dispositivo}/ritmo_cardiaco"

# Callback que se ejecuta cuando el cliente se conecta al broker
def on_connect(client, userdata, flags, rc):
    """
    Función de callback para la conexión al broker MQTT
    - rc=0: Conexión exitosa
    - Otros valores de rc indican diferentes errores de conexión
    """
    if rc == 0:
        print("Conectado exitosamente al broker MQTT")
    else:
        print(f"Error de conexión. Código de retorno: {rc}")

# Función para generar datos simulados de ritmo cardíaco
def generar_ritmo_cardiaco():
    """
    Genera un valor aleatorio entre 30 y 130 bpm
    Valores típicos de ritmo cardíaco en reposo: 60-100 bpm
    Valores bajos (<60) pueden indicar bradicardia
    Valores altos (>100) pueden indicar taquicardia
    """
    return random.randint(30, 130)

# Función para construir el mensaje en formato JSON con todos los campos necesarios
def construir_mensaje(dispositivo, ritmo):
    """
    Crea un mensaje estructurado en formato JSON con:
    - Identificador del dispositivo
    - Valor del ritmo cardíaco
    - Unidad de medida (bpm = beats per minute)
    - Timestamp actual en formato UNIX (segundos desde 1/1/1970)
    """
    return json.dumps({
        "dispositivo": dispositivo,
        "ritmo_cardiaco": ritmo,
        "unidad": "bpm",
        "timestamp": int(time.time())
    })

# Inicializar el cliente MQTT
client = mqtt.Client()
client.on_connect = on_connect  # Asignar la función de callback para conexión

# Conectar al broker MQTT
client.connect(broker, port, 60)  # El tercer parámetro (60) es el tiempo de keep-alive en segundos
client.loop_start()  # Inicia el bucle de procesamiento de red en un hilo separado

try:
    # Bucle principal de generación y envío de datos
    while True:
        ritmo = generar_ritmo_cardiaco()  # Generar dato simulado
        mensaje = construir_mensaje(nombre_dispositivo, ritmo)  # Formatear el mensaje
        client.publish(topic, mensaje)  # Publicar el mensaje en el tópico correspondiente "dispositivos/{nombre_dispositivo}/ritmo_cardiaco"
        print(f"Mensaje enviado a '{topic}': {mensaje}")
        time.sleep(5)  # Enviar datos cada 5 segundos

except KeyboardInterrupt:
    # Manejo de la interrupción del usuario (Ctrl+C)
    print("Deteniendo el envío de datos...")

finally:
    # Limpiar recursos al finalizar
    client.loop_stop()  # Detener el bucle de procesamiento de red
    client.disconnect()  # Desconectar del broker MQTT
