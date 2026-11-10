// 1. Inicializador do mapa
const map = L.map('map', { zoomControl: false }).setView([-19.4658, -44.2467], 15);

// Controle do zoom
L.control.zoom({ position: 'topright' }).addTo(map);

// Presets
L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    maxZoom: 19,
    tileSize: 512,
    zoomOffset: -1,
    attribution: '© <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox/streets-v12',
    accessToken: 'pk.eyJ1IjoiZ3VzdGF2b2NyaXN0ZWxsaSIsImEiOiJjbXc2cndrcW8wMXpoMnpvYnR3NmJwZ2EwIn0.LjYt7ifcbpP9NqJt_FsNDg'
}).addTo(map);

// 2. Garante que o Leaflet recalcule o tamanho exato da div do mapa
window.addEventListener('resize', () => {
    map.invalidateSize();
});

// 3. Dados dos locais (Inserir o banco de dados aqui?????
const locaisAcessiveis = [
    {
        nome: "Café Central",
        lat: -19.4640,
        lng: -44.2450,
        rampa: true,
        banheiro: false,
        pisoTatil: true,
        foto: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400",
        descricao: "Possui rampa na entrada, mas o banheiro é estreito."
    },
    {
        nome: "Praça da Boa Vista",
        lat: -19.4680,
        lng: -44.2490,
        rampa: true,
        banheiro: true,
        pisoTatil: true,
        foto: "https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=400",
        descricao: "Ambiente totalmente plano e com piso tátil adequado."
    }
];

const painelDetalhes = document.getElementById('menu-detalhes');

// Template do SVG (Pino)
const svgPinTemplate = `
    <svg width="30" height="42" viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.37 0 0 5.37 0 12C0 21 12 36 12 36C12 36 24 21 24 12C24 5.37 18.63 0 12 0ZM12 16C9.79 16 8 14.21 8 12C8 9.79 9.79 8 12 8C14.21 8 16 9.79 16 12C16 14.21 14.21 16 12 16Z" 
              stroke="#FFFFFF" 
              stroke-width="1.5"/>
    </svg>
`;

// Instâncias dos ícones usando L.divIcon com o template SVG
const iconeVerde = L.divIcon({
    className: 'custom-svg-pin pin-verde',
    html: svgPinTemplate,
    iconSize: [30, 42],
    iconAnchor: [15, 42]
});

const iconeCinza = L.divIcon({
    className: 'custom-svg-pin pin-cinza',
    html: svgPinTemplate,
    iconSize: [30, 42],
    iconAnchor: [15, 42]
});

const marcadoresCriados = [];

// 4. Marcadores no mapa
locaisAcessiveis.forEach((local, index) => {
    const statusRampa = local.rampa ? "✅ Rampa de Acesso" : "❌ Sem Rampa";
    const statusBanheiro = local.banheiro ? "✅ Banheiro Adaptado" : "❌ Banheiro Não Adaptado";
    const statusPiso = local.pisoTatil ? "✅ Piso Tátil" : "❌ Sem Piso Tátil";

    const marker = L.marker([local.lat, local.lng], { icon: iconeVerde }).addTo(map);
    marcadoresCriados.push({ markerInstance: marker, index: index });

    marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);

        // Painel lateral removendo "oculto" no html
        painelDetalhes.innerHTML = `
            <div>
                <img src="${local.foto}" alt="Foto do local" class="img">
                <div class="conteudomenu">
                    <h3><b>${local.nome}</b></h3>
                    <p>${local.descricao}</p>
                    <ul>
                        <li>${statusRampa}</li>
                        <li>${statusBanheiro}</li>
                        <li>${statusPiso}</li>
                    </ul>
                </div>
            </div>
        `;
        painelDetalhes.classList.remove('oculto');

        // Destaca o pino clicado
        marcadoresCriados.forEach(item => {
            if (item.index === index) {
                item.markerInstance.setIcon(
                    L.divIcon({
                        className: 'custom-svg-pin pin-verde pin-selecionado',
                        html: svgPinTemplate,
                        iconSize: [30, 42],
                        iconAnchor: [15, 42]
                    })
                );
                item.markerInstance.setZIndexOffset(1000);
            } else {
                item.markerInstance.setIcon(iconeCinza);
                item.markerInstance.setZIndexOffset(1);
            }
        });
    });
});

// 5. Clicar no mapa esconde o painel de detalhes e reseta os pinos para verde
map.on('click', () => {
    painelDetalhes.classList.add('oculto');

    marcadoresCriados.forEach(item => {
        item.markerInstance.setIcon(iconeVerde);
        item.markerInstance.setZIndexOffset(1);
    });
});

// 6. Geolocalização
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(position => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        L.marker([lat, lng], {
            icon: L.divIcon({ className: 'user-marker', html: '📍', iconSize: [24, 24] })
        }).addTo(map).bindPopup("Você está aqui!").openPopup();

        map.setView([lat, lng], 15);
    });
}