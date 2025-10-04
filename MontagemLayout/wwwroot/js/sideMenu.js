import { setReplayMode, initializeState, globalDateTime } from '/js/mqttWebSocket.js';
import { renderProdTable } from '/js/prodTable.js';

var bufferHide = false;
const formatDay = d =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

//document.getElementById("sideMenuOpenBtn").onclick = function () {
//    document.getElementById("sideMenu").classList.add("open");
//};
//document.getElementById("sideMenuCloseBtn").onclick = function() {
//    document.getElementById("sideMenu").classList.remove("open");
//};

//document.addEventListener("mousedown", function(e){
//    const sideMenu = document.getElementById("sideMenu");
//    if (
//    sideMenu.classList.contains("open") &&
//    !sideMenu.contains(e.target) &&
//    e.target.id !== "sideMenuOpenBtn"
//    ) {
//        sideMenu.classList.remove("open");
//    }
//});

//document.querySelectorAll('.side-menu-item').forEach(item => {
//    item.addEventListener('click', function (e) {
        
//        // Remove a classe 'active' de todos
//        document.querySelectorAll('.side-menu-item').forEach(el => {
//            if (el.textContent.trim().includes('Replay')) {
//                replayButton(el, this)
//            }
//            if (el.textContent.trim().includes('Esconder Acúmulo')) {
//                hideBuffer(el, this)
//            }
//            if (el.textContent.trim().includes('Layout')) {
//                layoutMode(el, this)
//            }
//            el.classList.remove('active')
//        });
//        // Adiciona ao clicado
//        this.classList.add('active');
//    });
//});

function replayButton(itemReplay, itemActive) {
    var isReplayActive = itemReplay.classList.contains('active');
    var replayPanel = document.getElementById("replayPainel");
    const faultListHeader = document.getElementById("faultListHeader");
    const faultList = document.getElementById("faultList");


    if ((itemActive.textContent.trim().includes('Replay') && !isReplayActive) || (!itemActive.textContent.trim().includes('Replay') && isReplayActive)) {
        setReplayMode();
    }
    if (itemActive.textContent.trim().includes('Replay')) {
        replayPanel.style.setProperty('opacity', '1');
        replayPanel.style.setProperty('pointer-events', 'auto');
        faultListHeader.style.setProperty('opacity', '0');
        faultList.style.setProperty('opacity', '0');
    } else {
        replayPanel.style.setProperty('opacity', '0');
        replayPanel.style.setProperty('pointer-events', 'none');
        faultListHeader.style.setProperty('opacity', '1');
        faultList.style.setProperty('opacity', '1');
    }
}
function hideBuffer(itemAcumulo, itemActive) {
    if ((itemActive.textContent.trim().includes('Esconder Acúmulo') && bufferHide) || (!itemActive.textContent.trim().includes('Esconder Acúmulo') && !bufferHide)) {
        return;
    }
    var buffer = document.querySelectorAll('.ball');
    const bufferCharts = document.querySelectorAll('[id*="chartContainer"]:not([id*="chartContainerPbs"])');
    if (bufferHide) {
        buffer.forEach((tts, index) => {
            tts.style.setProperty('opacity', '1');
            tts.style.setProperty('pointer-events', 'auto');
        });
        if (bufferCharts.length > 0) {
            bufferCharts.forEach((tts, index) => {
                tts.style.setProperty('opacity', '1');
                tts.style.setProperty('pointer-events', 'auto');
            });
        }
        bufferHide = false;
    } else {
        buffer.forEach((tts, index) => {
            tts.style.setProperty('opacity', '0');
            tts.style.setProperty('pointer-events', 'none');
        });
        if (bufferCharts.length > 0) {
            bufferCharts.forEach((tts, index) => {
                tts.style.setProperty('opacity', '0');
                tts.style.setProperty('pointer-events', 'none');
            });
        }
        bufferHide = true;
    }
}
function layoutMode(itemLayout, itemActive) {
    var isLayoutActive = itemLayout.classList.contains('active');
    var isLayoutItem = itemActive.textContent.trim().includes('Layout');

    if (isLayoutActive && isLayoutItem) {
        return;
    } else if (!isLayoutActive && isLayoutItem) {
        initializeState();
    }
}
async function prodView(itemProd, itemActive) {
    var isItemActive = itemActive.textContent.trim().includes('Tabela Produção')
    var prodTable = document.getElementById("prodDiaryTable");
    const isVisible = getComputedStyle(prodTable).opacity === '1';
    if (isItemActive) {
        if (!isVisible) {
            const inputEl = document.getElementById('dayProd');
            inputEl.value = '';
            inputEl.valueAsDate = null;

            const d = (globalDateTime instanceof Date) ? globalDateTime : new Date(globalDateTime);
            if (Number.isNaN(d)) throw new Error('globalDateTime inválido');
            const day = (typeof globalDateTime !== 'undefined')
                ? formatDay(d)
                : formatDay(new Date());
            const qs = new URLSearchParams({ day });
            renderProdTable(qs);
            prodTable.style.setProperty('opacity', '1');
            prodTable.style.setProperty('pointer-events', 'auto');
        }
    } else {
        prodTable.style.setProperty('opacity', '0');
        prodTable.style.setProperty('pointer-events', 'none');
    }
}

const toggleButton = document.getElementById("toggle-button");
const sidebar = document.getElementById("sidebar");

const openIcon = toggleButton.querySelector(".bx-caret-left");
const closeIcon = toggleButton.querySelector(".bx-caret-right");

closeIcon.style.display = "none";

toggleButton.addEventListener("click", () => {
    sidebar.classList.toggle("active");

    if (sidebar.classList.contains("active")) {
        openIcon.style.display = "none";
        closeIcon.style.display = "block";
    } else {
        openIcon.style.display = "block";
        closeIcon.style.display = "none";
    }
});

document.addEventListener("mousedown", function (e) {
    //const sidebar = document.getElementById("sidebar");
    const toggleBtn = document.getElementById("toggle-button");
    if (
        sidebar.classList.contains("active") &&
        !sidebar.contains(e.target) &&
        e.target !== toggleBtn
    ) {
        sidebar.classList.remove("active");
    }
    if (sidebar.classList.contains("active")) {
        openIcon.style.display = "none";
        closeIcon.style.display = "block";
    } else {
        openIcon.style.display = "block";
        closeIcon.style.display = "none";
    }
});

document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', function (e) {
        // Remove 'nav-active' de todos
        document.querySelectorAll('.menu-item').forEach(el => {
            // Suas funções personalizadas:
            if (el.textContent.trim().includes('Replay')) {
                replayButton(el, this);
            }
            if (el.textContent.trim().includes('Esconder Acúmulo')) {
                hideBuffer(el, this);
            }
            if (el.textContent.trim().includes('Layout')) {
                layoutMode(el, this);
            }
            if (el.textContent.trim().includes('Tabela Produção')) {
                prodView(el, this);
            }
            el.classList.remove('nav-active');
        });
        // Adiciona ao clicado
        this.classList.add('nav-active');
    });
}); 