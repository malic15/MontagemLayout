const connectionAudio = new signalR.HubConnectionBuilder()
    .withUrl("/audiohub")
    .build();

var currentAudio = null;
var currentAudio = new Audio();

const speakText = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.volume = 1;
    utterance.rate = 1;
    utterance.pitch = 1;

    window.speechSynthesis.speak(utterance);
};
connectionAudio.on("ReceiveAudio", function (audioUrl) {
    if (!audioUrl) return;

    if (!currentAudio.paused) {
        return;
    }

    currentAudio.src = audioUrl;
    currentAudio.load(); 

    currentAudio.oncanplaythrough = () => {
        console.log("Audio can play through.");
        
        currentAudio.play().then(() => {
            console.log("Audio play.");
        }).catch((err) => {
            console.error("Error playing audio:", err);
        });
        //currentAudio.onended = () => {
        //    currentAudio.src = '';
        //};
    };

    currentAudio.onerror = (e) => {
        console.error("Audio error:", e);
    };
    
});
connectionAudio.start()
    .then(() => {
        speakText("Montagem");
        console.log("Audio SignalR connection established")
    })
    .catch(err => console.error("Audio Error establishing SignalR connection:", err));

connectionAudio.onclose(async () => {
    console.log("Audio SignalR connection closed. Attempting to reconnect...");
    try {
        await connectionAudio.start();
        console.log("Audio SignalR reconnected");
    } catch (err) {
        console.error("Audio Error reconnecting SignalR:", err);
    }
});