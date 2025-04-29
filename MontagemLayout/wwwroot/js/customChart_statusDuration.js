import { prioritiesColors, prioritiesDescription } from './mqttWebSocket.js';

let chartInstances = {};
let firstUp = false;

async function renderStateChart(line, canvas) {
    let lineName = '';
    const match = line.match(/^([a-zA-Z]+)(\d+)?$/);

    if (!match) {
        lineName = line; // Retorna a string original se não corresponder ao padrão
    } else {
        let word = match[1]; // Captura a parte da palavra
        let number = match[2]; // Captura a parte numérica (se existir)

        // Capitaliza a primeira letra da palavra
        word = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

        // Retorna a string formatada com ou sem o número
        lineName = number ? `${word} ${number}` : word;
    }

    //  Obtém os dados do backend
    const response = await fetch(`/api/events/status-durations?line=${encodeURIComponent(line)}`);
    const jsonData = await response.json();

    const stateData = jsonData[0].statusDurations || [];
    const lastState = jsonData[0].lastStatus;
    const lastStateDate = jsonData[0].lastStatusDate;

    const lastStateTimestamp = new Date(lastStateDate).getTime();
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - lastStateTimestamp) / 1000); // Tempo desde o último status

    //console.log(`Último Estado: ${lastState}, Última Atualização: ${lastStateDate}, Segundos desde última atualização: ${elapsedSeconds}`);

    const updatedStateData = stateData.map(item => ({
        ...item,
        duration: item.state === lastState ? item.duration + elapsedSeconds : item.duration
    }));
    //console.log(`updatedStateData: ${updatedStateData}`);
    //  Mapeia os dados para o gráfico
    const labels = updatedStateData.map(item =>
        prioritiesDescription[item.state] ? prioritiesDescription[item.state] : 'Sem Descrição'
    );
    const durations = updatedStateData.map(item => (item.duration / 60).toFixed(2)); // Minutos
    const dataPriorities = updatedStateData.map(event => event.state);

    const backgroundColors = dataPriorities.map(priority =>
        prioritiesColors[priority] ? prioritiesColors[priority] + 'AA' : 'rgba(200, 200, 200, 0.2)'
    );
    const borderColors = dataPriorities.map(priority =>
        prioritiesColors[priority] ? prioritiesColors[priority] : 'rgba(200, 200, 200, 1)'
    );

    if (chartInstances[line]) {
        chartInstances[line].data.labels = labels;
        chartInstances[line].data.datasets[0].data = durations;
        chartInstances[line].data.datasets[0].backgroundColor = backgroundColors;
        chartInstances[line].update(); // Atualiza o gráfico
        
    } else {
        //console.log(`labels: ${labels}`);
        //console.log(`durations: ${durations}`);

        if (!canvas) {
            console.warn(`Nenhum elemento <canvas> encontrado para a linha: ${line}`);
            return;
        }

        //  Configura o gráfico
        const ctx = canvas.getContext('2d');

        chartInstances[line] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Minutos',
                    data: durations,
                    backgroundColor: backgroundColors,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    streaming: false,
                    legend: {
                        display: false,
                        position: 'top', labels: {
                            color: 'rgba(255, 255, 255, 0.8)', // Cor do texto da legenda
                            font: {
                                size: 6 // Tamanho da fonte da legenda
                            }
                        }
                    },
                    title: { display: false, color: 'rgba(255, 255, 255, 0.8)', text: `Tempo por Estado - ${lineName}` }
                },
                scales: {
                    y: { display: false },
                    x: { display: false }
                },
                layout: {
                    padding: {
                        top: 20,   // Aumenta o espaço entre a legenda e o gráfico
                        bottom: 10, // Se a legenda estiver abaixo, ajuste aqui
                    }
                },
            }
        });
    }
}

async function updateAllCharts() {
    const bottons = document.querySelectorAll('.botton')

    bottons.forEach(botton => {
        if (botton.classList.contains('animating')) {
            const chart = botton.querySelector('.stateChart');
            //console.log(botton.id)
            renderStateChart(botton.id, chart);
        }
    });
}

document.querySelectorAll('.botton').forEach(botton => {
    const chart = botton.querySelector('.stateChart');
    renderStateChart(botton.id, chart);
});

//if (window.prodDataInterval) clearInterval(window.prodDataInterval);
window.prodDataInterval = setInterval(() => {
    updateAllCharts();
}, 1000);

//setInterval(updateAllCharts, 1000);

//  Chama a função para renderizar o gráfico (substitua pela linha desejada)
//renderStateChart('final1');
