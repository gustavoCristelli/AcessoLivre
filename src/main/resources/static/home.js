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
let locaisAcessiveis = [];

async function carregarLocais() {
    try {
        const response = await fetch('http://localhost:8080/api/locais');

        if (!response.ok) {
            throw new Error('Erro ao buscar locais');
        }

        locaisAcessiveis = await response.json();

        locaisAcessiveis.forEach((local, index) => {
            const marker = L.marker(
                [local.lat, local.lng],
                { icon: iconeVerde }
            ).addTo(map);

            marcadoresCriados.push({
                markerInstance: marker,
                index: index
            });

            marker.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                mostrarDetalhesLocal(index);
            });
        });

    } catch (error) {
        console.error('Erro ao carregar locais:', error);
    }
}

carregarLocais();

const painelDetalhes = document.getElementById('menu-detalhes');
const campoPesquisa = document.getElementById('pesquisa-local');
const sugestoesLocais = document.getElementById('sugestoes-locais');
const pesquisaSimples = document.getElementById('pesquisa-simples');
const barraPesquisa = pesquisaSimples.parentElement;
const pesquisaTrajeto = document.getElementById('pesquisa-trajeto');
const campoOrigemTrajeto = document.getElementById('origem-trajeto');
const campoDestinoTrajeto = document.getElementById('destino-trajeto');
const sugestoesTrajeto = document.getElementById('sugestoes-trajeto');
const statusTrajeto = document.getElementById('status-trajeto');
const botaoVoltarPesquisa = document.getElementById('voltar-pesquisa');
const opcoesFiltros = document.getElementById('opcoes-filtros');
const resultadoFiltros = document.getElementById('resultado-filtros');
const botaoLimparFiltros = document.getElementById('limpar-filtros');
const filtrosAtivos = new Set();
let locaisCorrespondentes = [];
let sugestaoAtiva = -1;
let localSelecionado = null;
let localizacaoUsuario = null;
let campoTrajetoAtivo = campoOrigemTrajeto;
let sugestaoTrajetoAtiva = -1;
let modoTrajetoAtivo = false;
let rotaAtual = null;
let requisicaoRota = null;

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
    if (modoTrajetoAtivo) {
        fecharModoTrajeto();
    }

    const local = locaisAcessiveis[index];
    localSelecionado = local;
    const statusRampa = local.rampa ? "✅ Rampa de Acesso" : "❌ Sem Rampa";
    const statusBanheiro = local.banheiro ? "✅ Banheiro Adaptado" : "❌ Banheiro Não Adaptado";
    const statusPiso = local.pisoTatil ? "✅ Piso Tátil" : "❌ Sem Piso Tátil";

    painelDetalhes.innerHTML = `
        <div class="detalhes-local">
            <img src="${local.foto}" alt="Foto do local" class="img">
            <div class="conteudomenu">
                <h3><b>${local.nome}</b></h3>
                <button class="botao-iniciar-trajeto" type="button">Iniciar trajeto</button>
                <p>${local.descricao}</p>
                <ul>
                    <li class="${local.rampa ? 'tem-acessibilidade' : 'sem-acessibilidade'}">${statusRampa}</li>
                    <li class="${local.pisoTatil ? 'tem-acessibilidade' : 'sem-acessibilidade'}">${statusPiso}</li>
                    <li class="${local.banheiro ? 'tem-acessibilidade' : 'sem-acessibilidade'}">${statusBanheiro}</li>
                </ul>
            </div>

              <div class="acoes-local">
        <button type="button" class="botao-atualizar-trajeto" onclick="editarLocal(${index})">
            <i class="fa-solid fa-pen"></i>
            Atualizar
        </button>

        <button type="button" class="botao-excluir-trajeto" onclick="excluirLocal(${local.id})">
            <i class="fa-solid fa-trash"></i>
            Excluir
        </button>
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

// Fecha as sugestões ao clicar fora dos campos e das opções.
document.addEventListener('click', event => {
    const clicouNaBarra = event.target.closest('.barra-pesquisa');
    const clicouNoCampo = event.target.closest('.barra-pesquisa input');
    const clicouNaOpcao = event.target.closest('.barra-pesquisa [role="option"]');

    if (!clicouNaBarra || (!clicouNoCampo && !clicouNaOpcao)) {
        fecharSugestoes();
        fecharSugestoesTrajeto();
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
// Pesquisa de Trajetos com OSRM
// ========================================================
const endpointOSRM = 'https://router.project-osrm.org/route/v1/driving';

function fecharSugestoesTrajeto() {
    sugestoesTrajeto.hidden = true;
    [campoOrigemTrajeto, campoDestinoTrajeto].forEach(campo => {
        campo.setAttribute('aria-expanded', 'false');
        campo.removeAttribute('aria-activedescendant');
    });
    sugestaoTrajetoAtiva = -1;
}

function atualizarSugestoesTrajeto() {
    const termo = campoTrajetoAtivo.value.trim().toLocaleLowerCase('pt-BR');
    const locaisSugeridos = locaisAcessiveis.filter(local =>
        local.nome.toLocaleLowerCase('pt-BR').includes(termo)
    );
    if (localizacaoUsuario && localizacaoUsuario.nome.toLocaleLowerCase('pt-BR').includes(termo)) {
        locaisSugeridos.unshift(localizacaoUsuario);
    }

    sugestoesTrajeto.replaceChildren();
    sugestaoTrajetoAtiva = -1;

    if (locaisSugeridos.length === 0) {
        const semResultados = document.createElement('li');
        semResultados.className = 'sem-resultados';
        semResultados.textContent = 'Nenhum local encontrado';
        sugestoesTrajeto.appendChild(semResultados);
    } else {
        locaisSugeridos.forEach(local => {
            const opcao = document.createElement('li');
            opcao.id = local === localizacaoUsuario
                ? 'sugestao-trajeto-sua-localizacao'
                : `sugestao-trajeto-${locaisAcessiveis.indexOf(local)}`;
            opcao.setAttribute('role', 'option');
            opcao.setAttribute('aria-selected', 'false');
            if (local === localizacaoUsuario) {
                opcao.classList.add('sugestao-localizacao');
            }
            opcao.textContent = local.nome;
            opcao.addEventListener('mousedown', event => event.preventDefault());
            opcao.addEventListener('click', () => selecionarLocalTrajeto(local));
            sugestoesTrajeto.appendChild(opcao);
        });
    }

    sugestoesTrajeto.hidden = false;
    [campoOrigemTrajeto, campoDestinoTrajeto].forEach(campo => {
        campo.setAttribute('aria-expanded', String(campo === campoTrajetoAtivo));
        if (campo !== campoTrajetoAtivo) {
            campo.removeAttribute('aria-activedescendant');
        }
    });
    campoTrajetoAtivo.setAttribute('aria-expanded', 'true');
}

function limparTrajetoAtual() {
    if (requisicaoRota) {
        requisicaoRota.abort();
        requisicaoRota = null;
    }
    if (rotaAtual) {
        map.removeLayer(rotaAtual);
        rotaAtual = null;
    }
}

function fecharModoTrajeto() {
    if (!modoTrajetoAtivo) return;

    modoTrajetoAtivo = false;
    pesquisaTrajeto.hidden = true;
    pesquisaSimples.hidden = false;
    fecharSugestoesTrajeto();
    limparTrajetoAtual();
    barraPesquisa.classList.remove('modo-trajeto');
    painelDetalhes.classList.remove('oculto');
}

function localizarLocalPorNome(nome) {
    const nomeNormalizado = nome.trim().toLocaleLowerCase('pt-BR');
    if (localizacaoUsuario &&
        localizacaoUsuario.nome.toLocaleLowerCase('pt-BR') === nomeNormalizado) {
        return localizacaoUsuario;
    }
    return locaisAcessiveis.find(local =>
        local.nome.toLocaleLowerCase('pt-BR') === nomeNormalizado
    );
}

function selecionarLocalTrajeto(local) {
    campoTrajetoAtivo.value = local.nome;
    fecharSugestoesTrajeto();

    const origem = localizarLocalPorNome(campoOrigemTrajeto.value);
    const destino = localizarLocalPorNome(campoDestinoTrajeto.value);
    if (origem && destino) {
        calcularTrajeto(origem, destino);
    } else {
        statusTrajeto.textContent = 'Selecione os locais de origem e destino.';
    }
}

async function calcularTrajeto(origem, destino) {
    limparTrajetoAtual();

    const controlador = new AbortController();
    requisicaoRota = controlador;
    statusTrajeto.textContent = 'Calculando trajeto...';

    const coordenadas = `${origem.lng},${origem.lat};${destino.lng},${destino.lat}`;
    const url = `${endpointOSRM}/${coordenadas}?overview=full&geometries=geojson&steps=false`;

    try {
        const resposta = await fetch(url, { signal: controlador.signal });
        if (!resposta.ok) {
            throw new Error(`O serviço OSRM respondeu com status ${resposta.status}.`);
        }

        const resultado = await resposta.json();
        if (controlador !== requisicaoRota) return;
        if (resultado.code !== 'Ok' || !resultado.routes || !resultado.routes.length) {
            statusTrajeto.textContent = 'Não foi possível encontrar um trajeto entre esses locais.';
            return;
        }

        const trajeto = resultado.routes[0];
        rotaAtual = L.geoJSON(trajeto.geometry, {
            style: { color: '#18734F', weight: 6, opacity: 0.85 }
        }).addTo(map);
        map.fitBounds(rotaAtual.getBounds(), { padding: [40, 40] });

        const distanciaKm = (trajeto.distance / 1000).toLocaleString('pt-BR', {
            maximumFractionDigits: 1
        });
        const duracaoMinutos = Math.round(trajeto.duration / 60);
        statusTrajeto.textContent =
            `Trajeto de carro: ${distanciaKm} km, cerca de ${duracaoMinutos} min.`;
    } catch (erro) {
        if (requisicaoRota !== controlador || erro.name === 'AbortError') return;
        console.error('Falha ao consultar o serviço OSRM:', erro);
        statusTrajeto.textContent = 'Não foi possível calcular o trajeto. Tente novamente.';
    } finally {
        if (requisicaoRota === controlador) {
            requisicaoRota = null;
        }
    }
}

function iniciarModoTrajeto() {
    modoTrajetoAtivo = true;
    barraPesquisa.classList.add('modo-trajeto');
    pesquisaSimples.hidden = true;
    pesquisaTrajeto.hidden = false;
    limparTrajetoAtual();
    painelDetalhes.classList.add('oculto');

    campoOrigemTrajeto.value = '';
    campoDestinoTrajeto.value = localSelecionado ? localSelecionado.nome : '';
    campoTrajetoAtivo = campoOrigemTrajeto;
    statusTrajeto.textContent = 'Selecione os locais de origem e destino.';
    campoOrigemTrajeto.focus();
    atualizarSugestoesTrajeto();
}

painelDetalhes.addEventListener('click', event => {
    if (event.target.closest('.botao-iniciar-trajeto')) {
        event.stopPropagation();
        iniciarModoTrajeto();
    }
});

botaoVoltarPesquisa.addEventListener('click', fecharModoTrajeto);

[campoOrigemTrajeto, campoDestinoTrajeto].forEach(campo => {
    campo.addEventListener('focus', () => {
        campoTrajetoAtivo = campo;
        atualizarSugestoesTrajeto();
    });

    campo.addEventListener('input', () => {
        campoTrajetoAtivo = campo;
        limparTrajetoAtual();
        statusTrajeto.textContent = 'Selecione os locais de origem e destino.';
        atualizarSugestoesTrajeto();
    });

    campo.addEventListener('keydown', event => {
        const opcoes = sugestoesTrajeto.querySelectorAll('[role="option"]');
        if (event.key === 'ArrowDown' && !sugestoesTrajeto.hidden && opcoes.length) {
            event.preventDefault();
            sugestaoTrajetoAtiva = (sugestaoTrajetoAtiva + 1) % opcoes.length;
        } else if (event.key === 'ArrowUp' && !sugestoesTrajeto.hidden && opcoes.length) {
            event.preventDefault();
            sugestaoTrajetoAtiva = sugestaoTrajetoAtiva <= 0
                ? opcoes.length - 1
                : sugestaoTrajetoAtiva - 1;
        } else if (event.key === 'Enter' && !sugestoesTrajeto.hidden && opcoes.length) {
            event.preventDefault();
            const opcaoAtiva = opcoes[sugestaoTrajetoAtiva < 0 ? 0 : sugestaoTrajetoAtiva];
            const local = localizarLocalPorNome(opcaoAtiva.textContent);
            if (local) selecionarLocalTrajeto(local);
            return;
        } else if (event.key === 'Escape') {
            fecharSugestoesTrajeto();
            return;
        } else {
            return;
        }

        opcoes.forEach((opcao, indice) => {
            opcao.setAttribute('aria-selected', String(indice === sugestaoTrajetoAtiva));
        });
        campo.setAttribute('aria-activedescendant', opcoes[sugestaoTrajetoAtiva].id);
        opcoes[sugestaoTrajetoAtiva].scrollIntoView({ block: 'nearest' });
    });
});

// ========================================================
// Aba Filtros
// ========================================================
const botaoAbrirFiltros = document.getElementById('abrir-filtros');
const botaoFecharFiltros = document.getElementById('fechar-filtros');
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
        localizacaoUsuario = { nome: 'Sua localização', lat, lng };

        L.marker([lat, lng], {
            icon: L.divIcon({
                className: 'user-marker',
                html: '<span class="user-marker-pulse"></span>',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            })
        }).addTo(map).bindPopup("Você está aqui!").openPopup();

        map.setView([lat, lng], 15);
        if (modoTrajetoAtivo && !sugestoesTrajeto.hidden) {
            atualizarSugestoesTrajeto();
        }
    });
}

document.getElementById('botao-contribuir')
    ?.addEventListener('click', () => {

        // Limpa qualquer edição anterior
        sessionStorage.removeItem('localEmEdicao');

        // Abre o formulário
        window.location.href = 'contribuir';
    });


// ========================================================
// ABRIR FORMULÁRIO PARA EDITAR LOCAL
// ========================================================

function editarLocal(index) {

    const local = locaisAcessiveis[index];

    // Salva os dados do local selecionado
    sessionStorage.setItem(
        'localEmEdicao',
        JSON.stringify(local)
    );

    // Abre o formulário
    window.location.href = 'contribuir';
}
async function excluirLocal(id) {
    if (!confirm('Deseja realmente excluir este local?')) {
        return;
    }

    try {
        const response = await fetch(
            `http://localhost:8080/api/locais/${id}`,
            { method: 'DELETE' }
        );

        if (!response.ok) {
            throw new Error('Erro ao excluir local');
        }

        alert('Local excluído com sucesso!');

        // Recarrega a página e os locais vindos do banco
        window.location.reload();

    } catch (error) {
        console.error(error);
        alert('Não foi possível excluir o local.');
    }
}