document.getElementById("sideMenuOpenBtn").onclick = function() {
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