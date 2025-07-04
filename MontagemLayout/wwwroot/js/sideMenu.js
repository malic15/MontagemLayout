import { setReplayMode } from '/js/mqttWebSocket.js';

var bufferHide = false;

document.getElementById("sideMenuOpenBtn").onclick = function () {
    document.getElementById("sideMenu").classList.add("open");
};
document.getElementById("sideMenuCloseBtn").onclick = function() {
    document.getElementById("sideMenu").classList.remove("open");
};

document.addEventListener("mousedown", function(e){
    const sideMenu = document.getElementById("sideMenu");
    if (
    sideMenu.classList.contains("open") &&
    !sideMenu.contains(e.target) &&
    e.target.id !== "sideMenuOpenBtn"
    ) {
        sideMenu.classList.remove("open");
    }
});

document.querySelectorAll('.side-menu-item').forEach(item => {
    item.addEventListener('click', function (e) {
        
        // Remove a classe 'active' de todos
        document.querySelectorAll('.side-menu-item').forEach(el => {
            if (el.textContent.trim().includes('Replay')) {
                replayButton(el, this)
            }
            if (el.textContent.trim().includes('Esconder Acúmulo')) {
                hideBuffer(el, this)
            }
            el.classList.remove('active')
        });
        // Adiciona ao clicado
        this.classList.add('active');
    });
});

function replayButton(itemReplay, itemActive) {
    var isReplayActive = itemReplay.classList.contains('active');
    var replayPanel = document.getElementById("replayPainel");

    if ((itemActive.textContent.trim().includes('Replay') && !isReplayActive) || (!itemActive.textContent.trim().includes('Replay') && isReplayActive)) {
        setReplayMode();
    }
    if (itemActive.textContent.trim().includes('Replay')) {
        replayPanel.style.setProperty('opacity', '1');
        replayPanel.style.setProperty('pointer-events', 'auto');
    } else {
        replayPanel.style.setProperty('opacity', '0');
        replayPanel.style.setProperty('pointer-events', 'none');
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