document.addEventListener('DOMContentLoaded', function() {
    // Inicializar componentes de Materialize
    M.AutoInit();
    
    // Variables para los gráficos
    let dispositivosChart = null;
    let cronologiaChart = null;
    
    // Función para formatear timestamp a fecha legible
    function formatTimestamp(timestamp) {
        const date = new Date(timestamp * 1000);
        return date.toLocaleString();
    }
    
    // Función para detectar anomalías
    function detectAnomaly(valor) {
        if (valor > 120) return { type: 'high', message: 'Ritmo alto' };
        if (valor < 60) return { type: 'low', message: 'Ritmo bajo' };
        return null;
    }
    
    // Función para cargar los datos desde el endpoint
    async function loadData() {
        try {
            const response = await fetch('http://localhost:5000/api/ritmo');
            if (!response.ok) throw new Error('Error al cargar los datos');
            
            const data = await response.json();
            // Asumimos que el endpoint devuelve un array de registros
            // Si devuelve un solo objeto, lo convertimos a array
            const registros = Array.isArray(data) ? data : [data];
            
            // Procesar los datos
            processData(registros);
        } catch (error) {
            console.error('Error:', error);
            M.toast({html: 'Error al cargar los datos', classes: 'red'});
        }
    }
    
    // Función para procesar los datos y actualizar la UI
    function processData(registros) {
        // Ordenar por defecto por timestamp descendente
        registros.sort((a, b) => b.timestamp - a.timestamp);
        
        // Actualizar tabla
        updateTable(registros);
        
        // Calcular estadísticas
        calculateStats(registros);
        
        // Agrupar por dispositivo
        groupByDevice(registros);
        
        // Preparar datos para gráfico cronológico
        prepareTimeChart(registros);
    }
    
    // Función para actualizar la tabla
    function updateTable(registros) {
        const tbody = document.getElementById('registros-tbody');
        tbody.innerHTML = '';
        
        registros.forEach(registro => {
            const anomaly = detectAnomaly(registro.ritmo.valor);
            const row = document.createElement('tr');
            
            if (anomaly) {
                row.classList.add(anomaly.type === 'high' ? 'anomaly-high' : 'anomaly-low');
            }
            
            row.innerHTML = `
                <td>${registro.id}</td>
                <td>${registro.dispositivo}</td>
                <td>${registro.ritmo.valor} <span class="grey-text">${registro.ritmo.unidad}</span></td>
                <td>${formatTimestamp(registro.timestamp)}</td>
            `;
            
            tbody.appendChild(row);
        });
    }
    
    // Función para calcular estadísticas
    function calculateStats(registros) {
        const totalRegistros = registros.length;
        
        // Dispositivos únicos
        const dispositivosUnicos = [...new Set(registros.map(r => r.dispositivo))];
        
        // Valores de ritmo
        const valores = registros.map(r => r.ritmo.valor);
        const promedio = valores.reduce((a, b) => a + b, 0) / valores.length;
        const minimo = Math.min(...valores);
        const maximo = Math.max(...valores);
        
        // Anomalías
        const anomalias = registros.filter(r => detectAnomaly(r.ritmo.valor)).length;
        
        // Actualizar UI
        const resumenCards = document.getElementById('resumen-cards');
        resumenCards.innerHTML = `
            <div class="col s12 m6 l3">
                <div class="card-panel blue lighten-1 white-text">
                    <span class="card-title">Total registros</span>
                    <h4>${totalRegistros}</h4>
                </div>
            </div>
            <div class="col s12 m6 l3">
                <div class="card-panel green lighten-1 white-text">
                    <span class="card-title">Dispositivos</span>
                    <h4>${dispositivosUnicos.length}</h4>
                </div>
            </div>
            <div class="col s12 m6 l3">
                <div class="card-panel orange lighten-1 white-text">
                    <span class="card-title">Promedio</span>
                    <h4>${promedio.toFixed(1)} bpm</h4>
                </div>
            </div>
            <div class="col s12 m6 l3">
                <div class="card-panel ${anomalias > 0 ? 'red darken-2' : 'green lighten-2'} white-text">
                    <span class="card-title">Rango</span>
                    <h4>${minimo}-${maximo} bpm</h4>
                </div>
            </div>

        `;
    }
    
    // Función para agrupar por dispositivo
    function groupByDevice(registros) {
        const dispositivosMap = {};
        
        registros.forEach(registro => {
            if (!dispositivosMap[registro.dispositivo]) {
                dispositivosMap[registro.dispositivo] = {
                    count: 0,
                    total: 0,
                    valores: []
                };
            }
            
            dispositivosMap[registro.dispositivo].count++;
            dispositivosMap[registro.dispositivo].total += registro.ritmo.valor;
            dispositivosMap[registro.dispositivo].valores.push(registro.ritmo.valor);
        });
        
        // Actualizar lista
        const dispositivosLista = document.getElementById('dispositivos-lista');
        dispositivosLista.innerHTML = '';
        
        for (const [dispositivo, data] of Object.entries(dispositivosMap)) {
            const promedio = data.total / data.count;
            const min = Math.min(...data.valores);
            const max = Math.max(...data.valores);
            
            const card = document.createElement('div');
            card.className = 'card-panel hoverable';
            card.innerHTML = `
                <h5>${dispositivo}</h5>
                <p>Registros: ${data.count}</p>
                <p>Promedio: ${promedio.toFixed(1)} bpm</p>
                <p>Rango: ${min}-${max} bpm</p>
            `;
            dispositivosLista.appendChild(card);
        }
        
        // Actualizar gráfico de dispositivos
        updateDevicesChart(dispositivosMap);
    }
    
    // Función para actualizar gráfico de dispositivos
    function updateDevicesChart(dispositivosMap) {
        const ctx = document.getElementById('dispositivos-chart').getContext('2d');
        const dispositivos = Object.keys(dispositivosMap);
        const promedios = dispositivos.map(d => dispositivosMap[d].total / dispositivosMap[d].count);
        
        if (dispositivosChart) {
            dispositivosChart.destroy();
        }
        
        dispositivosChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dispositivos,
                datasets: [{
                    label: 'Ritmo promedio (bpm)',
                    data: promedios,
                    backgroundColor: [
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(75, 192, 192, 0.7)',
                        'rgba(255, 159, 64, 0.7)'
                    ],
                    borderColor: [
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 99, 132, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(255, 159, 64, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: 'Ritmo (bpm)'
                        }
                    }
                }
            }
        });
    }
    
    // Función para preparar gráfico cronológico con líneas independientes por dispositivo
    // MODIFICADA: Mostrar solo los registros más recientes
    function prepareTimeChart(registros) {
        // Ordenar por timestamp descendente y tomar solo los más recientes
        const LIMITE_REGISTROS = 15; // Puedes ajustar este número según necesites
        const registrosRecientes = registros
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, LIMITE_REGISTROS)
            .reverse(); // Revertir para mostrar cronológicamente (más antiguo a más reciente)
        
        // Agrupar registros recientes por dispositivo
        const dispositivosMap = {};
        
        registrosRecientes.forEach(registro => {
            if (!dispositivosMap[registro.dispositivo]) {
                dispositivosMap[registro.dispositivo] = {
                    timestamps: [],
                    valores: [],
                    labels: []
                };
            }
            
            dispositivosMap[registro.dispositivo].timestamps.push(registro.timestamp);
            dispositivosMap[registro.dispositivo].valores.push(registro.ritmo.valor);
            dispositivosMap[registro.dispositivo].labels.push(formatTimestamp(registro.timestamp));
        });
        
        // Configurar colores para cada dispositivo
        const dispositivosUnicos = Object.keys(dispositivosMap);
        const colors = [
            'rgba(54, 162, 235, 1)',    // Azul
            'rgba(255, 99, 132, 1)',     // Rojo
            'rgba(75, 192, 192, 1)',     // Verde
            'rgba(255, 159, 64, 1)',     // Naranja
            'rgba(153, 102, 255, 1)',    // Morado
            'rgba(201, 203, 207, 1)'     // Gris
        ];
        
        // Obtener todos los timestamps únicos y ordenados de los registros recientes
        const allTimestamps = [...new Set(registrosRecientes.map(r => r.timestamp))].sort((a, b) => a - b);
        const allLabels = allTimestamps.map(ts => formatTimestamp(ts));
        
        // Crear datasets para cada dispositivo
        const datasets = dispositivosUnicos.map((dispositivo, index) => {
            const color = colors[index % colors.length];
            const deviceData = dispositivosMap[dispositivo];
            
            // Mapear valores a los timestamps generales
            const valuesForAllTimestamps = allTimestamps.map(ts => {
                const indexInDevice = deviceData.timestamps.indexOf(ts);
                return indexInDevice !== -1 ? deviceData.valores[indexInDevice] : null;
            });
            
            return {
                label: dispositivo,
                data: valuesForAllTimestamps,
                borderColor: color,
                backgroundColor: color,
                borderWidth: 2,
                pointRadius: function(context) {
                    return context.raw !== null ? 5 : 0;
                },
                pointHoverRadius: 7,
                tension: 0.1,
                fill: false,
                spanGaps: true
            };
        });
        
        // Crear o actualizar gráfico
        const ctx = document.getElementById('cronologia-chart').getContext('2d');
        
        if (cronologiaChart) {
            cronologiaChart.destroy();
        }
        
        cronologiaChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: allLabels,
                datasets: datasets
            },
            options: {
                responsive: true,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        title: {
                            display: true,
                            text: 'Ritmo (bpm)'
                        },
                        suggestedMin: Math.max(40, Math.min(...registrosRecientes.map(r => r.ritmo.valor)) - 10),
                        suggestedMax: Math.max(...registrosRecientes.map(r => r.ritmo.valor)) + 10
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Fecha/Hora (Últimos ' + LIMITE_REGISTROS + ' registros)'
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45,
                            callback: function(value, index, values) {
                                // Con menos registros, podemos mostrar más etiquetas
                                if (values.length > 8 && index % Math.ceil(values.length / 6) !== 0) {
                                    return '';
                                }
                                return allLabels[index];
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                return allLabels[context[0].dataIndex];
                            },
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y} bpm`;
                            },
                            afterLabel: function(context) {
                                const dispositivo = context.dataset.label;
                                const timestamp = allTimestamps[context.dataIndex];
                                const registro = registrosRecientes.find(r => 
                                    r.dispositivo === dispositivo && r.timestamp === timestamp
                                );
                                
                                if (registro) {
                                    const anomaly = detectAnomaly(registro.ritmo.valor);
                                    if (anomaly) {
                                        return `⚠️ ${anomaly.message}`;
                                    }
                                }
                                return '';
                            }
                        }
                    },
                    legend: {
                        position: 'top',
                        onClick: null
                    }
                }
            }
        });
    }

    // Manejar cambio de orden
    document.getElementById('orden-select').addEventListener('change', function() {
        const value = this.value;
        
        // Recargar datos y aplicar orden
        fetch('http://localhost:5000/api/ritmo')
            .then(response => response.json())
            .then(data => {
                const registros = Array.isArray(data) ? data : [data];
                
                switch(value) {
                    case 'timestamp-desc':
                        registros.sort((a, b) => b.timestamp - a.timestamp);
                        break;
                    case 'timestamp-asc':
                        registros.sort((a, b) => a.timestamp - b.timestamp);
                        break;
                    case 'valor-desc':
                        registros.sort((a, b) => b.ritmo.valor - a.ritmo.valor);
                        break;
                    case 'valor-asc':
                        registros.sort((a, b) => a.ritmo.valor - b.ritmo.valor);
                        break;
                }
                
                updateTable(registros);
            })
            .catch(error => {
                console.error('Error:', error);
                M.toast({html: 'Error al ordenar los datos', classes: 'red'});
            });
    });
    
    // Cargar datos iniciales
    loadData();
});