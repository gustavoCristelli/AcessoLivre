// ========================================================
// 1. Inicialização do mapa estático de fundo
// ========================================================
const mapaFundo = L.map('mapa-fundo', {
    attributionControl: true,
    boxZoom: false,
    doubleClickZoom: false,
    dragging: false,
    keyboard: false,
    scrollWheelZoom: false,
    tap: false,
    touchZoom: false,
    zoomControl: false
}).setView([-19.4658, -44.2467], 15);

// ========================================================
// 2. Camada cartográfica
// ========================================================
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(mapaFundo);
