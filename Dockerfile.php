# Dockerfile.php
FROM php:8.2-cli

# Instala las extensiones necesarias de PHP:
# - mysqli: para conectarse a MySQL usando el estilo procedimental/orientado a objetos
# - pdo: habilita la interfaz PDO (PHP Data Objects)
# - pdo_mysql: permite usar PDO con bases de datos MySQL
RUN docker-php-ext-install mysqli pdo pdo_mysql

# Establece el directorio de trabajo dentro del contenedor
# A partir de aquí, todas las rutas relativas se interpretarán desde /var/www/html
WORKDIR /var/www/html

# Copia todo el contenido de la carpeta local "API_RitmoCardiaco"
# al directorio /var/www/html del contenedor
COPY ./API_RitmoCardiaco /var/www/html

# Define el comando por defecto que se ejecutará al iniciar el contenedor
# Lanza un servidor embebido de PHP accesible desde cualquier IP (0.0.0.0) en el puerto 5000
# y usa /var/www/html como raíz del servidor
CMD ["php", "-S", "0.0.0.0:5000", "-t", "/var/www/html"]

