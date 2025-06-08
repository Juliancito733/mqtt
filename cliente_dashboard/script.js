/**
 * Script principal del Dashboard para monitoreo de dispositivos MQTT
 * 
 * Este dashboard actúa como SUSCRIPTOR en la arquitectura MQTT del proyecto:
 * - Recibe datos de ritmo cardíaco publicados por el simulador_reloj.py
 * - Visualiza los datos en tiempo real mediante gráficos
 * - Permite enviar alertas al cliente_reloj cuando se detectan anomalías
 * 
 * La comunicación entre los componentes se realiza mediante el protocolo MQTT
 * usando una estructura de tópicos basada en el nombre del dispositivo.
 */

// ============================================================================
// CONFIGURACIÓN INICIAL Y VARIABLES GLOBALES
// ============================================================================

// Configuración del cliente MQTT
const client = new Paho.MQTT.Client("localhost", 80, "webClient-" + Math.random());
const dispositivos = new Set(); // Conjunto para almacenar los dispositivos detectados
const wildcardTopic = "dispositivos/+/ritmo_cardiaco"; // Tópico con comodín para detectar cualquier dispositivo
let dispositivoSeleccionado = "";
let topicActual = wildcardTopic;
let alertHistory = [];

// Variables para gráficos y estadísticas
let heartRateChart = null;
let distributionChart = null;
let hourlyChart = null;
let heartRateData = [];
let maxDataPoints = 50; // Límite de puntos en el gráfico para mejor rendimiento
let stats = {
    current: 0,
    min: Infinity,
    max: 0,
    avg: 0,
    total: 0,
    count: 0,
    normal: 0,
    warning: 0,
    danger: 0,
    hourlyData: new Array(24).fill(0),
    hourlyCounts: new Array(24).fill(0)
};

// ============================================================================
// INICIALIZACIÓN DE COMPONENTES
// ============================================================================

// Inicializar componentes de Materialize CSS cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', function() {
    M.FormSelect.init(document.querySelectorAll('select'));
    M.Modal.init(document.querySelectorAll('.modal'));
    M.updateTextFields();
});

// ============================================================================
// CONFIGURACIÓN Y MANEJO DE CONEXIÓN MQTT
// ============================================================================

/**
 * Callback ejecutado cuando se pierde la conexión con el broker MQTT
 */
client.onConnectionLost = function(responseObject) {
    if (responseObject.errorCode !== 0) {
        console.log("Conexión perdida:", responseObject.errorMessage);
        updateStatus("Conexión perdida", 'error');
    }
};

/**
 * Callback ejecutado cuando llega un mensaje desde el broker MQTT
 * Procesa los datos de ritmo cardíaco recibidos y actualiza la interfaz
 */
client.onMessageArrived = function(message) {
    try {
        const topic = message.destinationName;
        const payload = JSON.parse(message.payloadString);
        const partes = topic.split("/");
        const dispositivo = partes[1];

        // Registrar el dispositivo si es nuevo
        if (!dispositivos.has(dispositivo)) {
            dispositivos.add(dispositivo);
            agregarDispositivoAlSelect(dispositivo);
        }

        // Procesar los datos solo si corresponden al dispositivo seleccionado
        if (dispositivoSeleccionado && dispositivo === dispositivoSeleccionado) {
            const evaluacion = evaluarRitmoCardiaco(payload.ritmo_cardiaco);
            actualizarTabla(dispositivo, payload.ritmo_cardiaco, payload.timestamp, evaluacion);
            updateCharts(payload.ritmo_cardiaco, evaluacion);
            
            // Mostrar alerta si el ritmo cardíaco es peligroso
            if (evaluacion.peligroso) {
                mostrarAlerta(dispositivo, payload.ritmo_cardiaco, evaluacion);
            }
        }
    } catch (err) {
        console.error("Error procesando mensaje:", err);
    }
};

/**
 * Cambia la suscripción MQTT actual a un nuevo tópico
 * @param {string} nuevoTopic - Nuevo tópico al que suscribirse
 */
function cambiarSuscripcion(nuevoTopic) {
    if (topicActual) {
        client.unsubscribe(topicActual);
        console.log(`Desuscrito de: ${topicActual}`);
    }
    
    client.subscribe(nuevoTopic);
    topicActual = nuevoTopic;
    console.log(`Suscrito a: ${nuevoTopic}`);
    updateStatus(`Escuchando: ${nuevoTopic}`, 'success');
}

/**
 * Envía un mensaje al dispositivo mediante MQTT
 * Actúa como PUBLICADOR en el tópico de alertas del dispositivo
 * @param {string} dispositivo - Nombre del dispositivo destinatario
 * @param {string} mensaje - Contenido del mensaje a enviar
 */
function enviarMensajeDispositivo(dispositivo, mensaje) {
    const topic = `dispositivos/${dispositivo}/alertas`;
    const payload = {
        tipo: 'alerta_medica',
        mensaje: mensaje,
        timestamp: Math.floor(Date.now() / 1000),
        prioridad: 'alta'
    };
    
    const message = new Paho.MQTT.Message(JSON.stringify(payload));
    message.destinationName = topic;
    client.send(message);
    
    showToast(`Mensaje enviado a ${dispositivo}`, 'success');
    console.log(`Mensaje enviado a ${topic}:`, payload);
}

// ============================================================================
// FUNCIONES DE GRÁFICOS Y VISUALIZACIÓN
// ============================================================================

/**
 * Inicializa los tres gráficos principales del dashboard:
 * 1. Gráfico de línea en tiempo real del ritmo cardíaco
 * 2. Gráfico circular de distribución por zonas (normal, elevado, peligroso)
 * 3. Gráfico de barras con promedios por hora del día
 */
function initializeCharts() {
    // Gráfico principal de tiempo real
    const ctx1 = document.getElementById('heartRateChart').getContext('2d');
    heartRateChart = new Chart(ctx1, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Ritmo Cardíaco (BPM)',
                data: [],
                borderColor: '#f44336',
                backgroundColor: 'rgba(244, 67, 54, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            scales: {
                y: {
                    beginAtZero: false,
                    min: 20,
                    max: 160,
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    },
                    ticks: {
                        callback: function(value) {
                            return value + ' BPM';
                        }
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y} BPM`;
                        }
                    }
                }
            },
            animation: {
                duration: 500
            }
        }
    });

    // Gráfico de distribución por zonas
    const ctx2 = document.getElementById('distributionChart').getContext('2d');
    distributionChart = new Chart(ctx2, {
        type: 'doughnut',
        data: {
            labels: ['Normal', 'Elevado', 'Peligroso'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: [
                    '#4caf50',
                    '#ff9800',
                    '#f44336'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? Math.round((context.parsed / total) * 100) : 0;
                            return `${context.label}: ${context.parsed} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });

    // Gráfico de tendencia horaria
    const ctx3 = document.getElementById('hourlyChart').getContext('2d');
    hourlyChart = new Chart(ctx3, {
        type: 'bar',
        data: {
            labels: Array.from({length: 24}, (_, i) => `${i}:00`),
            datasets: [{
                label: 'BPM Promedio',
                data: new Array(24).fill(0),
                backgroundColor: 'rgba(33, 150, 243, 0.6)',
                borderColor: '#2196f3',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 180,
                    ticks: {
                        callback: function(value) {
                            return value + ' BPM';
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Promedio: ${context.parsed.y.toFixed(1)} BPM`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Actualiza los gráficos con nuevos datos de ritmo cardíaco
 * @param {number} bpm - Valor del ritmo cardíaco en BPM
 * @param {object} evaluacion - Objeto con información sobre la evaluación del ritmo cardíaco
 */
function updateCharts(bpm, evaluacion) {
    const now = new Date();
    const timeLabel = now.toLocaleTimeString();
    const hour = now.getHours();

    // Actualizar datos del gráfico principal
    heartRateData.push({
        time: timeLabel,
        bpm: bpm,
        timestamp: now
    });

    // Mantener solo los últimos maxDataPoints para mejor rendimiento
    if (heartRateData.length > maxDataPoints) {
        heartRateData.shift();
    }

    // Actualizar gráfico de tiempo real
    heartRateChart.data.labels = heartRateData.map(d => d.time);
    heartRateChart.data.datasets[0].data = heartRateData.map(d => d.bpm);
    heartRateChart.update('none'); // Actualizar sin animación para mejor rendimiento

    // Actualizar estadísticas generales
    stats.current = bpm;
    stats.count++;
    stats.total += bpm;
    stats.avg = stats.total / stats.count;
    stats.min = Math.min(stats.min, bpm);
    stats.max = Math.max(stats.max, bpm);

    // Actualizar contadores por zona de ritmo cardíaco
    if (evaluacion.clase === 'normal-zone') stats.normal++;
    else if (evaluacion.clase === 'warning-zone') stats.warning++;
    else if (evaluacion.clase === 'danger-zone') stats.danger++;

    // Actualizar datos horarios para tendencias
    stats.hourlyData[hour] = ((stats.hourlyData[hour] * stats.hourlyCounts[hour]) + bpm) / (stats.hourlyCounts[hour] + 1);
    stats.hourlyCounts[hour]++;

    // Actualizar gráfico de distribución
    distributionChart.data.datasets[0].data = [stats.normal, stats.warning, stats.danger];
    distributionChart.update('none');

    // Actualizar gráfico horario
    hourlyChart.data.datasets[0].data = stats.hourlyData.map(val => val || 0);
    hourlyChart.update('none');

    // Actualizar estadísticas en la UI
    updateStatsDisplay();
}

// ============================================================================
// FUNCIONES DE ESTADÍSTICAS
// ============================================================================

/**
 * Actualiza los elementos de la interfaz con las estadísticas actuales
 */
function updateStatsDisplay() {
    document.getElementById('currentBPM').textContent = stats.current;
    document.getElementById('avgBPM').textContent = stats.avg.toFixed(0);
    document.getElementById('maxBPM').textContent = stats.max === 0 ? '--' : stats.max;
    document.getElementById('minBPM').textContent = stats.min === Infinity ? '--' : stats.min;
}

/**
 * Reinicia todas las estadísticas y gráficos a su estado inicial
 * Se utiliza al cambiar de dispositivo
 */
function resetStats() {
    stats = {
        current: 0,
        min: Infinity,
        max: 0,
        avg: 0,
        total: 0,
        count: 0,
        normal: 0,
        warning: 0,
        danger: 0,
        hourlyData: new Array(24).fill(0),
        hourlyCounts: new Array(24).fill(0)
    };
    heartRateData = [];
    updateStatsDisplay();
    
    if (heartRateChart) {
        heartRateChart.data.labels = [];
        heartRateChart.data.datasets[0].data = [];
        heartRateChart.update();
    }
    
    if (distributionChart) {
        distributionChart.data.datasets[0].data = [0, 0, 0];
        distributionChart.update();
    }
    
    if (hourlyChart) {
        hourlyChart.data.datasets[0].data = new Array(24).fill(0);
        hourlyChart.update();
    }
}

// ============================================================================
// FUNCIONES DE EVALUACIÓN Y ALERTAS
// ============================================================================

/**
 * Evalúa el estado del ritmo cardíaco y determina si es peligroso
 * @param {number} bpm - Valor del ritmo cardíaco en BPM
 * @returns {object} - Objeto con información sobre el estado (normal, elevado, peligroso)
 */
function evaluarRitmoCardiaco(bpm) {
    const limite = parseInt(document.getElementById('limiteAlerta').value) || 100;
    
    if (bpm < 60) {
        return { estado: 'Bradicardia', clase: 'danger-zone', peligroso: true };
    } else if (bpm > limite) {
        return { estado: 'Taquicardia', clase: 'danger-zone', peligroso: true };
    } else if (bpm > limite - 20) {
        return { estado: 'Elevado', clase: 'warning-zone', peligroso: false };
    } else {
        return { estado: 'Normal', clase: 'normal-zone', peligroso: false };
    }
}

/**
 * Muestra un modal de alerta cuando se detecta un ritmo cardíaco peligroso
 * @param {string} dispositivo - Nombre del dispositivo
 * @param {number} bpm - Valor del ritmo cardíaco
 * @param {object} evaluacion - Resultado de la evaluación del ritmo cardíaco
 */
function mostrarAlerta(dispositivo, bpm, evaluacion) {
    const alertModal = M.Modal.getInstance(document.getElementById('alertModal'));
    const alertMessage = document.getElementById('alertMessage');
    
    alertMessage.innerHTML = `
        <strong>Dispositivo:</strong> ${dispositivo}<br>
        <strong>BPM:</strong> <span class="${evaluacion.clase}">${bpm}</span><br>
        <strong>Estado:</strong> <span class="${evaluacion.clase}">${evaluacion.estado}</span><br>
        <strong>Hora:</strong> ${new Date().toLocaleString()}
    `;
    
    // Pre-llenar mensaje de emergencia para enviar al dispositivo
    document.getElementById('mensajeEmergencia').value = 
        `ALERTA: ${evaluacion.estado} detectada. BPM: ${bpm}. Revisar paciente inmediatamente.`;
    M.updateTextFields();
    
    alertModal.open();
    
    // Agregar al historial de alertas
    agregarAlHistorial(dispositivo, bpm, evaluacion.estado);
    
    // Reproducir sonido de alerta
    playAlertSound();
}

/**
 * Agrega una alerta al historial visible en la interfaz
 * @param {string} dispositivo - Nombre del dispositivo
 * @param {number} bpm - Valor del ritmo cardíaco
 * @param {string} estado - Estado evaluado (Normal, Elevado, etc.)
 */
function agregarAlHistorial(dispositivo, bpm, estado) {
    const alert = {
        dispositivo,
        bpm,
        estado,
        timestamp: new Date().toLocaleString()
    };
    
    alertHistory.unshift(alert);
    
    const historyContainer = document.getElementById('alertHistory');
    if (alertHistory.length === 1) {
        historyContainer.innerHTML = '';
    }
    
    const alertElement = document.createElement('div');
    alertElement.className = 'card-panel red lighten-4';
    alertElement.innerHTML = `
        <span class="red-text">
            <i class="material-icons left">warning</i>
            <strong>${dispositivo}</strong> - ${bpm} BPM (${estado}) - ${alert.timestamp}
        </span>
    `;
    
    historyContainer.insertBefore(alertElement, historyContainer.firstChild);
    
    // Limitar historial a 10 elementos para mejor rendimiento
    if (alertHistory.length > 10) {
        alertHistory = alertHistory.slice(0, 10);
        if (historyContainer.children.length > 10) {
            historyContainer.removeChild(historyContainer.lastChild);
        }
    }
}

/**
 * Reproduce un sonido de alerta para llamar la atención del operador
 * Genera tres pitidos cortos usando la Web Audio API
 */
function playAlertSound() {
    // Crear un beep de alerta simple
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    for (let i = 0; i < 3; i++) {
        setTimeout(() => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        }, i * 300);
    }
}

// ============================================================================
// FUNCIONES DE INTERFAZ DE USUARIO
// ============================================================================

/**
 * Actualiza el elemento de estado en la interfaz
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de mensaje (info, error, success)
 */
function updateStatus(message, type = 'info') {
    const statusElement = document.getElementById("statusInfo");
    const icon = type === 'error' ? 'error' : type === 'success' ? 'check_circle' : 'info';
    const color = type === 'error' ? 'red-text' : type === 'success' ? 'green-text' : 'blue-text';
    statusElement.innerHTML = `<i class="material-icons left ${color}">${icon}</i>${message}`;
}

/**
 * Muestra una notificación toast en la parte inferior de la pantalla
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de notificación (info, error, success, warning)
 */
function showToast(message, type = 'info') {
    const classes = type === 'error' ? 'red' : type === 'success' ? 'green' : type === 'warning' ? 'orange' : 'blue';
    M.toast({html: message, classes: classes});
}

/**
 * Agrega un nuevo dispositivo detectado al selector desplegable
 * @param {string} nombre - Nombre del dispositivo a agregar
 */
function agregarDispositivoAlSelect(nombre) {
    const select = document.getElementById("dispositivoSelect");
    const option = document.createElement("option");
    option.value = nombre;
    option.textContent = nombre;
    select.appendChild(option);
    M.FormSelect.init(select); // Reinicializar el componente select de Materialize
}

/**
 * Actualiza la tabla de datos con la información más reciente del dispositivo
 * @param {string} dispositivo - Nombre del dispositivo
 * @param {number} ritmo - Valor del ritmo cardíaco
 * @param {number} timestamp - Marca de tiempo Unix
 * @param {object} evaluacion - Resultado de la evaluación del ritmo cardíaco
 */
function actualizarTabla(dispositivo, ritmo, timestamp, evaluacion) {
    const tbody = document.getElementById("tablaDatos");
    const heartRateCard = document.getElementById("heartRateCard");
    
    // Cambiar color de la tarjeta según el estado (rojo para alertas)
    heartRateCard.className = `card heart-rate-card ${evaluacion.peligroso ? 'alert-card red lighten-4' : ''}`;
    
    tbody.innerHTML = `
        <tr>
            <td>${dispositivo}</td>
            <td class="${evaluacion.clase}">${ritmo}</td>
            <td><span class="chip ${evaluacion.clase.replace('-zone', '')}">${evaluacion.estado}</span></td>
            <td>${new Date(timestamp * 1000).toLocaleString()}</td>
            <td>
                <button class="btn-small blue waves-effect waves-light" onclick="enviarMensajeManual('${dispositivo}')">
                    <i class="material-icons left">send</i>Mensaje
                </button>
            </td>
        </tr>
    `;
}

/**
 * Solicita al usuario un mensaje y lo envía al dispositivo seleccionado
 * @param {string} dispositivo - Nombre del dispositivo destinatario
 */
function enviarMensajeManual(dispositivo) {
    const mensaje = prompt(`Mensaje para ${dispositivo}:`);
    if (mensaje && mensaje.trim()) {
        enviarMensajeDispositivo(dispositivo, mensaje.trim());
    }
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

// Event listener para cambio de dispositivo seleccionado
document.getElementById("dispositivoSelect").addEventListener("change", function() {
    const nuevoDispositivo = this.value;

    if (nuevoDispositivo) {
        const nuevoTopic = `dispositivos/${nuevoDispositivo}/ritmo_cardiaco`;
        cambiarSuscripcion(nuevoTopic);
        dispositivoSeleccionado = nuevoDispositivo;
        document.getElementById("datosContainer").style.display = "block";
        
        // Resetear estadísticas y gráficos al cambiar dispositivo
        resetStats();
        
        const tbody = document.getElementById("tablaDatos");
        tbody.innerHTML = `<tr><td colspan="5">Esperando datos de ${nuevoDispositivo}...</td></tr>`;
        
        // Inicializar gráficos si no existen
        if (!heartRateChart) {
            setTimeout(initializeCharts, 100);
        }
    } else {
        cambiarSuscripcion(wildcardTopic);
        dispositivoSeleccionado = "";
        document.getElementById("datosContainer").style.display = "none";
    }
});

// Event listener para enviar mensaje de emergencia desde el modal de alerta
document.getElementById("enviarMensaje").addEventListener("click", function() {
    const mensaje = document.getElementById("mensajeEmergencia").value;
    if (mensaje && dispositivoSeleccionado) {
        enviarMensajeDispositivo(dispositivoSeleccionado, mensaje);
    }
});

// ============================================================================
// CONEXIÓN INICIAL
// ============================================================================

// Conectar al broker MQTT al cargar la página
client.connect({
    onSuccess: function() {
        console.log("Conectado al broker MQTT");
        updateStatus("Conectado - Descubriendo dispositivos...", 'success');
        client.subscribe(wildcardTopic);
        topicActual = wildcardTopic;
    },
    onFailure: function(e) {
        console.error("Fallo al conectar:", e.errorMessage);
        updateStatus("Error de conexión", 'error');
    }
});