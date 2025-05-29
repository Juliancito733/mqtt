# Proyecto Tecnologías Web

## Instrucciones

### 1. Construcción de la imagen Docker

- Ubícate en la raíz de la carpeta que clonaste.
- El archivo que nos interesa en este momento es el `Dockerfile`. Para construir la imagen necesitas ejecutar el siguiente comando con PowerShell:

```bash
docker build -t mosquitto:python .
```

Esto creará la imagen `mosquitto:python`. Lo puedes comprobar con el siguiente comando:

```bash
docker images
```

### ¿Qué tiene la imagen?

De forma resumida, tiene todo lo necesario para levantar el proyecto:

- Python
- Pip
- Paho para Python
- Editor nano para mayor comodidad para editar archivos rápidamente

### 2. Creación del contenedor

Una vez tengamos la imagen, crearemos el respectivo contenedor con el siguiente comando:

```bash
docker run -it -p 1883:1883 -p 80:9001 -v ${PWD}/simulador_reloj.py:/app/simulador_reloj.py mosquitto:python
```

Lo que hacemos es montar el archivo de Python en la carpeta `app/` además de exponer los puertos necesarios para la ejecución del proyecto.

### 3. Acceso al contenedor

Como el broker se ejecuta apenas se realiza el contenedor, recuerda que puedes acceder a él en otra terminal mediante los comandos:

```bash
docker ps -a
```
Nos servirá para saber el ID específico del contenedor que se acaba de crear.

```bash
docker exec -it id_contenedor sh
```
Permitirá acceder nuevamente al contenedor.

### 4. Navegación dentro del contenedor

Una vez dentro, podremos visualizar los archivos mediante el comando:

```bash
ls
```

Encontraremos la carpeta montada `app/`, accederemos a ella mediante:

```bash
cd app
```

Podremos encontrar el archivo de Python `simulador_reloj.py`.

### 5. Ejecución del simulador

Al ejecutar el script tendremos que pasarle el argumento. En este caso nos servirá para poder identificar cada ejecución de script y asignarle un nombre al reloj de simulación, así que tendrás que ejecutarlo de la siguiente manera:

```bash
python simulador_reloj.py nombre_del_reloj
```

`nombre_del_reloj` es el argumento, así que puedes ponerle el que tú quieras como:
- `reloj1`
- `apple_watch`
- `galaxy_watch`

> **Importante**: No pongas espacios en el nombre del reloj. Es necesario que recuerdes el nombre del reloj.

### 6. Múltiples relojes

Puedes repetir el paso desde `docker exec` para poder tener n número de relojes.

### 7. Visualización

Verás que empieza a mostrar información en formato JSON en la terminal. Para poder ver los clientes web, lo único que tienes que hacer es abrir el `index` de la carpeta `cliente_dashboard` para visualizar la información y las alertas. Ya está configurado con los puertos necesarios para websockets.

De igual forma, en la carpeta `cliente_reloj` podrás encontrar la interfaz para poder visualizar los mensajes de alerta que se envían desde el dashboard.

## Estructura de tópicos

Es importante tener en cuenta que los tópicos creados son **dinámicos**, es decir, dependerán totalmente del nombre del dispositivo que hayas asignado.

### Ejemplos:

Al ejecutar el Python genera el topic:
```
dispositivos/{dispositivo}/ritmo_cardiaco
```

El dashboard enviará las alertas a:
```
dispositivos/{dispositivo}/alertas
```

El reloj podrá responderlas a:
```
dispositivos/{dispositivo}/mensajes
```