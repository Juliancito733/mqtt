USE basedatos_api;
CREATE TABLE datos_relojes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reloj_id VARCHAR(50) NOT NULL,
    ritmo_cardiaco INT NOT NULL,
    unidad VARCHAR(10) DEFAULT 'bpm',
    timestamp BIGINT NOT NULL
);
