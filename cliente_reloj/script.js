/**
 * CLIENTE WEB PARA MONITOREO DE DISPOSITIVOS DE RITMO CARDÍACO
 * ============================================================
 * 
 * Este archivo implementa un cliente web que se conecta a un broker MQTT
 * para recibir y enviar datos de dispositivos de monitoreo cardíaco.
 * 
 * Funcionalidades principales:
 * - Conexión a broker MQTT vía WebSockets
 * - Selección de dispositivos dinámicamente
 * - Visualización de ritmo cardíaco en tiempo real
 * - Recepción y respuesta a alertas médicas
 * - Interfaz de usuario con dos vistas: ritmo y mensajes
 */

// ===========================================
// REFERENCIAS A ELEMENTOS DEL DOM
// ===========================================

// Elemento donde se muestra el valor actual del ritmo cardíaco
// Actualizado en tiempo real cuando llegan datos del dispositivo seleccionado
const ritmoCardiacoEl = document.getElementById('ritmoCardiaco');

// Contenedor para mostrar todos los datos JSON del dispositivo
// Incluye información detallada como timestamp, batería, etc.
const datosDispositivoEl = document.getElementById('datosDispositivo');

// Select dropdown para elegir entre los dispositivos disponibles
// Se puebla dinámicamente conforme se detectan nuevos dispositivos
const dispositivoSelect = document.getElementById("dispositivoSelect");

// Vista principal que muestra datos de ritmo cardíaco
// Se alterna con vistaMensajes usando los botones de navegación
const vistaRitmo = document.getElementById("vistaRitmo");

// Vista para el sistema de mensajería y alertas
// Permite ver alertas recibidas y enviar respuestas
const vistaMensajes = document.getElementById("vistaMensajes");

// Contenedor donde se muestran los mensajes/alertas recibidos
// Se limpia automáticamente al recibir nuevos mensajes
const mensajesRecibidos = document.getElementById("mensajesRecibidos");

// Campo de texto donde el usuario escribe la respuesta a las alertas
// Se limpia automáticamente después de enviar
const mensajeInput = document.getElementById("mensajeRespuesta");

// Botón para enviar respuestas a las alertas
// Se habilita/deshabilita según el estado del sistema
const btnEnviarMensaje = document.getElementById("btnEnviarRespuesta");

//Botón de navegación para cambiar a la vista de ritmo cardíaco
const btnVerRitmo = document.getElementById("btnRitmo");

// Botón de navegación para cambiar a la vista de mensajes
const btnVerMensajes = document.getElementById("btnMensajes");


// ===========================================
// VARIABLES DE ESTADO GLOBAL
// ===========================================

// Set que almacena los nombres únicos de dispositivos detectados
const nombresDispositivos = new Set();

// Nombre del dispositivo actualmente seleccionado por el usuario
let nombreDispositivoSeleccionado = "";

/**
 * Último valor de ritmo cardíaco recibido
 * Se mantiene para referencia incluso si no hay datos nuevos
 */
let ultimoRitmo = 0;

/**
 * Bandera que indica si hay un mensaje nuevo sin responder
 * Controla si el botón de envío está habilitado
 */
let hayMensajeNuevo = false;

// Estado inicial: botón de envío deshabilitado hasta que llegue una alerta
btnEnviarMensaje.disabled = true;

// ===========================================
// FUNCIONES AUXILIARES
// ===========================================

/**
 * Actualiza el display visual del ritmo cardíaco
 * @param ritmo Valor del ritmo cardíaco a mostrar
 */
function mostrarRitmo(ritmo) {
    ritmoCardiacoEl.textContent = ritmo;
}

/**
 * Añade un nuevo dispositivo al select dropdown
 * Solo se llama cuando se detecta un dispositivo por primera vez
 * @param {string} nombre Nombre identificador del dispositivo
 */
function agregarDispositivoAlSelect(nombre) {
    const optionElement = document.createElement("option");
    optionElement.value = nombre;
    optionElement.textContent = nombre;
    dispositivoSelect.appendChild(optionElement);
}

// ===========================================
// MANEJADORES DE EVENTOS DE UI
// ===========================================

/**
 * Manejador del cambio de selección de dispositivo
 * Se ejecuta cuando el usuario selecciona un dispositivo diferente
 */
dispositivoSelect.addEventListener("change", function () {
    nombreDispositivoSeleccionado = this.value;
    
    if (!nombreDispositivoSeleccionado) {
        // No hay dispositivo seleccionado - mostrar estado de espera
        datosDispositivoEl.textContent = "Esperando selección...";
        mostrarRitmo("--");
    } else {
        // Dispositivo seleccionado - limpiar datos y esperar nuevos
        mostrarRitmo("--");
        datosDispositivoEl.textContent = "Esperando datos del dispositivo...";
    }
});

/**
 * Manejador para cambiar a la vista de ritmo cardíaco
 * Oculta la vista de mensajes y muestra la de ritmo
 */
btnVerRitmo.addEventListener("click", () => {
    vistaRitmo.style.display = "flex";
    vistaMensajes.style.display = "none";
});

/**
 * Manejador para cambiar a la vista de mensajes
 * Oculta la vista de ritmo y muestra la de mensajes
 */
btnVerMensajes.addEventListener("click", () => {
    vistaRitmo.style.display = "none";
    vistaMensajes.style.display = "flex";
});

// ===========================================
// CONFIGURACIÓN Y CONEXIÓN MQTT
// ===========================================

/**
 * Cliente MQTT usando la librería Paho
 * Se conecta al broker local en puerto 80 usando WebSockets
 * ID único generado aleatoriamente para evitar conflictos
 */
const client = new Paho.MQTT.Client("localhost", 80, "webClient-" + Math.random());

// Callback ejecutado cuando se pierde la conexión con el broker MQTT
client.onConnectionLost = function (responseObject) {
    if (responseObject.errorCode !== 0) {
        console.log("Conexión perdida: ", responseObject.errorMessage);
    }
};

/**
 * Callback principal ejecutado cuando llega un mensaje MQTT
 * Maneja todos los tipos de mensajes: ritmo cardíaco y alertas
 * @param {Object} message - Mensaje MQTT recibido
 */
client.onMessageArrived = function (message) {
    try {
        // Extraer información del topic y payload
        const topic = message.destinationName;
        const payload = JSON.parse(message.payloadString);
        
        // El topic tiene formato: dispositivos/{nombre_dispositivo}/{tipo_datos}
        const partesTopic = topic.split("/");
        const nombreDispositivo = partesTopic[1];

        // Registro automático de nuevos dispositivos
        if (!nombresDispositivos.has(nombreDispositivo)) {
            nombresDispositivos.add(nombreDispositivo);
            agregarDispositivoAlSelect(nombreDispositivo);
        }

        // Procesar mensaje solo si es del dispositivo seleccionado
        if (nombreDispositivo === nombreDispositivoSeleccionado) {
            
            if (topic.endsWith("/ritmo_cardiaco")) {
                // ============================================
                // PROCESAMIENTO DE DATOS DE RITMO CARDÍACO
                // ============================================
                
                ultimoRitmo = payload.ritmo_cardiaco;
                mostrarRitmo(ultimoRitmo);
                
                // Mostrar todos los datos del dispositivo (JSON formateado)
                datosDispositivoEl.textContent = JSON.stringify(payload, null, 2);
                
            } else if (topic.endsWith("/alertas")) {
                // ============================================
                // PROCESAMIENTO DE ALERTAS MÉDICAS
                // ============================================
                
                // Limpiar mensajes anteriores para mostrar solo el nuevo
                mensajesRecibidos.innerHTML = "";

                // Crear y mostrar el nuevo mensaje de alerta
                const msg = document.createElement("div");
                msg.textContent = payload.mensaje || JSON.stringify(payload);
                mensajesRecibidos.appendChild(msg);
                
                // Auto-scroll al final para mostrar el mensaje más reciente
                mensajesRecibidos.scrollTop = mensajesRecibidos.scrollHeight;

                // Habilitar el sistema de respuesta
                hayMensajeNuevo = true;
                btnEnviarMensaje.disabled = false;
            }
        }
    } catch (err) {
        // Manejo de errores en procesamiento de mensajes
        console.error("Error procesando mensaje:", err);
    }
};

// ===========================================
// SISTEMA DE RESPUESTA A ALERTAS
// ===========================================

/**
 * Manejador para envío de respuestas a alertas médicas
 * Solo funciona si hay un mensaje nuevo y un dispositivo seleccionado
 */
btnEnviarMensaje.addEventListener("click", () => {
    const texto = mensajeInput.value.trim();
    
    // Verificar que todas las condiciones están cumplidas
    if (texto && nombreDispositivoSeleccionado && hayMensajeNuevo) {
        
        // ============================================
        // ENVÍO DEL MENSAJE DE RESPUESTA
        // ============================================
        
        // Crear mensaje MQTT con la respuesta del usuario
        const mensaje = new Paho.MQTT.Message(JSON.stringify({ mensaje: texto }));
        mensaje.destinationName = `dispositivos/${nombreDispositivoSeleccionado}/mensajes`;
        client.send(mensaje);

        // Limpiar interfaz después del envío
        mensajeInput.value = "";
        mensajesRecibidos.innerHTML = "";

        // ============================================
        // RETROALIMENTACIÓN VISUAL
        // ============================================
        
        // Mostrar confirmación temporal de envío exitoso
        const feedback = document.createElement("div");
        feedback.textContent = "Mensaje enviado";
        feedback.style.color = "#0f0";
        feedback.style.marginTop = "0.5em";
        feedback.style.fontSize = "0.9em";

        mensajesRecibidos.appendChild(feedback);
        mensajesRecibidos.scrollTop = mensajesRecibidos.scrollHeight;

        // Remover retroalimentación después de 2.5 segundos
        setTimeout(() => {
            mensajesRecibidos.removeChild(feedback);
        }, 2500);

        // ============================================
        // RESETEO DEL ESTADO
        // ============================================
        
        // Desactivar botón hasta que llegue una nueva alerta
        // Esto previene respuestas múltiples al mismo mensaje
        hayMensajeNuevo = false;
        btnEnviarMensaje.disabled = true;
    }
});

// ===========================================
// INICIALIZACIÓN DE CONEXIÓN MQTT
// ===========================================


// Establecer conexión con el broker MQTT
client.connect({
    /**
     * Callback ejecutado cuando la conexión es exitosa
     * Suscribe automáticamente a los topics
     */
    onSuccess: function () {
        console.log("Conectado al broker MQTT");
        
        // Suscribirse a datos de ritmo cardíaco de todos los dispositivos
        client.subscribe("dispositivos/+/ritmo_cardiaco");
        
        // Suscribirse a alertas de todos los dispositivos
        client.subscribe("dispositivos/+/alertas");
    },

    /**
     * Callback ejecutado cuando falla la conexión
     * @param {Object} e - Objeto con información del error
     */
    onFailure: function (e) {
        console.error("Fallo al conectar:", e.errorMessage);
    }
});
