const ritmoCardiacoEl = document.getElementById('ritmoCardiaco');
const datosDispositivoEl = document.getElementById('datosDispositivo');
const dispositivoSelect = document.getElementById("dispositivoSelect");
const vistaRitmo = document.getElementById("vistaRitmo");
const vistaMensajes = document.getElementById("vistaMensajes");
const mensajesRecibidos = document.getElementById("mensajesRecibidos");
const mensajeInput = document.getElementById("mensajeRespuesta");
const enviarMensajeBtn = document.getElementById("btnEnviarRespuesta");
const btnVerRitmo = document.getElementById("btnRitmo");
const btnVerMensajes = document.getElementById("btnMensajes");

const dispositivos = new Set();
let dispositivoSeleccionado = "";
let ultimoRitmo = 0;
let hayMensajeNuevo = false;

enviarMensajeBtn.disabled = true; // Deshabilitado por defecto

function mostrarRitmo(ritmo) {
    ritmoCardiacoEl.textContent = ritmo;
}

function agregarDispositivoAlSelect(nombre) {
    const option = document.createElement("option");
    option.value = nombre;
    option.textContent = nombre;
    dispositivoSelect.appendChild(option);
}

dispositivoSelect.addEventListener("change", function () {
    dispositivoSeleccionado = this.value;
    if (!dispositivoSeleccionado) {
        datosDispositivoEl.textContent = "Esperando selección...";
        mostrarRitmo("--");
    } else {
        mostrarRitmo("--");
        datosDispositivoEl.textContent = "Esperando datos del dispositivo...";
    }
});

// Cambiar vistas
btnVerRitmo.addEventListener("click", () => {
    vistaRitmo.style.display = "flex";
    vistaMensajes.style.display = "none";
});

btnVerMensajes.addEventListener("click", () => {
    vistaRitmo.style.display = "none";
    vistaMensajes.style.display = "flex";
});

const client = new Paho.MQTT.Client("localhost", 80, "webClient-" + Math.random());

client.onConnectionLost = function (responseObject) {
    if (responseObject.errorCode !== 0) {
        console.log("Conexión perdida:", responseObject.errorMessage);
    }
};

client.onMessageArrived = function (message) {
    try {
        const topic = message.destinationName;
        const payload = JSON.parse(message.payloadString);
        const partes = topic.split("/");
        const dispositivo = partes[1];

        if (!dispositivos.has(dispositivo)) {
            dispositivos.add(dispositivo);
            agregarDispositivoAlSelect(dispositivo);
        }

        if (dispositivo === dispositivoSeleccionado) {
            if (topic.endsWith("/ritmo_cardiaco")) {
                ultimoRitmo = payload.ritmo_cardiaco;
                mostrarRitmo(ultimoRitmo);
                datosDispositivoEl.textContent = JSON.stringify(payload, null, 2);
            } else if (topic.endsWith("/alertas")) {
                // Limpiar mensajes anteriores
                mensajesRecibidos.innerHTML = "";

                // Mostrar solo el mensaje nuevo
                const msg = document.createElement("div");
                msg.textContent = payload.mensaje || JSON.stringify(payload);
                mensajesRecibidos.appendChild(msg);
                mensajesRecibidos.scrollTop = mensajesRecibidos.scrollHeight;

                // Habilitar botón para responder
                hayMensajeNuevo = true;
                enviarMensajeBtn.disabled = false;
            }
        }
    } catch (err) {
        console.error("Error procesando mensaje:", err);
    }
};

enviarMensajeBtn.addEventListener("click", () => {
    const texto = mensajeInput.value.trim();
    if (texto && dispositivoSeleccionado && hayMensajeNuevo) {
        const mensaje = new Paho.MQTT.Message(JSON.stringify({ mensaje: texto }));
        mensaje.destinationName = `dispositivos/${dispositivoSeleccionado}/mensajes`;
        client.send(mensaje);

        mensajeInput.value = ""; // Limpiar textarea
        mensajesRecibidos.innerHTML = ""; // Limpiar pantalla

        // Mostrar retroalimentación visual
        const feedback = document.createElement("div");
        feedback.textContent = "Mensaje enviado";
        feedback.style.color = "#0f0";
        feedback.style.marginTop = "0.5em";
        feedback.style.fontSize = "0.9em";

        mensajesRecibidos.appendChild(feedback);
        mensajesRecibidos.scrollTop = mensajesRecibidos.scrollHeight;

        setTimeout(() => {
            mensajesRecibidos.removeChild(feedback);
        }, 2500);

        // Desactivar botón hasta que llegue un nuevo mensaje
        hayMensajeNuevo = false;
        enviarMensajeBtn.disabled = true;
    }
});

client.connect({
    onSuccess: function () {
        console.log("Conectado al broker MQTT");
        client.subscribe("dispositivos/+/ritmo_cardiaco");
        client.subscribe("dispositivos/+/alertas");
    },
    onFailure: function (e) {
        console.error("Fallo al conectar:", e.errorMessage);
    }
});
