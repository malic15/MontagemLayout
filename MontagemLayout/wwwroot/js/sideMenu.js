import { setReplayMode } from '/js/mqttWebSocket.js';

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
        var isReplayActive = false;
        // Remove a classe 'active' de todos
        document.querySelectorAll('.side-menu-item').forEach(el => {
            if (el.textContent.trim().includes('Replay') && el.classList.contains('active')) {
                isReplayActive = true
            }
            el.classList.remove('active')
        });
        // Adiciona ao clicado
        this.classList.add('active');

        if ((this.textContent.trim().includes('Replay') && !isReplayActive) || (!this.textContent.trim().includes('Replay') && isReplayActive)) {
            setReplayMode();
        }
    });
});