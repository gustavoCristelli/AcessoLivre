// ========================================================
// 1. Inicialização do Mapa
// ========================================================
const map = L.map('map', { zoomControl: false }).setView([-19.4658, -44.2467], 15);

// ========================================================
// 2. Controles e Camada do Mapa
// ========================================================
L.control.zoom({ position: 'topright' }).addTo(map);

L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    maxZoom: 19,
    tileSize: 512,
    zoomOffset: -1,
    attribution: '© <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox/streets-v12',
    accessToken: 'pk.eyJ1IjoiZ3VzdGF2b2NyaXN0ZWxsaSIsImEiOiJjbXc2cndrcW8wMXpoMnpvYnR3NmJwZ2EwIn0.LjYt7ifcbpP9NqJt_FsNDg'
}).addTo(map);

// Atualiza o tamanho do mapa quando a janela muda de tamanho
window.addEventListener('resize', () => {
    map.invalidateSize();
});

// ========================================================
// 3. Dados dos Locais Acessíveis
// ========================================================
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
const campoPesquisa = document.getElementById('pesquisa-local');
const sugestoesLocais = document.getElementById('sugestoes-locais');
const opcoesFiltros = document.getElementById('opcoes-filtros');
const resultadoFiltros = document.getElementById('resultado-filtros');
const botaoLimparFiltros = document.getElementById('limpar-filtros');
const filtrosAtivos = new Set();
let locaisCorrespondentes = [];
let sugestaoAtiva = -1;

// ========================================================
// 4. Ícones e Marcadores do Mapa
// ========================================================
const svgPinTemplate = `
    <svg width="30" height="42" viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.37 0 0 5.37 0 12C0 21 12 36 12 36C12 36 24 21 24 12C24 5.37 18.63 0 12 0ZM12 16C9.79 16 8 14.21 8 12C8 9.79 9.79 8 12 8C14.21 8 16 9.79 16 12C16 14.21 14.21 16 12 16Z" 
              stroke="#FFFFFF" 
              stroke-width="1.5"/>
    </svg>
`;

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

locaisAcessiveis.forEach((local, index) => {
    const marker = L.marker([local.lat, local.lng], { icon: iconeVerde }).addTo(map);
    marcadoresCriados.push({ markerInstance: marker, index: index });

    marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);

        mostrarDetalhesLocal(index);
    });
});

// Gera as opções de filtro a partir das propriedades booleanas dos locais.
function rotuloFiltro(campo) {
    const rotulos = {
        rampa: 'Rampa de acesso',
        banheiro: 'Banheiro adaptado',
        pisoTatil: 'Piso tátil'
    };

    return rotulos[campo] || campo
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, letra => letra.toLocaleUpperCase('pt-BR'));
}

function atualizarOpcoesFiltros() {
    const camposBooleanos = Array.from(new Set(
        locaisAcessiveis.flatMap(local =>
            Object.keys(local).filter(campo => typeof local[campo] === 'boolean')
        )
    ));

    camposBooleanos.forEach((campo, indice) => {
        const rotulo = rotuloFiltro(campo);
        const opcao = document.createElement('label');
        const checkbox = document.createElement('input');
        const texto = document.createElement('span');

        opcao.className = 'opcao-filtro';
        checkbox.type = 'checkbox';
        checkbox.name = 'filtro-acessibilidade';
        checkbox.value = campo;
        checkbox.id = `filtro-${indice}`;
        texto.textContent = rotulo;

        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                filtrosAtivos.add(campo);
            } else {
                filtrosAtivos.delete(campo);
            }

            painelDetalhes.classList.add('oculto');
            marcadoresCriados.forEach(({ markerInstance }) => {
                markerInstance.setIcon(iconeVerde);
                markerInstance.setZIndexOffset(1);
            });
            atualizarSugestoes();
        });

        opcao.append(checkbox, texto);
        opcoesFiltros.appendChild(opcao);
    });
}

atualizarOpcoesFiltros();

// ========================================================
// 5. Exibição dos Detalhes do Local
// ========================================================
function mostrarDetalhesLocal(index) {
    const local = locaisAcessiveis[index];
    const statusRampa = local.rampa ? "✅ Rampa de Acesso" : "❌ Sem Rampa";
    const statusBanheiro = local.banheiro ? "✅ Banheiro Adaptado" : "❌ Banheiro Não Adaptado";
    const statusPiso = local.pisoTatil ? "✅ Piso Tátil" : "❌ Sem Piso Tátil";

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
}

// ========================================================
// 6. Pesquisa e Seleção de Locais
// ========================================================
function fecharSugestoes() {
    sugestoesLocais.hidden = true;
    campoPesquisa.setAttribute('aria-expanded', 'false');
    campoPesquisa.removeAttribute('aria-activedescendant');
    sugestaoAtiva = -1;
}

function atualizarSugestoes() {
    const termo = campoPesquisa.value.trim().toLocaleLowerCase('pt-BR');
    const camposAtivos = Array.from(filtrosAtivos);
    locaisCorrespondentes = locaisAcessiveis
        .map((local, index) => ({ local, index }))
        // Um local precisa atender a todos os filtros ativos e à busca.
        .filter(({ local }) =>
            local.nome.toLocaleLowerCase('pt-BR').includes(termo) &&
            camposAtivos.every(campo => local[campo] === true)
        );

    const indicesVisiveis = new Set(locaisCorrespondentes.map(({ index }) => index));
    marcadoresCriados.forEach(({ markerInstance, index }) => {
        if (indicesVisiveis.has(index)) {
            markerInstance.addTo(map);
        } else {
            markerInstance.remove();
        }
    });

    resultadoFiltros.textContent = locaisCorrespondentes.length === 1
        ? '1 local encontrado'
        : `${locaisCorrespondentes.length} locais encontrados`;

    sugestoesLocais.replaceChildren();
    sugestaoAtiva = -1;

    if (!termo) {
        fecharSugestoes();
        return;
    }

    if (locaisCorrespondentes.length === 0) {
        const semResultados = document.createElement('li');
        semResultados.className = 'sem-resultados';
        semResultados.textContent = 'Nenhum local encontrado';
        sugestoesLocais.appendChild(semResultados);
    } else {
        locaisCorrespondentes.forEach(({ local, index }, posicao) => {
            const opcao = document.createElement('li');
            opcao.id = `sugestao-local-${index}`;
            opcao.setAttribute('role', 'option');
            opcao.setAttribute('aria-selected', 'false');
            opcao.textContent = local.nome;
            opcao.addEventListener('mousedown', event => event.preventDefault());
            opcao.addEventListener('click', () => selecionarLocal(posicao));
            sugestoesLocais.appendChild(opcao);
        });
    }

    sugestoesLocais.hidden = false;
    campoPesquisa.setAttribute('aria-expanded', 'true');
}

function destacarSugestao(indice) {
    const opcoes = sugestoesLocais.querySelectorAll('[role="option"]');
    if (!opcoes.length) return;

    sugestaoAtiva = (indice + opcoes.length) % opcoes.length;
    opcoes.forEach((opcao, posicao) => {
        opcao.setAttribute('aria-selected', String(posicao === sugestaoAtiva));
    });

    const opcaoAtiva = opcoes[sugestaoAtiva];
    campoPesquisa.setAttribute('aria-activedescendant', opcaoAtiva.id);
    opcaoAtiva.scrollIntoView({ block: 'nearest' });
}

function selecionarLocal(posicao) {
    const selecionado = locaisCorrespondentes[posicao];
    if (!selecionado) return;

    const { local, index } = selecionado;
    campoPesquisa.value = local.nome;
    fecharSugestoes();
    map.setView([local.lat, local.lng], Math.max(map.getZoom(), 15));
    mostrarDetalhesLocal(index);
}

// Fecha a lista quando o usuário clica fora da barra de pesquisa
document.addEventListener('click', event => {
    if (!event.target.closest('.barra-pesquisa')) {
        fecharSugestoes();
    }
});

campoPesquisa.addEventListener('input', () => {
    atualizarSugestoes();
});

campoPesquisa.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' && !sugestoesLocais.hidden) {
        event.preventDefault();
        destacarSugestao(sugestaoAtiva + 1);
    } else if (event.key === 'ArrowUp' && !sugestoesLocais.hidden) {
        event.preventDefault();
        destacarSugestao(sugestaoAtiva <= 0 ? locaisCorrespondentes.length - 1 : sugestaoAtiva - 1);
    } else if (event.key === 'Enter' && !sugestoesLocais.hidden && locaisCorrespondentes.length) {
        event.preventDefault();
        selecionarLocal(sugestaoAtiva < 0 ? 0 : sugestaoAtiva);
    } else if (event.key === 'Escape') {
        fecharSugestoes();
    }
});

atualizarSugestoes();

// ========================================================
// Aba Filtros
// ========================================================
const botaoAbrirFiltros = document.getElementById('abrir-filtros');
const botaoFecharFiltros = document.getElementById('fechar-filtros');
const botaoExplorar = document.getElementById('botao-explorar');
const painelFiltros = document.getElementById('painel-filtros');
const overlayFiltros = document.getElementById('filtros-overlay');

function abrirFiltros() {
    document.body.classList.add('filtros-abertos');
    botaoAbrirFiltros.setAttribute('aria-expanded', 'true');
    painelFiltros.setAttribute('aria-hidden', 'false');
    botaoFecharFiltros.focus();
}

function fecharFiltros(restaurarFoco = true) {
    document.body.classList.remove('filtros-abertos');
    botaoAbrirFiltros.setAttribute('aria-expanded', 'false');
    painelFiltros.setAttribute('aria-hidden', 'true');
    if (restaurarFoco) botaoAbrirFiltros.focus();
}

botaoAbrirFiltros.addEventListener('click', abrirFiltros);
botaoExplorar.addEventListener('click', () => {
    if (document.body.classList.contains('filtros-abertos')) {
        fecharFiltros(false);
    }
});
botaoFecharFiltros.addEventListener('click', fecharFiltros);
overlayFiltros.addEventListener('click', fecharFiltros);
botaoLimparFiltros.addEventListener('click', () => {
    filtrosAtivos.clear();
    opcoesFiltros.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    painelDetalhes.classList.add('oculto');
    marcadoresCriados.forEach(({ markerInstance }) => {
        markerInstance.setIcon(iconeVerde);
        markerInstance.setZIndexOffset(1);
    });
    atualizarSugestoes();
});

painelFiltros.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
        fecharFiltros();
        return;
    }

    if (event.key !== 'Tab') return;

    const elementosFocaveis = painelFiltros.querySelectorAll(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const primeiroElemento = elementosFocaveis[0];
    const ultimoElemento = elementosFocaveis[elementosFocaveis.length - 1];

    if (event.shiftKey && document.activeElement === primeiroElemento) {
        event.preventDefault();
        ultimoElemento.focus();
    } else if (!event.shiftKey && document.activeElement === ultimoElemento) {
        event.preventDefault();
        primeiroElemento.focus();
    }
});

// ========================================================
// 7. Interação com o Mapa
// ========================================================
map.on('click', () => {
    painelDetalhes.classList.add('oculto');

    marcadoresCriados.forEach(item => {
        item.markerInstance.setIcon(iconeVerde);
        item.markerInstance.setZIndexOffset(1);
    });
});

// ========================================================
// 8. Geolocalização do Usuário
// ========================================================
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