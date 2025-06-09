# Dockerfile.php
FROM php:8.2-cli

# Instalar extensiones necesarias
RUN docker-php-ext-install mysqli pdo pdo_mysql

# Copiar tu código al contenedor
WORKDIR /var/www/html
COPY ./API_RitmoCardiaco /var/www/html

# Comando por defecto
CMD ["php", "-S", "0.0.0.0:5000", "-t", "/var/www/html"]
