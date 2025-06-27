import { updateBuffer, updateStatus, setReplayMode, allLines} from '/js/mqttWebSocket.js';

//let replayData = null; // { buffer: [...], status: [...] }
let currentFrameTime = null;


let replayData = [];
let replayFrames = [];
let replayTimestamps = [];
let replayInterval = null;
let replayIndex = 0;
let isPlaying = false;
//let replayMode = false;

// Função para buscar e preparar os dados
//async function loadReplayData(start, end) {
//    const res = await fetch(`/data/buffer-replay?start=${start.toISOString()}&end=${end.toISOString()}`);
//    replayData = await res.json();
//    replayFrames = [];
//    replayTimestamps = [];
//    // Agrupar por timestamp
//    const map = {};
//    replayData.forEach(snap => {
//        const t = new Date(snap.timestamp).getTime();
//        if (!map[t]) map[t] = [];
//        map[t].push(snap);
//    });
//    replayTimestamps = Object.keys(map).sort((a, b) => a - b).map(Number);
//    replayFrames = replayTimestamps.map(t => map[t]);
//    document.getElementById("replaySlider").max = replayFrames.length - 1;
//}
async function loadReplayData(start, end) {
    const resp = await fetch(`/data/replay?start=${start.toISOString()}&end=${end.toISOString()}`);
    if (!resp.ok) {
        const errorText = await resp.text();
        console.error("Erro no fetch:", errorText);
        return;
    }
    

    replayData = await resp.json();
    console.table(replayData.buffer); // visual para arrays de objetos
    //console.table(replayData.status);
    replayTimestamps = buildReplayTimestamps(replayData);
}
function buildReplayTimestamps(replayData) {
    const bufferTimes = replayData.buffer.map(b => new Date(b.timestamp).getTime());
    const statusTimes = replayData.status.map(s => new Date(s.timestamp).getTime());
    const allTimes = Array.from(new Set([...bufferTimes, ...statusTimes]));
    allTimes.sort((a, b) => a - b);
    return allTimes;
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
//function frameToBufferState(frame) {
//    const bufferState = {};
//    frame.forEach(snap => {
//        if (!bufferState[snap.line]) bufferState[snap.line] = [];
//        bufferState[snap.line][snap.position] = snap;
//    });
//    return bufferState;
//}

// No replay.js
function applyReplayFrame(frameTime) {
    currentFrameTime = frameTime;

    if (replayData.buffer && replayData.buffer.length > 0) {
        replayData.buffer.forEach(b => {
            console.log("timestamp:", b.timestamp, "frameTime:", frameTime, "b.line:", b.line);
        });
    }


    // Buffer: último estado de cada posição de cada linha até esse frame
    const bufferFrame = {};
    replayData.buffer
        .filter(b => new Date(b.timestamp).getTime() <= frameTime.getTime())
        .forEach(b => {
            console.log("b.line");
            if (!bufferFrame[b.line]) bufferFrame[b.line] = {};
            bufferFrame[b.line][b.position] = b;
        });
    console.log(bufferFrame);
    // Converte para array para manter compatibilidade com updateBuffer()
    Object.keys(bufferFrame).forEach(line => {
        const positions = bufferFrame[line];
        bufferFrame[line] = Object.keys(positions)
            .sort((a, b) => +a - +b)
            .map(pos => positions[pos]);
    });
    //console.log("BufferFrame (frameTime = " + frameTime.toISOString() + "):", bufferFrame);

    updateBuffer(bufferFrame);

    const statusLatestByLine = {};
    // Para cada status já ocorrido até agora, pega o último para cada linha
    replayData.status
        .filter(s => new Date(s.timestamp) <= frameTime)
        .forEach(s => {
            // Só pega o mais recente por linha
            statusLatestByLine[s.line] = s;
        });

    // Agora, para todas as linhas conhecidas do seu sistema, crie o objeto esperado:
    const statusFrame = {};
    // Use as linhas de replayData.status, ou de um array conhecido de linhas
    //const allLines = Object.keys(prioritiesColors); // ou lista fixa, ou Object.keys(statusLatestByLine)
    allLines.forEach(line => {
        if (statusLatestByLine[line]) {
            const st = statusLatestByLine[line];
            statusFrame[line] = {
                lowestStatusActive: st.state,
                lastMessage: st.lastMessage || '', // preencha se existir no replay
                lastFaultTime: st.timestamp || null
            };
        } else {
            // Sem registro até agora, coloca o default (sem falha, por exemplo)
            statusFrame[line] = {
                lowestStatusActive: 19,
                lastMessage: '',
                lastFaultTime: null
            };
        }
    });

    // Log pra depurar:
    //console.log("StatusFrame (frameTime):", statusFrame);

    updateStatus(statusFrame);

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
            ? formatTimestamp(new Date(replayTimestamps[replayIndex]))
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
    console.log(replayTimestamps.length);
    if (!replayTimestamps || replayTimestamps.length === 0) return;
    isPlaying = true;
    
    document.getElementById("replayPlayPauseBtn").textContent = "⏸️";
    const speed = +document.getElementById("replaySpeed").value;
    
    replayInterval = setInterval(() => {
        
        if (replayIndex >= replayTimestamps.length) {
            stopReplay();
            return;
        }
        applyReplayFrame(new Date(replayTimestamps[replayIndex]));
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
    applyReplayFrame(new Date(replayTimestamps[replayIndex]));
    updateReplayUI();
    stopReplay();
});

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
    const start = new Date("2025-05-29T12:30:00"); // defina o início
    const end = new Date("2025-05-29T13:30:00");   // defina o fim
    
    await loadReplayData(start, end);
    replayIndex = 0;
    applyReplayFrame(new Date(replayTimestamps[replayIndex]));
    updateReplayUI();
}
startReplayInterval();