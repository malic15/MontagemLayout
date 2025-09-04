//const { each } = require("jquery");
import { updateChartsWithHistory } from './customCharts.js';

const activePDTs = new Map();

const connection = new signalR.HubConnectionBuilder()
    .withUrl("/mqtthub")
    .build();

const connectionData = new signalR.HubConnectionBuilder()
    .withUrl("/datahub")
    .build();

export const prioritiesColors = {
    0: '#909090',
    1: '#ff0000',
    2: '#ff0000',
    5: '#ff0000',
    6: '#0000bc',
    7: '#99ccff',
    8: '#ffff00',
    9: '#3365ff',
    10: '#ffff00',
    11: '#ffffaa',
    12: '#ffb547',
    13: '#ff9200',
    14: '#ff9200',
    15: '#ff0000',
    16: '#87cefa',
    17: '#ffff00',
    19: '#8ce436'
};
//export const prioritiesColors = {
//    0: '#606060',   // cinza mais escuro
//    1: '#b00000',   // vermelho escuro
//    2: '#b00000',
//    5: '#b00000',
//    6: '#000080',   // azul marinho
//    7: '#3a75a8',   // azul acinzentado
//    8: '#b8b800',   // amarelo escurecido
//    9: '#1a3f8f',   // azul profundo
//    10: '#b8b800',
//    11: '#b8b88f',  // amarelo apagado
//    12: '#b8751f',  // laranja queimado
//    13: '#b05e00',  // laranja escuro
//    14: '#b05e00',
//    15: '#800000',  // vinho
//    16: '#4a90c2',  // azul aço
//    17: '#b8b800',
//    19: '#5ba82d'   // verde musgo vibrante
//};

export const prioritiesDescription = {
    0: 'Sem Conexão',
    1: 'Falha',
    2: 'Emergência',
    5: 'Congruência e Controle',
    6: 'Falta Carregamento',
    7: 'Falta Material',
    8: 'Falta Carga Lateral',
    9: 'Falta Descarregamento',
    10: 'Falta Consenso Externo',
    11: 'Parada Operador',
    12: 'Controle de Qualidade',
    13: 'Manutenção Programada',
    14: 'Manutenção Não Programada',
    15: 'Falta Ciclo Iniciar',
    16: 'Manual',
    17: 'Parada Produção',
    19: 'Produção'
};
//const linesData = [];
var countCh3_01 = 0;
var setUp = true;
var bufferHide = false;
var transpColor = '32'
let color = '#8ce436';
var btnTransition = false;
let replayMode = false;
let dataTable;
const activeFaults = {};

export var allLines = [];
var globalDateTime;
export function setReplayMode() {
    replayMode = replayMode ? false : true;
    //console.log("replayMode: " + replayMode);
}
export var buttonId = "";
export function setButtonId(newId) {
    buttonId = newId;
}
function cleanUpDOM() {
    document.body.innerHTML = ""; // Remove todos os elementos da página
    console.clear(); // Limpa o console para evitar acúmulo de logs
}
function getCurrentTime() {
    const now = new Date();
    return now.toTimeString().split(" ")[0];;
}
function formatToHHMMSS(isoString) {
    const date = new Date(isoString);

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
}
function addTimes(time1, time2) {
    const timeToSeconds = (time) => time.split(":").reduce((acc, val) => acc * 60 + +val, 0);
    const totalSeconds = timeToSeconds(time1) + timeToSeconds(time2);

    const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
}

function calculateTimeDifference(lastTimeActive) {
    const lastTime = new Date(lastTimeActive);
    const now = globalDateTime;

    const diffInMs = now - lastTime;

    const hours = Math.floor(diffInMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffInMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffInMs % (1000 * 60)) / 1000);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}


function hexToRgb(hex) {
    hex = hex.replace(/^#/, '');
    let bigint = parseInt(hex, 16);
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
    };
}

function getAllLineNames() {
    // Se todos têm class "botton", selecione por isso:
    return Array.from(document.querySelectorAll('button.botton'))
        .map(btn => btn.id)
        .filter(id => id); // filtra se tiver botão sem id
}

document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM fully loaded and parsed");
    //createLines();
    adjustScale();
    initializeState();
    allLines = getAllLineNames();
    buttonUp.disabled = true;
    //document.querySelectorAll('.botton').forEach(elem => {
    //    const containerFault = elem.querySelector(".fault_text");
    //    elem.style.backgroundColor = prioritiesColors[0] + transpColor;
    //    elem.style.borderColor = prioritiesColors[0];
    //    if (containerFault) {
    //        containerFault.textContent = 'Sem Conexão Com o Servidor';
    //    }
    //});
});

document.getElementById('closeTableBtn').addEventListener('click', () => {
    const tableWrapper = document.getElementById('productsTableWrapper');
    tableWrapper.style.display = 'none';
});
document.getElementById('closeTop10Btn').addEventListener('click', () => {
    const top10Chart = document.getElementById('top10ChartContainer');
    top10Chart.style.display = 'none';
});

document.querySelectorAll('.upper, .ball, .upperlong, .space, .spacev, #chartContainertrim, #chartContainerch1, #chartContainerdecking, #chartContainerch2, #chartContainerch3, #chartContainerch4, #chartContainerfinal, #chartContainerglazing, .progress-text').forEach(element => {
    const originalTooltip = element.querySelector('.tooltip');

    element.addEventListener('mouseenter', () => {
        document.querySelectorAll('.active-tooltip').forEach(tooltip => tooltip.remove()); // Remove tooltips antigas

        const computedStyle = window.getComputedStyle(element);
        if (computedStyle.opacity === "1" && originalTooltip) {
            const tooltipClone = originalTooltip.cloneNode(true);
            tooltipClone.classList.add('active-tooltip');
            if (tooltipClone.textContent !== "") {
                document.body.appendChild(tooltipClone);
                const rect = element.getBoundingClientRect();
                tooltipClone.style.position = 'absolute';
                tooltipClone.style.left = `${rect.right + 10}px`;
                tooltipClone.style.top = `${rect.top}px`;
                tooltipClone.style.minWidth = '140px';
                tooltipClone.style.visibility = 'visible';
                tooltipClone.style.opacity = '1';
            }
        }
    });

    element.addEventListener('mouseleave', () => {
        document.querySelectorAll('.active-tooltip').forEach(tooltip => tooltip.remove());
    });
});

function createLines() {
    setTimeout(() => {
        const buffer = document.querySelectorAll('.line');
        if (setUp) {
            const container = document.getElementById('layoutContainer');
            const existingLines = container.querySelectorAll('.line');
            existingLines.forEach(line => line.remove());
            const balls = container.querySelectorAll('.ball');
            const svg = document.getElementById('lineCanvas');
            svg.innerHTML = '';
            balls.forEach((ball, index) => {
                if (index < balls.length - 1) {

                    const nextBall = balls[index + 1];

                    const startRect = ball.getBoundingClientRect();
                    const endRect = nextBall.getBoundingClientRect();
                    const containerRect = container.getBoundingClientRect();

                    const x1 = startRect.left - containerRect.left + startRect.width / 2;
                    const y1 = startRect.top - containerRect.top + startRect.height / 2;
                    const x2 = endRect.left - containerRect.left + endRect.width / 2;
                    const y2 = endRect.top - containerRect.top + endRect.height / 2;

                    const length = Math.hypot(x2 - x1, y2 - y1);
                    const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
                    const x0 = Math.abs(x1 - x2);
                    const y0 = Math.abs(y1 - y2);
                    if ((x1 - x2) >= 30 || (x1 - x2) <= -30 || (y1 - y2) <= -30 || (y1 - y2) >= 30) {
                        const arrow1 = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                        arrow1.setAttribute('points', '-5,-5 5,0 -5,5');
                        arrow1.setAttribute('class', 'arrow');
                        const arrow2 = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                        arrow2.setAttribute('points', '-5,-5 5,0 -5,5');
                        arrow2.setAttribute('class', 'arrow');
                        if ((x1 - x2) >= 0) {
                            if ((y1 - y2) >= 0) {
                                if (x0 > y0) {
                                    arrow1.setAttribute('transform', `translate(${x1 - 13}, ${y1}) rotate(${angle})`); t
                                    arrow2.setAttribute('transform', `translate(${x2 + 13}, ${y2}) rotate(${angle})`); t
                                } else {
                                    arrow1.setAttribute('transform', `translate(${x1}, ${y1 - 13}) rotate(${angle})`); t
                                    arrow2.setAttribute('transform', `translate(${x2}, ${y2 + 13}) rotate(${angle})`); t
                                }
                            } else {
                                if (x0 > y0) {
                                    arrow1.setAttribute('transform', `translate(${x1 - 13}, ${y1}) rotate(${angle})`); t
                                    arrow2.setAttribute('transform', `translate(${x2 + 13}, ${y2}) rotate(${angle})`); t
                                } else {
                                    arrow1.setAttribute('transform', `translate(${x1}, ${y1 + 13}) rotate(${angle})`); t
                                    arrow2.setAttribute('transform', `translate(${x2}, ${y2 - 13}) rotate(${angle})`); t
                                }
                            }
                        } else {
                            if ((y1 - y2) >= 0) {
                                if (x0 > y0) {
                                    arrow1.setAttribute('transform', `translate(${x1 + 13}, ${y1}) rotate(${angle})`); t
                                    arrow2.setAttribute('transform', `translate(${x2 - 13}, ${y2}) rotate(${angle})`); t
                                } else {
                                    arrow1.setAttribute('transform', `translate(${x1}, ${y1 - 13}) rotate(${angle})`); t
                                    arrow2.setAttribute('transform', `translate(${x2}, ${y2 - 13}) rotate(${angle})`); t
                                }
                            } else {
                                if (x0 > y0) {
                                    arrow1.setAttribute('transform', `translate(${x1 + 13}, ${y1}) rotate(${angle})`); t
                                    arrow2.setAttribute('transform', `translate(${x2 - 13}, ${y2}) rotate(${angle})`); t
                                } else {
                                    arrow1.setAttribute('transform', `translate(${x1}, ${y1 + 13}) rotate(${angle})`); t
                                    arrow2.setAttribute('transform', `translate(${x2}, ${y2 - 13}) rotate(${angle})`); t
                                }
                            }
                        }
                        arrow1.setAttribute('z-index', `5`); t
                        arrow2.setAttribute('z-index', `5`); t
                        svg.appendChild(arrow1);
                        svg.appendChild(arrow2);
                    } else {
                        const line = document.createElement('div');
                        line.classList.add('line');
                        line.style.width = `${length}px`;
                        line.style.transform = `translate(${x1 - 20}px, ${y1 - 75}px) rotate(${angle}deg)`;

                        container.appendChild(line);
                    }
                }
            });
        } else {

            const container = document.getElementById('layoutContainer');
            const existingLines = container.querySelectorAll('.line');
            existingLines.forEach(line => line.remove());
            const uppers = container.querySelectorAll('.upper,.upperlong');
            const svg = document.getElementById('lineCanvas');
            svg.innerHTML = '';
            uppers.forEach((upper, index) => {
                if (index < uppers.length - 1) {
                    console.log("DOM fully loaded and parsed");
                    const nextUpper = uppers[index + 1];

                    const startRect = upper.getBoundingClientRect();
                    const endRect = nextUpper.getBoundingClientRect();
                    const containerRect = container.getBoundingClientRect();

                    const x1 = startRect.left - containerRect.left + startRect.width / 2;
                    const y1 = startRect.top - containerRect.top + startRect.height / 2;
                    const x2 = endRect.left - containerRect.left + endRect.width / 2;
                    const y2 = endRect.top - containerRect.top + endRect.height / 2;

                    const length = Math.hypot(x2 - x1, y2 - y1);
                    const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
                    const x0 = Math.abs(x1 - x2);
                    const y0 = Math.abs(y1 - y2);

                    if (upper.classList.contains('PbsToTrim0_zne3_tg04_pb1')) {
                        const nextZone = document.getElementsByClassName('upper PbsToTrim0_zne4_tr60')[0];
                        if (nextZone) {
                            const endRectZone = nextZone.getBoundingClientRect();

                            const x2 = endRectZone.left - containerRect.left + endRectZone.width / 2;
                            const y2 = endRectZone.top - containerRect.top + endRectZone.height / 2;

                            const lengthZone = Math.hypot(x2 - x1, y2 - y1);
                            const angleZone = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);

                            const line = document.createElement('div');
                            line.classList.add('line');
                            line.style.width = `${lengthZone}px`;
                            line.style.transform = `translate(${x1 - 20}px, ${y1 - 75}px) rotate(${angleZone}deg)`;

                            container.appendChild(line);

                        }
                    }
                    if (upper.classList.contains('PbsToTrim1_zne4_tr58')) {
                        const nextZone = document.getElementsByClassName('upperlong PbsToTrim1_zne3_tg03')[0];
                        if (nextZone) {
                            const endRectZone = nextZone.getBoundingClientRect();

                            const x2 = endRectZone.left - containerRect.left + endRectZone.width / 2;
                            const y2 = endRectZone.top - containerRect.top + endRectZone.height / 2;

                            const lengthZone = Math.hypot(x2 - x1, y2 - y1);
                            const angleZone = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);

                            const line = document.createElement('div');
                            line.classList.add('line');
                            line.style.width = `${lengthZone}px`;
                            line.style.transform = `translate(${x1 - 20}px, ${y1 - 75}px) rotate(${angleZone}deg)`;
                            
                            container.appendChild(line);

                        } 
                    }
                    if (upper.classList.contains('PbsToDif_zne4_shl01a') || upper.classList.contains('PbsToDif_zne4_tr26') || upper.classList.contains('PbsToDif_zne3_shl02') || upper.classList.contains('PbsToDif_zne3_tr02')) {
                        return;
                    }
                    if (upper.classList.contains('PbsToDif_zne1_tr01')) {
                        const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                        arrow.setAttribute('points', '-5,-5 5,0 -5,5');
                        arrow.setAttribute('class', 'arrowPbs');
                        arrow.setAttribute('transform', `translate(${x1 + 15}, ${y1}) rotate(180)`); t
                        svg.appendChild(arrow);
                    } else if (upper.classList.contains('PbsToPint_zne5_tr15')) {
                        const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                        arrow.setAttribute('points', '-5,-5 5,0 -5,5');
                        arrow.setAttribute('class', 'arrowPbs');
                        arrow.setAttribute('transform', `translate(${x1 + 30}, ${y1})`); t
                        svg.appendChild(arrow);
                    } else if (upper.classList.contains('PbsToTrim0_zne3_esa02')) {
                        const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                        arrow.setAttribute('points', '-5,-5 15,0 -5,5');
                        arrow.setAttribute('class', 'arrowPbs');
                        arrow.setAttribute('transform', `translate(${x1}, ${y1 + 15}) rotate(180)`); t
                        svg.appendChild(arrow);
                    } else if (upper.classList.contains('PbsToTrim1_zne3_esa01')) {
                        const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                        arrow.setAttribute('points', '-5,-5 15,0 -5,5');
                        arrow.setAttribute('class', 'arrowPbs');
                        arrow.setAttribute('transform', `translate(${x1}, ${y1 + 15})`); t
                        svg.appendChild(arrow);
                    } else if (upper.classList.contains('PbsToTrim0_zne3_tr44')) {
                        const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                        arrow.setAttribute('points', '-5,-5 15,0 -5,5');
                        arrow.setAttribute('class', 'arrowPbs');
                        arrow.setAttribute('transform', `translate(${x1 - 15}, ${y1})rotate(-90)`); t
                        svg.appendChild(arrow);
                    } else if (upper.classList.contains('PbsToTrim1_zne5_tr23')) {
                        const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                        arrow.setAttribute('points', '-5,-5 15,0 -5,5');
                        arrow.setAttribute('class', 'arrowPbs');
                        arrow.setAttribute('transform', `translate(${x1}, ${y1 - 15})`); t
                        svg.appendChild(arrow);
                    } else if (upper.classList.contains('PbsToTrim1_zne5_tr33')) {
                        const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                        arrow.setAttribute('points', '-5,-5 15,0 -5,5');
                        arrow.setAttribute('class', 'arrowPbs');
                        arrow.setAttribute('transform', `translate(${x1 + 15}, ${y1})rotate(-90)`); t
                        svg.appendChild(arrow);
                    } else if (upper.classList.contains('PbsToPint_zne6_tr04')) {
                        const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                        arrow.setAttribute('points', '-5,-5 15,0 -5,5');
                        arrow.setAttribute('class', 'arrowPbs');
                        arrow.setAttribute('transform', `translate(${x1 + 15}, ${y1})rotate(90)`); t
                        svg.appendChild(arrow);
                    } else if (upper.classList.contains('PbsToPint_zne7_tr12')) {
                        const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                        arrow.setAttribute('points', '-5,-5 15,0 -5,5');
                        arrow.setAttribute('class', 'arrowPbs');
                        arrow.setAttribute('transform', `translate(${x1 + 15}, ${y1})rotate(90)`); t
                        svg.appendChild(arrow);
                    } else if (upper.classList.contains('PbsToPint_zne5_tr03')) {
                        const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                        arrow.setAttribute('points', '-5,-5 15,0 -5,5');
                        arrow.setAttribute('class', 'arrowPbs');
                        arrow.setAttribute('transform', `translate(${x1 + 15}, ${y1})rotate(90)`); t
                        svg.appendChild(arrow);
                    } else if (upper.classList.contains('PbsToDif_zne1_tr13')) {
                        const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                        arrow.setAttribute('points', '-5,-5 15,0 -5,5');
                        arrow.setAttribute('class', 'arrowPbs');
                        arrow.setAttribute('transform', `translate(${x1 - 15}, ${y1})rotate(-90)`); t
                        svg.appendChild(arrow);
                    }
                    if ((x1 - x2) >= 40 || (x1 - x2) <= -40 || (y1 - y2) <= -40 || (y1 - y2) >= 40) {
                        
                    } else {
                       
                        const line = document.createElement('div');
                        line.classList.add('line');
                        line.style.width = `${length}px`;
                        line.style.transform = `translate(${x1 - 20}px, ${y1 - 75}px) rotate(${angle}deg)`;

                        container.appendChild(line);
                    }
                }
            });
        }
    }, 1000);
};
function removeAllLines() {
    const container = document.getElementById('layoutContainer');
    const existingLines = container.querySelectorAll('.line');
    existingLines.forEach(line => line.remove());
    const svg = document.getElementById('lineCanvas');
    svg.innerHTML = '';
}
//function addOrUpdateLine(lineName, dbName, priority) {
//    let line = linesData.find(l => l.line === lineName);

//    if (!line) {
//        line = {
//            line: lineName,
//            dbs: []
//        };
//        linesData.push(line);
//    }

//    let db = line.dbs.find(d => d.dbName === dbName);

//    if (!db) {
//        db = {
//            dbName: dbName,
//            minPriority: priority
//        };
//        line.dbs.push(db);
//    } else {
//        db.minPriority = priority;
//    }
//}


window.toDown = function() {
    const buttonUp = document.getElementById('buttonUp');
    const buttonDown = document.getElementById('buttonDown');
    if (buttonDown.disabled) return;
    buttonDown.disabled = true;

    setUp = false;
    removeAllLines()
    let root = document.documentElement;
    let currentOffset = parseInt(getComputedStyle(root).getPropertyValue('--vertical-offset'), 10);
    let newOffset = currentOffset - 350;
    const buttonup = document.getElementById('buttonUp');
    const buttondown = document.getElementById('buttonDown');
    const bufferItemsMain = document.querySelectorAll(`[class*="ball"]`);
    if (bufferItemsMain.length > 0) {
        bufferItemsMain.forEach((tts, index) => {
            tts.style.setProperty('opacity', '0');
            tts.style.setProperty('pointer-events', 'none');
        });
    }
    const bufferItemsPbs = document.querySelectorAll(`[class*="upper"]`, `[class*="upperlong"]`);
    if (bufferItemsPbs.length > 0) {
        bufferItemsPbs.forEach((tts, index) => {
            tts.style.setProperty('opacity', '1');
            tts.style.setProperty('pointer-events', 'auto');
        });
    }
    const bufferCharts = document.querySelectorAll(`[id*="chartContainer"]`);
    if (bufferCharts.length > 0) {
        bufferCharts.forEach((tts, index) => {
            tts.style.setProperty('opacity', '0');
            tts.style.setProperty('pointer-events','none');
        });
    }
    const bufferPbsCharts = document.querySelectorAll(`[id*="chartContainerPbs"]`);
    if (bufferPbsCharts.length > 0) {
        bufferPbsCharts.forEach((tr, index) => {
            tr.style.setProperty('opacity', '1');
            tr.style.setProperty('pointer-events', 'auto');
        });
    }

    buttonup.style.setProperty('opacity', '1');
    buttonup.style.setProperty('pointer-events', 'auto');
    buttondown.style.setProperty('opacity', '0');
    buttondown.style.setProperty('pointer-events', 'none');

    root.style.setProperty('--vertical-offset', `${newOffset}px`);
    //createLines()

    const buttonpb1 = document.getElementById('pb1');
    const buttonpb2 = document.getElementById('pb2');
    buttonpb1.style.setProperty('left', 'calc((760px + var(--horizontal-offset)) * var(--scale-factor-width))');
    buttonpb2.style.setProperty('left', 'calc((-55px + var(--horizontal-offset)) * var(--scale-factor-width))');

    let shl01a = document.getElementsByClassName('upper PbsToDif_zne4_shl01a')[0];
    shl01a.style.transition = 'top 500ms ease';
    shl01a.addEventListener('transitionend', function resetTransition() {
        shl01a.style.transition = '';
        shl01a.removeEventListener('transitionend', resetTransition);
    });
    buttonDown.addEventListener('transitionend', function resetTransition(event) {
        if (event.propertyName === 'opacity') {
            buttonDown.style.transition = '';
            buttonUp.disabled = false;
            buttonDown.removeEventListener('transitionend', resetTransition);
        }
    });
}
window.toUp = function() {
    const buttonUp = document.getElementById('buttonUp');
    const buttonDown = document.getElementById('buttonDown');
    if (buttonUp.disabled) return;
    buttonUp.disabled = true;
    setUp = true;
    removeAllLines()
    let root = document.documentElement;
    let currentOffset = parseInt(getComputedStyle(root).getPropertyValue('--vertical-offset'), 10);
    let newOffset = currentOffset + 350;
    if (!bufferHide) {
        const bufferItemsMain = document.querySelectorAll(`[class*="ball"]`);
        if (bufferItemsMain.length > 0) {
            bufferItemsMain.forEach((tts, index) => {
                tts.style.setProperty('opacity', '1');
                tts.style.setProperty('pointer-events', 'auto');
            });
        }
        const bufferCharts = document.querySelectorAll(`[id*="chartContainer"]`);
        if (bufferCharts.length > 0) {
            bufferCharts.forEach((tts, index) => {
                tts.style.setProperty('opacity', '1');
                tts.style.setProperty('pointer-events', 'auto');
            });
        }
        //createLines()
    }
    const bufferItemsPbs = document.querySelectorAll(`[class*="upper"]`, `[class*="upperlong"]`);
    if (bufferItemsPbs.length > 0) {
        bufferItemsPbs.forEach((tts, index) => {
            tts.style.setProperty('opacity', '0');
            tts.style.setProperty('pointer-events', 'none');
        });
    }
    const bufferPbsCharts = document.querySelectorAll(`[id*="chartContainerPbs"]`);
    if (bufferPbsCharts.length > 0) {
        bufferPbsCharts.forEach((tr, index) => {
            tr.style.setProperty('opacity', '0');
            tr.style.setProperty('pointer-events', 'none');
        });
    }
    buttonUp.style.setProperty('opacity', '0');
    buttonUp.style.setProperty('pointer-events', 'none');
    buttonDown.style.setProperty('opacity', '1');
    buttonDown.style.setProperty('pointer-events', 'auto');

    root.style.setProperty('--vertical-offset', `${newOffset}px`);
    
    buttonDown.addEventListener('transitionend', function resetTransition(event) {
        if (event.propertyName === 'opacity') {
            buttonDown.style.transition = '';
            buttonDown.disabled = false;
            buttonDown.removeEventListener('transitionend', resetTransition);
        }
    });
    const buttonpb1 = document.getElementById('pb1');
    const buttonpb2 = document.getElementById('pb2');
    buttonpb1.style.setProperty('left', 'calc((490px + var(--horizontal-offset)) * var(--scale-factor-width))');
    buttonpb2.style.setProperty('left', 'calc((10px + var(--horizontal-offset)) * var(--scale-factor-width))');
}
async function showAlert(message) {
    const alerta = document.getElementById('alert');
    alerta.textContent = message;
    alerta.classList.add('show');
    setTimeout(() => {
        alerta.classList.remove('show');
    }, 15000);
}
async function adjustScale() {
    removeAllLines()
    const container = document.getElementById('layoutContainer');
    const width = container.getBoundingClientRect().width;
    const height = container.getBoundingClientRect().height;
    //console.log(`height: ${height} width:${width}`)
    let factor = (width / height) / 2.1963309294400197;
    let factorWidth = width /1296;
    let factorHeight = height / 820.7999877929688;
    document.documentElement.style.setProperty('--scale-factor', factor);
    document.documentElement.style.setProperty('--scale-factor-height', factorHeight);
    document.documentElement.style.setProperty('--scale-factor-width', factorWidth);
    //console.log(`factorHeight: ${factorHeight} factorWidth:${factorWidth}`)
    //createLines();
}
window.addEventListener('resize', adjustScale);
connection.on("ReceiveMessage", (message) => {
    //showAlert(message);
});
function updateChartText(newText) {
    const chartTextElement = document.getElementById('chartText');
    chartTextElement.textContent = newText;
}

connection.on("ReceiveMqttVariable", (desiredVariable) => {
    if (typeof desiredVariable !== "string" || !desiredVariable.includes(",")) {
        console.warn("Formato inesperado de desiredVariable:", desiredVariable);
        return;
    }
    let shl01a = "";
    let newPosition;
    const values = desiredVariable.replace(/{|}/g, "").split(",");
    //console.log("Message shl: " + values[0]);
    //console.log("Message shl: " + desiredVariable);
    if (values[1] == "pb1" && values[2] == "576") {
        shl01a = document.getElementsByClassName('upper PbsToDif_zne4_shl01a')[0];
        newPosition = (555 + ((values[0] - 6529) / 200)).toString();
    }
    if (values[1] == "pb1" && values[2] == "459") {
        shl01a = document.getElementsByClassName('upper PbsToDif_zne2_shl02')[0];
        newPosition = ((675 + ((values[0] - 6529) / -190))).toString();
    }

    if (!setUp && shl01a && newPosition) {
        shl01a.style.top = `calc((${newPosition}px + var(--ver-offset-buffer-d) + var(--vertical-offset-acumulo-pbs) + var(--vertical-offset)) * var(--scale-factor-height))`;
        setTimeout(() => {
            shl01a.style.transition = 'top 3s ease';
            shl01a.addEventListener('transitionend', function resetTransition() {
                shl01a.style.transition = '';
                shl01a.removeEventListener('transitionend', resetTransition);
            });
        }, 2000);
    }
    //const endTime = performance.now();
    //console.log(`Tempo de execução: ${(endTime - startTime).toFixed(2)}ms`);
});

connection.on("PDTMonitoring", (pdtVariable) => {
    //updateApplicationState();
});

async function updatePdt(pdtState) {
    //const startTime = performance.now();
    const updates = [];

    for (const line in pdtState) {
        if (!pdtState.hasOwnProperty(line)) continue;

        const pdtCounts = pdtState[line];
        const button = document.getElementById(line);
        if (!button) continue;

        const spaces = button.querySelectorAll('.space, .spacev');
        const spacesTime = button.querySelectorAll('.space_timev, .space_timeh');

        if (spaces.length === 0) continue;

        spaces.forEach((space, index) => {
            let indexAux = index + 1;

            const indexMapping = {
                "final2": { 11: 16, 12: 2, 13: 3, 14: 13, 15: 14, 16: 15, 17: 1, 18: 17, 19: 4, 20: 11, 21: 12 },
                "chassis5": { 3: 5, 5: 3 },
                "chassis3": (i) => (i === 4 || i === 9 ? null : i > 4 ? (i >= 9 ? i - 2 : i - 1) : i),
                "chassis2": (i) => (i >= 2 ? (i >= 13 ? (i >= 15 ? i + 3 : i + 2) : i + 1) : i),
                "chassis1": (i) => (i === 3 || i === 7 ? null : i > 3 ? (i > 7 ? i - 2 : i - 1) : i),
                "portas": (i) => (i >= 7 ? (i >= 10 ? (i >= 17 ? i + 3 : i + 2) : i + 1) : i),
                "glazing": (i) => (i < 9 ? null : i - 9),
                "trim0": (i) => (i <= 2 ? null : i - 2)
            };

            if (indexMapping[line]) {
                if (typeof indexMapping[line] === "function") {
                    indexAux = indexMapping[line](indexAux);
                } else {
                    indexAux = indexMapping[line][indexAux] || indexAux;
                }
            }

            if (indexAux === null) return;

            if (!pdtCounts.hasOwnProperty(indexAux)) return;

            const pdtInfo = pdtCounts[indexAux];
            const count = pdtInfo.stopCount;
            const isActive = pdtInfo.isActive;
            let timeActive = pdtInfo.totalActiveTime || "00:00:00.000";
            let lastTimeActive = pdtInfo.lastActivatedTime || "00:00:00.000";
            let timeActiveString = timeActive.split(".")[0];

            if (isActive) {
                activePDTs.set(`line:${line}:${index}`, {
                    el: spacesTime[index],
                    lastTimeActive,
                    totalActive: timeActiveString
                });
            } else {
                activePDTs.delete(`line:${line}:${index}`);
            }

            updates.push(() => {
                if (count !== 0) {
                    space.textContent = count;
                    if (spacesTime.length > 0) {
                        spacesTime[index].textContent = isActive
                            ? addTimes(calculateTimeDifference(lastTimeActive), timeActiveString)
                            : timeActiveString;
                    }
                } else {
                    space.textContent = "";
                    if (spacesTime.length > 0) {
                        spacesTime[index].textContent = "";
                    }
                }
                space.style.backgroundColor = isActive ? '#ff000040' : 'transparent';
            });
        });
    }

    requestAnimationFrame(() => {
        updates.forEach(update => update());
    });
}
//connectionData.on("ReceiveApplicationStateBuffer", (bufferState) => {
//    for (const line in bufferState) {
//        const bufferItems = document.querySelectorAll(`[class*="${line}_zne"]`);
//        let count = 0;
//        let aux = 0;

//        if (bufferItems.length > 0 && bufferState.hasOwnProperty(line)) {
//            const buffer = bufferState[line];

//            bufferItems.forEach((tts, index) => {
//                const tooltip = tts.querySelector('.tooltip');
//                if (tooltip) {
//                    if (!tooltip.dataset.original) {
//                        tooltip.dataset.original = tooltip.textContent.trim();
//                    }
//                }
//                const bufferInfo = buffer[index];
//                if (bufferInfo) {
//                    const bActive = bufferInfo.isActive;
//                    var cis = bufferInfo.cis || "";
//                    if (tooltip) {
//                        if (cis != "") {
//                            tooltip.textContent = `${tooltip.dataset.original}\n${cis}`;
//                        } else {
//                            tooltip.textContent = `${tooltip.dataset.original}`;
//                        }
//                    }
//                    if (buffer.hasOwnProperty(index) && bActive) {
//                        const classListString = tts.className;


//                        if (classListString.includes('PbsToDif')) {
//                            tts.style.backgroundColor = '#9B59B6';
//                            count++;
//                        } else if (classListString.includes('PbsToTrim1')) {
//                            tts.style.backgroundColor = '#1E6091';
//                            count++;
//                        } else if (classListString.includes('PbsToPint') || classListString.includes('trim')) {
//                            tts.style.backgroundColor = '#C65D14';
//                            count++;
//                        } else if (classListString.includes('PbsToTrim0')) {
//                            tts.style.backgroundColor = '#6ba82c';
//                            count++;
//                        } else {
//                            tts.style.backgroundColor = '#6ba82c';
//                            count++;
//                        }
//                    } else {
//                        tts.style.backgroundColor = '#5c5c5c';
//                    }
//                    aux++;
//                }
//            });
//        } else {
//            console.log(`Nenhum item encontrado para a linha ${line}`);
//        }

//        const chartText = document.getElementById(`chartText${line}`);
//        if (chartText) {
//            chartText.textContent = count;
//        }
//    }
//});

export async function updateBuffer(bufferState) {
    const updates = [];
    //console.log("BufferFrame (frameTime = ):", bufferState);
    for (const line in bufferState) {
        const bufferItems = document.querySelectorAll(`[class*="${line}_zne"]`);
        let count = 0;

        if (bufferItems.length === 0 || !bufferState.hasOwnProperty(line)) {
            //console.log(`Nenhum item encontrado para a linha ${line}`);
            continue;
        }

        const buffer = bufferState[line];

        bufferItems.forEach((tts, index) => {
            //const tooltip = tts.querySelector('.tooltip');
            //if (tooltip && !tooltip.dataset.original) {
            //    tooltip.dataset.original = tooltip.textContent.trim();
            //}

            const bufferInfo = buffer[index];
            if (!bufferInfo) return;

            const bActive = bufferInfo.isActive;
            const cis = bufferInfo.cis || "";

            updates.push(() => {
                //if (tooltip) {
                //    tooltip.textContent = cis ? `${tooltip.dataset.original}\n${cis}` : tooltip.dataset.original;
                //}

                if (!bActive) {
                    tts.style.backgroundColor = '#5c5c5c';
                    return;
                }

                const colorMap = {
                    'PbsToDif': '#9B59B6',
                    'PbsToTrim1': '#1E6091',
                    'PbsToPint': '#C65D14',
                    'trim': '#C65D14',
                    'PbsToTrim0': '#6ba82c',
                    'default': '#6ba82c'
                };

                let appliedColor = colorMap['default'];
                for (const key in colorMap) {
                    if (tts.className.includes(key)) {

                        appliedColor = colorMap[key];
                        break;
                    }
                }

                tts.style.backgroundColor = appliedColor;
                count++;
            });
        });

        const chartText = document.getElementById(`chartText${line}`);
        if (chartText) {
            updates.push(() => {
                chartText.textContent = count;
            });
        }
    }

    requestAnimationFrame(() => {
        updates.forEach(update => update());
    });
    //const endTime = performance.now();
    //console.log(`Tempo de execução: ${(endTime - startTime).toFixed(2)}ms`);
}

export async function updateStatus(statusState) {
    //const startTime = performance.now();
    //console.log("prodData.prodData:\n" + JSON.stringify(statusState, null, 2));
    Object.keys(statusState).forEach(line => {
        try {
            const data = statusState[line];
            const lastFaultTime = data.lastFaultTime ? new Date(data.lastFaultTime) : null;


            const btnLine = document.getElementById(line);

            const minPriority = statusState[line].lowestStatusActive
            const lastFault = statusState[line].lastMessage;
            if (lastFault == undefined) {
                return;
            }
            const [zonePart, ...descriptionParts] = lastFault.split(':');

            const formattedZone = zonePart.trim().charAt(0).toUpperCase() + zonePart.trim().slice(1).toLowerCase();

            const descriptionText = descriptionParts.join(':').trim();
            const formattedDescription = descriptionText.charAt(0).toUpperCase() + descriptionText.slice(1).toLowerCase();

            if ((data.lowestStatusActive === 1 || data.lowestStatusActive === 2) && lastFaultTime) {
                activeFaults[line] = {
                    message: data.lastMessage,
                    startTime: lastFaultTime // vindo do back-end
                };
            } else {
                delete activeFaults[line];
            }

            if (btnLine) {
                const containerFault = btnLine.querySelector(".fault_text");
                const color = prioritiesColors[minPriority] || prioritiesColors[19];
                btnLine.style.setProperty('--alert-color', color + transpColor);
                if (line.includes('goma')) {
                    const childElements = btnLine.querySelectorAll("[id^='goma']");
                    childElements.forEach(child => {
                        child.style.borderColor = color;
                    });
                }
                btnLine.style.backgroundColor = color + transpColor;
                btnLine.style.borderColor = color;
                //btnLine.style.borderColor = '#606060';

                //const isFault = minPriority === 1 || minPriority === 2;

                //btnLine.style.setProperty('--alert-color', color + transpColor);

                //if (isFault && !btnLine.classList.contains("blink-dynamic")) {
                //    void btnLine.offsetWidth;
                //    btnLine.classList.add("blink-dynamic");
                //} else {
                //    btnLine.classList.remove("blink-dynamic");
                //    btnLine.style.backgroundColor = color + transpColor;
                //}

                if (containerFault) {
                    const description = prioritiesDescription[minPriority] || prioritiesDescription[19];
                    containerFault.textContent = description;

                    if (lastFault != "" && (minPriority == 1 || minPriority == 2)) {

                        const formattedLastFault = `${formattedZone}: ${formattedDescription}`;
                        containerFault.innerHTML = `Falha:<br><span style="font-size: 0.8em;">${formattedLastFault}</span>`;
                    }
                }
            }
        } catch (err){
            console.error("Erro em UpdateStatus:", err);
        }
        
    });
    updateFaultListUI();
    //const endTime = performance.now();
    //console.log(`Tempo de execução: ${(endTime - startTime).toFixed(2)}ms`);
}


function updateFaultListUI() {
    const faultListContainer = document.getElementById("faultList");
    const currentKeys = new Set(Object.keys(activeFaults));

    // 1. Marcar para remoção os que não estão mais ativos
    const existingEntries = faultListContainer.querySelectorAll(".fault-entry");
    existingEntries.forEach(entry => {
        const line = entry.dataset.line;
        if (!currentKeys.has(line)) {
            entry.classList.remove("show");
            entry.classList.add("hide");

            // Remover após a animação (0.5s = 500ms)
            setTimeout(() => {
                entry.remove();
            }, 500);
        }
    });

    // 2. Adicionar ou atualizar os ativos
    Object.entries(activeFaults).forEach(([line, fault]) => {
        // Se já existe, atualiza tempo
        let entry = faultListContainer.querySelector(`.fault-entry[data-line="${line}"]`);
        const duration = calculateTimeDifference(fault.startTime);
        const [zone, ...descParts] = fault.message.split(":");
        const description = descParts.join(":").trim();

        if (!entry) {
            // Novo: criar elemento
            entry = document.createElement("div");
            entry.className = "fault-entry";
            entry.dataset.line = line;
            faultListContainer.appendChild(entry);
            setTimeout(() => {
                entry.classList.add("show");
            }, 500);
        }

        // Atualizar conteúdo sempre
        entry.innerHTML = `
            <strong>${line.toUpperCase()}</strong> - ${zone.trim()}<br>
            ${description}<br>
            <span class="fault-time">Ativo há ${duration}</span>
        `;
    });
}
setInterval(refreshFaultDurations, 1000);
function refreshFaultDurations() {
    document.querySelectorAll("#faultList .fault-entry").forEach(entry => {
        const line = entry.dataset.line;
        if (activeFaults[line]) {
            const duration = calculateTimeDifference(activeFaults[line].startTime);
            const timeSpan = entry.querySelector(".fault-time");
            if (timeSpan) {
                timeSpan.textContent = `Ativo há ${duration}`;
            }
        }
    });
}

async function updateProd(prodData) {
    //const startTime = performance.now();
    const facHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--scale-factor-height').trim());
    const facWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--scale-factor-width').trim());

    document.getElementById("targetProd").innerText = `Meta de Produção: ${prodData.targetProd}`;
    document.getElementById("theoreticalProd").innerText = `Produção Teórica: ${prodData.theoreticalProd}`;
    //console.log("prodData.prodData:\n" + JSON.stringify(prodData.prodData, null, 2));
    for (const line in prodData.prodData) {
        const targetProd = prodData.targetProd || 1;
        const theoreticalProd = prodData.theoreticalProd || 1;
        const actualProd = prodData.prodData[line].actualProd || 0;
        const gapProd = prodData.prodData[line].gapProd || 0;
        const lossAnomalia = prodData.prodData[line].lossAnomalia || 0;
        const lossProducao = prodData.prodData[line].lossProducao || 0;
        const lossOutros = prodData.prodData[line].lossOutros || 0;
        const percentProd = ((actualProd / targetProd) * 100).toFixed(1);
        const percentTarget = ((theoreticalProd / targetProd) * 100).toFixed(1);

        const result = gapProd + theoreticalProd;
        let percentageColor = Math.max(0, Math.min(1, result / theoreticalProd));

        const button = document.getElementById(line);

        const chart = window.chartInstances[line];


        if (button) {
            const progressTexts = button.querySelectorAll('.progress-text');
            const actualProdInter = button.querySelector('.total-OPE');
            const objAnomalia = button.querySelector('.loss-anomalia .value');
            const objProd = button.querySelector('.loss-producao .value');
            const objOutros = button.querySelector('.loss-outros .value');
            //console.log(line + " lossAnomalia: " + lossAnomalia + " lossProducao: " + lossProducao + " lossOutros: " + lossOutros)

            if (actualProdInter) actualProdInter.textContent = actualProd;
            if (objAnomalia) objAnomalia.textContent = lossAnomalia;
            if (objProd) objProd.textContent = lossProducao;
            if (objOutros) objOutros.textContent = lossOutros;

            //if (chart && gapProd != null) {
            //    // Monta o objeto { prioridade: minutos }
            //    const priorities = chart.data.datasets[0]._meta
            //        ? chart.data.datasets[0]._meta[Object.keys(chart.data.datasets[0]._meta)[0]].data
            //        : chart.data.datasets[0].data; // ajuste caso precise

            //    // Alternativa: usa updatedStateData (já processado no renderStateChart)
            //    const updatedStateData = window.updatedStateDataByLine ? window.updatedStateDataByLine[line] : null;

            //    // Prioridades
            //    const anomaliaPrio = [1, 2, 15, 16];
            //    const producaoPrio = [5, 7, 8, 10, 11, 12, 17];
            //    const outrosPrio = [6, 9];

            //    let sumAnomalia = 0, sumProducao = 0, sumOutros = 0, sumTotal = 0;
                
            //    if (updatedStateData) {
            //        updatedStateData.forEach(item => {
            //            //sumTotal += Number(item.duration);
            //            if (anomaliaPrio.includes(item.state)) sumAnomalia += Number(item.duration);
            //            if (producaoPrio.includes(item.state)) sumProducao += Number(item.duration);
            //            if (outrosPrio.includes(item.state)) sumOutros += Number(item.duration);
            //        });
            //    }
            //    sumTotal = sumAnomalia + sumProducao + sumOutros;
            //    var ngapProd = gapProd * (-1);
            //    console.log("sumAnomalia: " + sumAnomalia + " sumTotal: " + sumTotal + " sumOutros: " + sumOutros + " gapProd: " + ngapProd);
            //    const realLossAnomalia = (sumAnomalia / sumTotal) * ngapProd;
            //    const realLossProducao = (sumProducao / sumTotal) * ngapProd;
            //    const realLossOutros = (sumOutros / sumTotal) * ngapProd;

            //    // Calcula as perdas proporcionais
            //    const lossAnomalia = safeLoss(sumAnomalia, sumTotal, ngapProd);
            //    const lossProducao = safeLoss(sumProducao, sumTotal, ngapProd);
            //    const lossOutros = safeLoss(sumOutros, sumTotal, ngapProd);
            //    let somaLoss = lossAnomalia + lossProducao + lossOutros;
            //    let diff = ngapProd - somaLoss;
            //    const decimais = [
            //        { key: 'anomalia', value: realLossAnomalia - lossAnomalia },
            //        { key: 'producao', value: realLossProducao - lossProducao },
            //        { key: 'outros', value: realLossOutros - lossOutros }
            //    ];
            //    decimais.sort((a, b) => b.value - a.value);

            //    for (let i = 0; i < diff; i++) {
            //        if (decimais[i % 3].key === 'anomalia') lossAnomalia++;
            //        else if (decimais[i % 3].key === 'producao') lossProducao++;
            //        else if (decimais[i % 3].key === 'outros') lossOutros++;
            //    }

            //    console.log(line +" lossAnomalia: " + lossAnomalia + " lossProducao: " + lossProducao)
            //    // Atualiza na interface
            //    const elAnomalia = button.querySelector('.loss-anomalia');
            //    const elProducao = button.querySelector('.loss-producao');
            //    const elOutros = button.querySelector('.loss-outros');
            //    if (elAnomalia) elAnomalia.innerText = lossAnomalia;
            //    if (elProducao) elProducao.innerText = lossProducao;
            //    if (elOutros) elOutros.innerText = lossOutros;
            //}
            // Fim dos calculos das perdas ///////////////////////////////////////////////////////////////////////
            

            if (progressTexts.length >= 2) {

                //progressTexts[0].textContent = `${percentProd}%`;            // Percentual
                progressTexts[0].textContent = `D. ${gapProd}`;    // Produção atual
                progressTexts[1].textContent = `P. ${actualProd}`;       // Diferença de produção

                progressTexts[0].style.backgroundColor = gapProd < 0 ? "#C0392B80" : "#2E8B5780";
            }

            const progressActualH = button.querySelector('.progress-actual.atual-h');
            const progressActualV = button.querySelector('.progress-actual.atual-v');
            const progressTargetH = button.querySelector('.progress-target.target-h');
            const progressTargetV = button.querySelector('.progress-target.target-v');

            requestAnimationFrame(() => {
                if (progressActualH && progressTargetH) {
                    if (!progressActualH.dataset.width || progressActualH.dataset.width !== percentProd) {
                        progressActualH.style.width = `${percentProd}%`;
                        progressActualH.dataset.width = percentProd;
                    }

                    if (!progressTargetH.dataset.left || progressTargetH.dataset.left !== percentTarget) {
                        progressTargetH.style.left = `${percentTarget}%`;
                        progressTargetH.dataset.left = percentTarget;
                    }
                }

                if (progressActualV && progressTargetV) {
                    if (!progressActualV.dataset.height || progressActualV.dataset.height !== percentProd) {
                        progressActualV.style.height = `${percentProd}%`;
                        progressActualV.dataset.height = percentProd;
                    }

                    if (!progressTargetV.dataset.bottom || progressTargetV.dataset.bottom !== percentTarget) {
                        progressTargetV.style.bottom = `${percentTarget}%`;
                        progressTargetV.dataset.bottom = percentTarget;
                    }
                }

                const c1 = hexToRgb("#C0392B");
                const c2 = hexToRgb("#2E8B57");
                const r = Math.round(c1.r + (c2.r - c1.r) * percentageColor);
                const g = Math.round(c1.g + (c2.g - c1.g) * percentageColor);
                const b = Math.round(c1.b + (c2.b - c1.b) * percentageColor);
                if (progressActualV) {
                    progressActualV.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
                } else if (progressActualH) {
                    progressActualH.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
                }
            });

            const progressInfo = button.querySelector('.progress-info');

            if (progressInfo) {
                if (!button.dataset.width) button.dataset.width = button.offsetWidth;
                if (!button.dataset.height) button.dataset.height = button.offsetHeight;

                const buttonWidth = parseInt(button.dataset.width) / facWidth;
                const buttonHeight = parseInt(button.dataset.height) / facHeight;

                requestAnimationFrame(() => {
                    if (buttonWidth < buttonHeight) {
                        progressInfo.style.justifyContent = buttonHeight < 220 ? "space-between" : "flex-end";
                    } else {
                        progressInfo.style.justifyContent = buttonWidth < 220 ? "space-between" : "flex-end";
                    }
                });
            }
        }
    }
    //const endTime = performance.now();
    //console.log(`Tempo de execução: ${(endTime - startTime).toFixed(2)}ms`);
}
function safeLoss(sum, sumTotal, gapProd) {
    if (!sumTotal || !gapProd || !sum) return 0;
    return Math.max(0, Math.floor((sum / sumTotal) * gapProd));
} 
//window.addEventListener("beforeunload", () => {
//    if (connection) {
//        connection.stop();
//    }
//    if (connectionData) {
//        connectionData.stop();
//    }
//    cleanUpDOM();
//});
connectionData.on("ReceiveCurrentDateTime", (dateTime) => {
    console.log(dateTime)
    globalDateTime = new Date(dateTime);
    const currentDateTimeElement = document.getElementById("currentDateTime");
    if (currentDateTimeElement) {
        currentDateTimeElement.textContent = "Data e Hora: " + globalDateTime.toLocaleString("pt-BR");
    }
});

connectionData.on("ReceiveApplicationStatePDT", (pdtState) => {
    updatePdt(pdtState);
});
connectionData.off("ReceiveApplicationStateBuffer");
connectionData.on("ReceiveApplicationStateBuffer", (bufferState) => {
    
    if (!replayMode) {
        updateBuffer(bufferState);
    }
});
connectionData.on("ReceiveApplicationStateStatus", (statusState) => {
    //console.log("Chegodoasdjoajdoasjdoas")
    if (!replayMode) {
        updateStatus(statusState);
    }
});
connectionData.on("ReceiveApplicationBufferAc", (buffHist) => {
    updateChartsWithHistory(buffHist);
});
connectionData.on("ReceiveApplicationProdData", (prodData) => {
    //console.log("Chegodoasdjoajdoasjdoas")  
    updateProd(prodData);
});
connectionData.start()
    .then(() => {
        //initializeState();
        //updateApplicationState();
        console.log("SignalR connection Data established");
    })        
    .catch(err => console.error("Error establishing SignalR connection Data:", err));

connectionData.onclose(async () => {
    console.log("SignalR Data connection closed. Attempting to reconnect...");
    try {
        await connectionData.start();
        console.log("SignalR Data reconnected");
    } catch (err) {
        console.error("Error reconnecting SignalR Data:", err);
    }
});
connection.start()
    .then(() => console.log("SignalR connection established"))
    .catch(err => console.error("Error establishing SignalR connection:", err));
    
connection.onclose(async () => {
    console.log("SignalR connection closed. Attempting to reconnect...");
    try {
        await connection.start();
        console.log("SignalR reconnected");
    } catch (err) {
        console.error("Error reconnecting SignalR:", err);
    }
});
export async function initializeState() {
    const CACHE_KEY = 'initial_app_state';
    const CACHE_DURATION = 120000; // 1 min

    const cachedData = JSON.parse(localStorage.getItem(CACHE_KEY));
    const initialData = window.__INITIAL_STATE__;

    if (!initialData) return;

    if (cachedData && (globalDateTime - cachedData.timestamp < CACHE_DURATION)) {
        // Usa cache válido
        applyInitialState(cachedData.data);
        console.log('Dados carregados do cache.');
    } else if (initialData) {
        // Usa dados embutidos no HTML
        applyInitialState(initialData);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data: initialData, timestamp: globalDateTime }));
        console.log('Dados carregados do HTML.');
    } else {
        // Caso extremo, fallback para fetch
        fetch('/data/update-state', { method: 'POST' })
            .then(() => console.log('Estado atualizado via backend'))
            .catch(err => console.error('Erro ao atualizar estado:', err));
    }
}
function applyInitialState(data) {
    updateChartsWithHistory(data.BufferAc);
    // outras funções de update:
    updatePdt(data.PdtData);
    updateBuffer(data.BufferData);
    updateStatus(data.StatusData);
    updateProd(data.ProdData);
}
//document.addEventListener("DOMContentLoaded", () => {
//    const data = window.__INITIAL_STATE__;
//    if (!data) return;

//    try {
//        if (data.BufferData) {
//            updateBuffer(data.BufferData);
//        }
//        //if (data.pdtData) {
//        //    updatePdt(data.pdtData);
//        //}
//        if (data.StatusData) {
//            updateStatus(data.StatusData);
//        }
//        //if (data.prodData) {
//        //    updateProd(data.prodData);
//        //}
//        if (data.BufferAc) {
//            updateChartsWithHistory(data.BufferAc);
//        }
//    } catch (e) {
//        console.warn("Erro ao interpretar dados iniciais:", e);
//    }
//});


async function updateApplicationState() {
    console.log('Estado tentando atualizar!');
    fetch('/data/update-state', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    }).then(() => {
        console.log('Estado enviado para atualização!');
    }).catch(err => {
        console.error('Erro ao enviar atualização:', err);
    });
}
document.addEventListener('DOMContentLoaded', async () => {
    const tableElement = document.getElementById('productsTable');

    dataTable = new DataTable(tableElement, {
        data: [],
        columns: [
            { data: 'line', title: 'Line' },
            { data: 'events', title: 'Events' },
            { data: 'state', title: 'State' },
            { data: 'zone', title: 'Zone' },
            { data: 'element', title: 'Element' },
            { data: 'duration', title: 'Duration' },
            {
                data: 'data',
                title: 'Data',
                render: (data) => new Date(data).toLocaleString()
            },
            { data: 'shift', title: 'Shift' }
        ]
    });
});
document.querySelectorAll('.showTableBtn').forEach(elem => {
    elem.addEventListener('click', async (event) => {
        event.stopPropagation();
        const tableWrapper = document.getElementById('productsTableWrapper');
        const parentButton = event.target.closest('button');
        const loaderContainer = document.getElementById('loaderContainer');
        
        if (getComputedStyle(tableWrapper).display !== 'none') {
            return;
        }
        if (parentButton) {
            buttonId = parentButton.id;
        } else {
            console.warn("Nenhum botão encontrado como ancestral do elemento clicado.");
        }
        try {
            dataTable.clear().draw();
            tableWrapper.style.display = 'block';
            loaderContainer.textContent = 'Carregando...';
            loaderContainer.style.display = 'block';
            const response = await fetch(`/api/events/events?line=${encodeURIComponent(buttonId)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                loaderContainer.textContent = `Erro ao buscar os dados: ${response.statusText}`;
                throw new Error(`Erro ao buscar os dados: ${response.statusText}`);
            }

            const newData = await response.json();

            
            dataTable.rows.add(newData);
            dataTable.draw();

        } catch (error) {
            console.error("Erro ao atualizar a tabela:", error);
        } finally {
            loaderContainer.style.display = 'none';
        }
    });
});

document.getElementById('applyFilterBtn').addEventListener('click', async () => {
    const filterDateInit = document.getElementById('filterDateInit').value;
    const filterDateFinal = document.getElementById('filterDateFinal').value;
    const filterTimeInit = document.getElementById('filterTimeInit').value;
    const filterTimeFinal = document.getElementById('filterTimeFinal').value;

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

    const loaderContainer = document.getElementById('loaderContainer');
    loaderContainer.textContent = 'Carregando...';
    loaderContainer.style.display = 'block';

    try {
        const response = await fetch(`/api/events/events?line=${encodeURIComponent(buttonId)}&filterDateTimeInit=${encodeURIComponent(filterDateTimeInit)}&filterDateTimeFinal=${encodeURIComponent(filterDateTimeFinal)}`);

        if (!response.ok) {
            throw new Error(`Erro ao buscar os dados: ${response.statusText}`);
        }

        const data = await response.json();
        //console.log("Dados filtrados:", data);

        dataTable.clear();
        dataTable.rows.add(data);
        dataTable.draw();
    } catch (error) {
        console.error("Erro ao aplicar os filtros:", error);
    } finally {
        loaderContainer.style.display = 'none';
    }
});
document.getElementById('clearFilterBtn').addEventListener('click', async () => {
    document.getElementById('filterDateInit').value = '';
    document.getElementById('filterDateFinal').value = '';
    document.getElementById('filterTimeInit').value = '';
    document.getElementById('filterTimeFinal').value = '';

    const loaderContainer = document.getElementById('loaderContainer');
    loaderContainer.textContent = 'Carregando...';
    loaderContainer.style.display = 'block';

    try {
        const response = await fetch(`/api/events/events?line=${encodeURIComponent(buttonId)}`);
        if (!response.ok) {
            throw new Error(`Erro ao buscar os dados: ${response.statusText}`);
        }

        const data = await response.json();

        const tableElement = document.getElementById('productsTable');
        const dataTable = new DataTable(tableElement);
        dataTable.clear();
        dataTable.rows.add(data);
        dataTable.draw();
    } catch (error) {
        console.error("Erro ao limpar os filtros:", error);
    } finally {
        loaderContainer.style.display = 'none';
    }
});

setInterval(() => {
    activePDTs.forEach((info, key) => {
        const liveDiff = calculateTimeDifference(info.lastTimeActive);
        const total = addTimes(info.totalActive, liveDiff);
        info.el.textContent = total;
    });
}, 1000);

setInterval(() => {
    console.clear();
}, 600000);