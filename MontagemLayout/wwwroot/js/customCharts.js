const MAX_DATA_POINTS = 100;
const alertIntervals = {};

//Chart.defaults.datasets.line.animation = {
//    borderColor: {
//        type: 'color',
//        duration: 500,
//        easing: 'easeInOutQuad'
//    },
//    backgroundColor: {
//        type: 'color',
//        duration: 500,
//        easing: 'easeInOutQuad'
//    }
//};

function createChart(canvasId, borderColor, backgroundColor, yMin, yMax) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    const chartTextId = 'chartText' + canvasId.replace('lineChart', '');
    //console.log('chartTextId: ' + chartTextId)

    if (Chart.getChart(canvasId)) {
        Chart.getChart(canvasId).destroy();
    }

    return new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                data: [],
                borderColor: borderColor/*'rgba(75, 192, 192, 1)'*/,
                backgroundColor: backgroundColor/*'rgba(75, 192, 192, 0.2)'*/,
                tension: 0.4,
                fill: true,
                pointRadius: 0,
                pointHoverRadius: 0,
                hitRadius: 0,
                borderWidth: 1,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            //layout: { autoPadding: false },
            elements: {point: {pointStyle: false}},
            plugins: { legend: { display: false } },
            events: [],
            //animation: false, 
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'minute',
                        tooltipFormat: 'HH:mm',
                        displayFormats: {
                            minute: 'HH:mm'
                        }
                    },
                    ticks: {
                        maxRotation: 0,
                        autoSkip: true
                    },
                    display: false
                },
                y: {
                    min: yMin,
                    max: yMax,
                    display: false,
                    beginAtZero: true
                }
            }
        }
    });
}

Chart.defaults.datasets.line.animation = {
    borderColor: {
        type: 'color',
        duration: 500,
        easing: 'easeInOutQuad'
    },
    backgroundColor: {
        type: 'color',
        duration: 500,
        easing: 'easeInOutQuad'
    }
};


const chartChassis5 = createChart('lineCharttrim', 'rgba(75, 192, 192, 1)','rgba(75, 192, 192, 0.2)', 0, 29);
const chartChassis1 = createChart('lineChartch1', 'rgba(75, 192, 192, 1)', 'rgba(75, 192, 192, 0.2)', 0, 18);
const chartDecking = createChart('lineChartdecking', 'rgba(75, 192, 192, 1)', 'rgba(75, 192, 192, 0.2)', 0, 17);
const chartChassis2 = createChart('lineChartch2', 'rgba(75, 192, 192, 1)', 'rgba(75, 192, 192, 0.2)', 0, 18);
const chartChassis3 = createChart('lineChartch3', 'rgba(75, 192, 192, 1)', 'rgba(75, 192, 192, 0.2)', 0, 10);
const chartGlazing = createChart('lineChartglazing', 'rgba(75, 192, 192, 1)', 'rgba(75, 192, 192, 0.2)', 0, 25);
const chartChassis4 = createChart('lineChartch4', 'rgba(75, 192, 192, 1)', 'rgba(75, 192, 192, 0.2)', 0, 28);
const chartFinal = createChart('lineChartfinal', 'rgba(75, 192, 192, 1)', 'rgba(75, 192, 192, 0.2)', 0, 17);
const chartPbsToDif = createChart('lineChartPbsToDif', 'rgba(185, 119, 212, 1)', 'rgba(185, 119, 212, 0.2)', 0, 200);
const chartPbsToTrim0 = createChart('lineChartPbsToTrim0', 'rgba(137, 198, 74, 1)', 'rgba(137, 198, 74, 0.2)', 0, 120);
const chartPbsToTrim1 = createChart('lineChartPbsToTrim1', 'rgba(90, 156, 205, 1)', 'rgba(90, 156, 205, 0.2)', 0, 180);
const chartPbsToPint = createChart('lineChartPbsToPint', 'rgba(228, 123, 50, 1)', 'rgba(228, 123, 50, 0.2)', 0, 100);


let lastFetchedData = null; // Cache para armazenar os últimos dados

async function fetchHistoricalData() {
    try {
        const response = await fetch('/data/line-bit-counts');
        if (!response.ok) throw new Error('Failed to fetch historical data');

        const data = await response.json();

        // Se os dados são os mesmos, não os processa novamente
        if (JSON.stringify(data) === JSON.stringify(lastFetchedData)) {
            return lastFetchedData;
        }

        lastFetchedData = data;
        return data;
    } catch (error) {
        console.log('Error fetching historical data:', error);
        return lastFetchedData || {};
    }
}

export async function updateChartsWithHistory(historicalData) {
    if (!historicalData) {
        console.warn("Nenhum dado histórico recebido");
        return;
    }

    Object.keys(historicalData).forEach(line => {
        const chartCanvasId = 'lineChart' + line;
        const chart = Chart.getChart(chartCanvasId);
        if (!chart) return;
        const chartTextEl = document.getElementById('chartText' + line);

        const lineData = historicalData[line];
        const now = Date.now();

        const dataPoints = lineData.map((value, index) => ({
            x: now - (lineData.length - index - 1) * 30000,
            y: value
        }));

        chart.data.datasets[0].data = dataPoints;

        //const lastY = lineData[lineData.length - 1];
        //const yMin = chart.options.scales.y.min;
        //const yMax = chart.options.scales.y.max;
        //const threshold = 0.4 * (yMax - yMin);

        //const canvas = document.getElementById(chartCanvasId);

        //if (canvas) {
        //    if (lastY <= yMin + threshold || lastY >= yMax - threshold) {
        //        canvas.classList.add('canvas-blink');
        //    } else {
        //        canvas.classList.remove('canvas-blink');
        //    }
        //}

        const lastY = lineData[lineData.length - 1];
        const yMin = chart.options.scales.y.min;
        const yMax = chart.options.scales.y.max;

        const range = yMax - yMin;
        const thresholdCritical = 0.2353 * range;
        const thresholdWarning = 0.30 * range;

        const isCritical = lastY <= yMin + thresholdCritical || lastY >= yMax - thresholdCritical;
        //const isWarning = !isCritical && (lastY <= yMin + thresholdWarning || lastY >= yMax - thresholdWarning);

        const dataset = chart.data.datasets[0];

        const originalBorderColor = 'rgba(75, 192, 192, 1)';
        const originalBackgroundColor = 'rgba(75, 192, 192, 0.2)';
        const warningBorderColor = 'rgba(255, 193, 7, 1)';      // amarelo elegante
        const warningBackgroundColor = 'rgba(255, 193, 7, 0.2)';
        const dangerBorderColor = 'rgba(220, 53, 69, 1)';        // vermelho elegante
        const dangerBackgroundColor = 'rgba(220, 53, 69, 0.2)';

        //console.log("chartCanvasId:" + chartCanvasId)
        //console.log("thresholdCritical:" + thresholdCritical)
        //console.log("lastY:" + lastY)
        //console.log("yMin:" + lineData)
        // Estado Crítico
        if (isCritical) {
            //chartTextEl?.classList.remove('chartText-blink');
            //chartTextEl?.classList.add('chartText-blink');
            if (!alertIntervals[line]) {
                let toggle = false;
                alertIntervals[line] = setInterval(() => {
                    toggle = !toggle;
                    dataset.borderColor = toggle ? dangerBorderColor : originalBorderColor;
                    dataset.backgroundColor = toggle ? dangerBackgroundColor : originalBackgroundColor;
                    chart.update();
                }, 1000);
            }
        }

        // Estado de Alerta (não crítico)
        //else if (isWarning) {
        //    chartTextEl?.classList.remove('chartText-blink');
        //    if (alertIntervals[line]) {
        //        clearInterval(alertIntervals[line]);
        //        delete alertIntervals[line];
        //    }
        //    //if (!alertIntervals[line]) {
        //    //    let toggle = false;
        //    //    alertIntervals[line] = setInterval(() => {
        //    //        toggle = !toggle;
        //    //        dataset.borderColor = toggle ? warningBorderColor : originalBorderColor;
        //    //        dataset.backgroundColor = toggle ? warningBackgroundColor : originalBackgroundColor;
        //    //        chart.update();
        //    //    }, 5000);
        //    //}
        //    dataset.borderColor = warningBorderColor;
        //    dataset.backgroundColor = warningBackgroundColor;
        //    chart.update();
        //}

        // Estado Normal
        else {
            //chartTextEl?.classList.remove('chartText-blink');
            if (alertIntervals[line]) {
                clearInterval(alertIntervals[line]);
                delete alertIntervals[line];
            }

            dataset.borderColor = originalBorderColor;
            dataset.backgroundColor = originalBackgroundColor;
            chart.update();
        }

        chart.update();
    });
}
