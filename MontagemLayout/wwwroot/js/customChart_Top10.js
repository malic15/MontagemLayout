import { buttonId, setButtonId, prioritiesColors } from './mqttWebSocket.js';

let chartInstance = null;

async function fetchTopEvents(dataFilterInit, dataFilterFinal) {
    try {
        const response = await fetch(`/api/events/top-events?line=${encodeURIComponent(buttonId)}&dataFilterInit=${encodeURIComponent(dataFilterInit)}&dataFilterFinal=${encodeURIComponent(dataFilterFinal)}`);
        if (!response.ok) {
            throw new Error(`Erro ao buscar os top eventos: ${response.statusText}`);
        }
        const topEvents = await response.json();
        console.log("Top Events:", topEvents);
        return topEvents;
    } catch (error) {
        console.error(error);
    }
}
let showJPH = false; // Variável de controle para alternar entre Minutos e JPH

const updateChartLabels = () => {
    if (!chartInstance) return;

    // Atualiza apenas a legenda do primeiro dataset
    chartInstance.data.datasets[0].label = showJPH ? "JPH Improdutivo" : "Duração Total (min)";

    // Atualiza os rótulos das barras APENAS do primeiro dataset
    chartInstance.options.plugins.datalabels.formatter = function (value, context) {
        // Verifica se o dataset é o primeiro (index 0)
        if (context.datasetIndex === 0) {
            const numValue = Number(value); // Converte para número
            if (isNaN(numValue)) {
                return showJPH ? "0" : "0"; // Evita erro
            }
            return showJPH
                ? ((numValue / 60) * 52).toFixed(1)  // Conversão correta
                : numValue.toFixed(0);               // Formato correto
        }
        return value; // Mantém os outros datasets inalterados
    };

    chartInstance.update(); // Atualiza o gráfico sem recriar
};


// Função para alternar entre Minutos e JPH
window.toggleJPH = function() {
    showJPH = !showJPH;
    updateChartLabels(); // Atualiza apenas os rótulos
};

async function renderChart(dataFilterInit, dataFilterFinal, shift) {

    if (chartInstance) {
        chartInstance.destroy();
    }
    let lineName = '';
    const match = buttonId.match(/^([a-zA-Z]+)(\d+)?$/);

    if (!match) {
        lineName = input; // Retorna a string original se não corresponder ao padrão
    } else {
        let word = match[1]; // Captura a parte da palavra
        let number = match[2]; // Captura a parte numérica (se existir)

        // Capitaliza a primeira letra da palavra
        word = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

        // Retorna a string formatada com ou sem o número
        lineName = number ? `${word} ${number}` : word;
    }

    const topEvents = await fetchTopEvents(dataFilterInit, dataFilterFinal);

    const labels = topEvents.map(event => event.event);
    const data = topEvents.map(event => (event.totalDuration / 60));
    const dataCount = topEvents.map(event => event.eventCount);
    const dataPriorities = topEvents.map(event => parseInt(event.status, 10));
    const maxData = Math.max(...data.map(value => parseFloat(value)));
    const maxDataCount = Math.max(...dataCount.map(value => parseFloat(value)));

    console.log("Labels:", labels);
    console.log("Data:", data);
    console.log("Data:", dataCount);

    const backgroundColors = dataPriorities.map(priority =>
        prioritiesColors[priority] ? prioritiesColors[priority] + '40' : 'rgba(200, 200, 200, 0.2)' // Adicionando transparência para background
    );

    const borderColors = dataPriorities.map(priority =>
        prioritiesColors[priority] ? prioritiesColors[priority] : 'rgba(200, 200, 200, 1)' // Cor sólida para a borda
    );

    const ctx = document.getElementById('topEventsChart').getContext('2d');

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: showJPH ? "JPH Improdutivo" : "Duração Total (min)",
                    data: data,
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: 2,
                    yAxisID: 'y1',
                    stack: 'group1'
                },
                {
                    type: 'line',
                    label: `Contagem de Eventos`,
                    data: dataCount,
                    backgroundColor: 'rgba(255, 159, 64, 0.5)',
                    borderColor: 'rgba(255, 159, 64, 1)',
                    borderWidth: 2,
                    tension: 0.1,
                    fill: false,
                    pointStyle: 'circle',
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    yAxisID: 'y2',
                    stack: 'group2'
                }]
        },
        options: {
            responsive: true,
            animation: {
                duration: 500, // Tempo de animação global (1 segundo)
                easing: 'easeInOutQuart' // Tipo de suavização
            },
            layout: {
                padding: {
                    top: 20,   // Aumenta o espaço entre a legenda e o gráfico
                    bottom: 200, // Se a legenda estiver abaixo, ajuste aqui
                }
            },
            plugins: {
                streaming: false,
                animations: false,
                legend: {
                    hidden: true,
                    position: 'top',
                    align:'center',
                    labels: {
                        color: 'white', // Cor do texto da legenda
                        font: {
                            size: 12 // Tamanho da fonte da legenda
                        }
                    }
                },
                title: {
                    display: true,
                    text: `Top 10 Eventos por Duração ${lineName} ${shift}`,
                    color: 'white', // Cor do título
                    font: {
                        size: 20 // Tamanho da fonte do título
                    },
                    padding: {
                        top: 0,
                        bottom: 10
                    }
                },
                datalabels: {
                    anchor: 'end', // Posição do label
                    align: 'top',  // Alinha acima da barra
                    formatter: function (value,context) {
                        if (context.datasetIndex === 0) {
                            const numValue = Number(value); // Converte para número
                            if (isNaN(numValue)) {
                                return showJPH ? "0" : "0"; // Evita erro
                            }
                            return showJPH
                                ? ((numValue / 60) * 52).toFixed(1)  // Conversão correta
                                : numValue.toFixed(0);               // Formato correto
                        }
                        return value; // Mantém os outros datasets inalterados
                        //return showJPH ? ((value / 60) * 52).toFixed(1) : value.toFixed(0);
                    },
                    color: 'white',
                    font: {
                        size: 12,
                        weight: 'bold'
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)' // Linhas do grid no eixo X
                    },
                    ticks: {
                        color: 'white', // Cor dos textos do eixo X
                        font: {
                            size: 10 // Tamanho da fonte
                        },
                        autoSkip: false,
                        maxRotation: 0, // Impede rotação dos textos
                        minRotation: 0,
                        callback: function (value, index, values) {
                            let label = this.getLabelForValue(value);

                            // Quebra a string nos delimitadores " - " (LMN32-DSP01 e Zona 6)
                            let parts = label.split(' - ');
                            let formattedLabel = [];

                            for (let i = 0; i < parts.length; i++) {
                                if (parts.length === 3 && (i === 0 || i === 1)) {
                                    // Primeiro e segundo segmentos mantêm-se na mesma linha
                                    formattedLabel.push(parts[i]);
                                } else {
                                    // Para o restante, quebramos a cada duas palavras
                                    let words = parts[i].split(' ');
                                    let newLine = "";
                                    for (let j = 0; j < words.length; j++) {
                                        newLine += words[j] + " ";
                                        if ((j + 1) % 2 === 0) {
                                            formattedLabel.push(newLine.trim());
                                            newLine = "";
                                        }
                                    }
                                    if (newLine.trim() !== "") {
                                        formattedLabel.push(newLine.trim());
                                    }
                                }
                            }

                            return formattedLabel;
                        }
                    }
                },
                y1: { // Primeiro eixo Y (Duração Total)
                    position: 'left',
                    max: maxData*2,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        display: false
                    },
                    beginAtZero: true
                },
                y2: { // Segundo eixo Y (Contagem de Eventos)
                    position: 'right',
                    grid: {
                        drawOnChartArea: false // Impede que as linhas do grid apareçam em cima do outro gráfico
                    },
                    grid: {
                        display: false // Remove o grid para evitar poluição visual
                    },
                    ticks: {
                        display: false,
                        beginAtZero: false
                    },
                    afterBuildTicks: (axis) => {
                        axis.ticks = axis.ticks.filter(t => t >= maxDataCount * (-2)); // Garante que -10 apareça
                        axis.min = maxDataCount * (-2); // Força o mínimo para -10
                    }
                }
            },
            layout: {
                padding: {
                    left: 20,
                    right: 20,
                    top: 20,
                    bottom: 20
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}

document.getElementById('applyFilterBtnTop10').addEventListener('click', async () => {
    const filterDateInit = document.getElementById('filterDateInitTop10').value;
    const filterDateFinal = document.getElementById('filterDateFinalTop10').value;
    const filterTimeInit = document.getElementById('filterTimeInitTop10').value;
    const filterTimeFinal = document.getElementById('filterTimeFinalTop10').value;

    if (!filterDateInit) {
        alert("Selecione ao menos uma data inicial para filtrar!");
        return;
    }
    if (filterTimeFinal && !filterDateFinal) {
        alert("Selecione  uma data final para filtrar!");
        return;
    }
    const filterDateTimeInit = filterDateInit && filterTimeInit ? `${filterDateInit} ${filterTimeInit}` : filterDateInit || filterTimeInit;
    const filterDateTimeFinal = filterDateFinal && filterTimeFinal ? `${filterDateFinal} ${filterTimeFinal}` : filterDateFinal || filterTimeFinal;

    const loaderContainer = document.getElementById('loaderContainerTop10');
    loaderContainer.textContent = 'Carregando...';
    loaderContainer.style.display = 'block';

    try {
        await renderChart(filterDateTimeInit, filterDateTimeFinal, '')
    } catch (error) {
        console.error("Erro ao aplicar os filtros:", error);
    } finally {
        loaderContainer.style.display = 'none';
    }
});
document.querySelectorAll('.showTop10Btn').forEach(elem => {
    elem.addEventListener('click', async (event) => {
        const filterDateInit = "";
        const filterDateFinal = "";
        const chartContainer = document.getElementById('top10ChartContainer');
        const parentButton = event.target.closest('button');
        if (parentButton) {
            setButtonId(parentButton.id)
        }
        console.log(chartContainer)
        chartContainer.style.display = 'block';
        const loaderContainer = document.getElementById('loaderContainerTop10');
        loaderContainer.textContent = 'Carregando...';
        loaderContainer.style.display = 'block';
        try {
            await renderChart(filterDateInit, filterDateFinal,'(Turno)')
        } catch (error) {
            console.error("Erro ao aplicar os filtros:", error);
        } finally {
            loaderContainer.style.display = 'none';
        }
    });
});

document.getElementById('clearFilterBtnTop10').addEventListener('click', async () => {
    document.getElementById('filterDateInitTop10').value = '';
    document.getElementById('filterDateFinalTop10').value = '';
    document.getElementById('filterTimeInitTop10').value = '';
    document.getElementById('filterTimeFinalTop10').value = '';

    const loaderContainer = document.getElementById('loaderContainerTop10');
    loaderContainer.textContent = 'Carregando...';
    loaderContainer.style.display = 'block';
    const filterDateInit = "";
    const filterDateFinal = "";
    try {
        await renderChart(filterDateInit, filterDateFinal, '(Turno)')
    } catch (error) {
        console.error("Erro ao aplicar os filtros:", error);
    } finally {
        loaderContainer.style.display = 'none';
    }
});