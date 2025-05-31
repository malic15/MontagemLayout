import { updateBuffer } from '/js/mqttWebSocket.js';

let replayData = [];
let replayFrames = [];
let replayTimestamps = [];
let replayInterval = null;
let replayIndex = 0;
let isPlaying = false;
let replayMode = false;

// Função para buscar e preparar os dados
async function loadReplayData(start, end) {
    const res = await fetch(`/data/buffer-replay?start=${start.toISOString()}&end=${end.toISOString()}`);
    replayData = await res.json();
    replayFrames = [];
    replayTimestamps = [];
    // Agrupar por timestamp
    const map = {};
    replayData.forEach(snap => {
        const t = new Date(snap.timestamp).getTime();
        if (!map[t]) map[t] = [];
        map[t].push(snap);
    });
    replayTimestamps = Object.keys(map).sort((a, b) => a - b).map(Number);
    replayFrames = replayTimestamps.map(t => map[t]);
    document.getElementById("replaySlider").max = replayFrames.length - 1;
}

// Função para aplicar frame
//function applyReplayFrame(frame) {
    
//    // Sua lógica de aplicar cada frame (igual ao exemplo anterior)
//    if (!frame || !Array.isArray(frame)) return;
//    frame.forEach(snap => {
//        const selector = `[class*="${snap.line}_zne"]`;
//        const elements = document.querySelectorAll(selector);
//        if (!elements[snap.position]) return;
//        const tts = elements[snap.position];
//        if (!snap.isActive) {
//            tts.style.backgroundColor = '#5c5c5c';
//        } else {
//            // Aplique seu colorMap aqui
//            tts.style.backgroundColor = '#6ba82c'; // só exemplo
//        }
//    });
//}
// Função auxiliar
function frameToBufferState(frame) {
    const bufferState = {};
    frame.forEach(snap => {
        if (!bufferState[snap.line]) bufferState[snap.line] = [];
        bufferState[snap.line][snap.position] = snap;
    });
    return bufferState;
}

// No replay.js
function applyReplayFrame(frame) {
    if (!frame || !Array.isArray(frame)) return;
    const bufferState = frameToBufferState(frame);
    updateBuffer(bufferState); // Reaproveita toda a lógica
}

// Função para exibir timestamp humano
function formatTimestamp(ts) {
    const d = new Date(ts);
    return d.toLocaleString("pt-BR", { hour12: false });
}

// Atualizar UI do frame atual
function updateReplayUI() {
    document.getElementById("replaySlider").value = replayIndex;
    document.getElementById("replayCurrentTime").textContent =
        replayTimestamps.length
            ? formatTimestamp(replayTimestamps[replayIndex])
            : "--:--:--";
}

// Play/Pause handler
function toggleReplayPlayPause() {
    console.log("Apertou play!");
    if (isPlaying) {
        stopReplay();
    } else {
        playReplay();
    }
}

function playReplay() {
    console.log(replayFrames.length);
    if (replayFrames.length === 0) return;
    isPlaying = true;
    
    document.getElementById("replayPlayPauseBtn").textContent = "⏸️";
    const speed = +document.getElementById("replaySpeed").value;
    
    replayInterval = setInterval(() => {
        
        if (replayIndex >= replayFrames.length) {
            stopReplay();
            return;
        }
        applyReplayFrame(replayFrames[replayIndex]);
        
        updateReplayUI();
        replayIndex++;
    }, speed);
}
function stopReplay() {
    isPlaying = false;
    document.getElementById("replayPlayPauseBtn").textContent = "▶️";
    if (replayInterval) clearInterval(replayInterval);
}

// Slider handler
document.getElementById("replaySlider").addEventListener("input", e => {
    replayIndex = +e.target.value;
    applyReplayFrame(replayFrames[replayIndex]);
    updateReplayUI();
    stopReplay();
});
function setReplayMode() {
    console.log("replayMode: " + replayMode);
    replayMode = replayMode ? false : true;
}
document.getElementById("replayMode").addEventListener("click", setReplayMode);
// Play/Pause button
document.getElementById("replayPlayPauseBtn").addEventListener("click", toggleReplayPlayPause);
// Speed selector
document.getElementById("replaySpeed").addEventListener("change", () => {
    if (isPlaying) {
        stopReplay();
        playReplay();
    }
});

// Exemplo de uso (ao clicar num botão ou assim que carregar)
async function startReplayInterval() {
    const start = new Date("2025-05-29T12:00:00"); // defina o início
    const end = new Date("2025-05-29T12:30:00");   // defina o fim
    
    await loadReplayData(start, end);
    replayIndex = 0;
    applyReplayFrame(replayFrames[replayIndex]);
    updateReplayUI();
}
startReplayInterval();