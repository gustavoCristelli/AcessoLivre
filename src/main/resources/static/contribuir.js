
 // ========================================================
 // 1. REFERÊNCIAS
 // ========================================================

const tabelaRecursos = document.querySelector('.tabela-recursos');
const areaAnexarFotos = document.getElementById('area-anexar-fotos');
const campoFotos = document.getElementById('fotos-local');
const statusFotos = document.getElementById('status-fotos-local');

const campoDescricao = document.getElementById('descricao');
const campoLocalizacao = document.getElementById('localizacao');
const campoLatitude = document.getElementById('latitude');
const campoLongitude = document.getElementById('longitude');

const formulario = document.getElementById('form-contribuir');
const botaoSubmit = formulario.querySelector('[type="submit"]');

let localEmEdicao = null;
let localOriginal = null;


// ========================================================
// 2. CARREGAR MODO DE EDIÇÃO OU CADASTRO
// ========================================================

function carregarFormulario() {

    const dadosEdicao = sessionStorage.getItem('localEmEdicao');

    if (dadosEdicao) {

        try {
            localOriginal = JSON.parse(dadosEdicao);

            if (!localOriginal || !localOriginal.id) {
                throw new Error('Dados de edição inválidos.');
            }

            localEmEdicao = localOriginal.id;

        } catch (error) {

            console.error('Erro ao carregar edição:', error);

            sessionStorage.removeItem('localEmEdicao');

            localOriginal = null;
            localEmEdicao = null;
        }
    }

    if (localOriginal) {

        // ================================================
        // MODO EDIÇÃO
        // ================================================

        document.getElementById('nome-local').value =
            localOriginal.nome || '';

        campoDescricao.value =
            localOriginal.descricao || '';

        campoLatitude.value = localOriginal.lat;
        campoLongitude.value = localOriginal.lng;

        campoLocalizacao.value =
            `${Number(localOriginal.lat).toFixed(6)}, ${Number(localOriginal.lng).toFixed(6)}`;

        // Bloqueia a localização
        campoLocalizacao.disabled = true;
        campoLocalizacao.readOnly = true;

        // Preenche os recursos de acessibilidade
        const rampa = document.querySelector(
            `input[name="rampa"][value="${localOriginal.rampa ? 'sim' : 'nao'}"]`
        );

        const banheiro = document.querySelector(
            `input[name="banheiro"][value="${localOriginal.banheiro ? 'sim' : 'nao'}"]`
        );

        const pisoTatil = document.querySelector(
            `input[name="piso-tatil"][value="${localOriginal.pisoTatil ? 'sim' : 'nao'}"]`
        );

        if (rampa) rampa.checked = true;
        if (banheiro) banheiro.checked = true;
        if (pisoTatil) pisoTatil.checked = true;

        botaoSubmit.textContent = 'Salvar alterações';

    } else {

        // ================================================
        // MODO CADASTRO
        // ================================================

        sessionStorage.removeItem('localEmEdicao');

        localEmEdicao = null;
        localOriginal = null;

        campoLocalizacao.disabled = false;
        campoLocalizacao.readOnly = false;

        botaoSubmit.textContent = 'Contribuir';

        obterLocalizacao();
    }
}

carregarFormulario();


// ========================================================
// 3. GEOLOCALIZAÇÃO
// ========================================================

function obterLocalizacao() {

    if (!navigator.geolocation) {
        alert('Seu navegador não suporta geolocalização.');
        return;
    }

    campoLocalizacao.value = 'Obtendo localização...';

    navigator.geolocation.getCurrentPosition(

        (posicao) => {

            const { latitude, longitude } = posicao.coords;

            campoLatitude.value = latitude;
            campoLongitude.value = longitude;

            campoLocalizacao.value =
                `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        },

        () => {

            campoLocalizacao.value =
                'Não foi possível obter a localização.';

            alert('Permita o acesso à localização para cadastrar o local.');
        }
    );
}


// ========================================================
// 4. LIMPAR RESPOSTAS DE ACESSIBILIDADE
// ========================================================

if (tabelaRecursos) {

    tabelaRecursos.addEventListener('click', function (event) {

        const botaoLimpar = event.target.closest('.limpar-resposta');

        if (!botaoLimpar) return;

        const linha = botaoLimpar.closest('tr');

        const respostaSelecionada =
            linha.querySelector('input[type="radio"]:checked');

        if (respostaSelecionada) {

            respostaSelecionada.checked = false;

            respostaSelecionada.dispatchEvent(
                new Event('input', { bubbles: true })
            );

            respostaSelecionada.dispatchEvent(
                new Event('change', { bubbles: true })
            );
        }
    });
}


// ========================================================
// 5. SELEÇÃO E ARRASTE DE FOTOS
// ========================================================

const TAMANHO_MAXIMO_FOTO = 5 * 1024 * 1024;
const TAMANHO_MAXIMO_TOTAL = 25 * 1024 * 1024;


function atualizarStatusFotos() {

    const quantidade = campoFotos.files.length;

    statusFotos.textContent = quantidade === 0
        ? ''
        : quantidade === 1
            ? campoFotos.files[0].name
            : `${quantidade} fotos selecionadas`;
}


function adicionarFotos(files) {

    const imagens = [
        ...Array.from(campoFotos.files),
        ...Array.from(files)
    ];

    const erro = validarFotos(imagens);

    if (erro) {
        statusFotos.textContent = erro;
        return;
    }

    const transferencia = new DataTransfer();

    imagens.forEach(imagem => {
        transferencia.items.add(imagem);
    });

    campoFotos.files = transferencia.files;

    atualizarStatusFotos();
}


function validarFotos(arquivos) {

    const imagens = Array.from(arquivos);

    if (imagens.some(arquivo => !arquivo.type.startsWith('image/'))) {
        return 'Selecione apenas arquivos de imagem.';
    }

    if (imagens.some(arquivo => arquivo.size > TAMANHO_MAXIMO_FOTO)) {
        return 'Cada foto pode ter no máximo 5 MB.';
    }

    const tamanhoTotal = imagens.reduce(
        (total, arquivo) => total + arquivo.size,
        0
    );

    if (tamanhoTotal > TAMANHO_MAXIMO_TOTAL) {
        return 'O tamanho total das fotos não pode ultrapassar 25 MB.';
    }

    return null;
}


// Clique para selecionar fotos
if (areaAnexarFotos) {

    areaAnexarFotos.addEventListener('click', () => {
        campoFotos.click();
    });

    // Acessibilidade por teclado
    areaAnexarFotos.addEventListener('keydown', event => {

        if (event.key === 'Enter' || event.key === ' ') {

            event.preventDefault();
            campoFotos.click();
        }
    });

    // Arrastar arquivos
    ['dragenter', 'dragover'].forEach(tipoEvento => {

        areaAnexarFotos.addEventListener(tipoEvento, event => {

            event.preventDefault();

            areaAnexarFotos.classList.add('is-dragging');
        });
    });

    // Sair ou soltar arquivos
    ['dragleave', 'drop'].forEach(tipoEvento => {

        areaAnexarFotos.addEventListener(tipoEvento, event => {

            event.preventDefault();

            areaAnexarFotos.classList.remove('is-dragging');
        });
    });

    // Receber arquivos arrastados
    areaAnexarFotos.addEventListener('drop', event => {

        adicionarFotos(event.dataTransfer.files);
    });
}


// Seleção pelo explorador de arquivos
campoFotos.addEventListener('change', () => {

    const erro = validarFotos(campoFotos.files);

    if (erro) {

        campoFotos.value = '';
        statusFotos.textContent = erro;

        return;
    }

    atualizarStatusFotos();
});


// ========================================================
// 6. ENVIAR FOTOS PARA O BACKEND
// ========================================================


async function enviarFotos() {

    const arquivos = Array.from(campoFotos.files);

    if (arquivos.length === 0) {
        return [];
    }

    const formData = new FormData();

    arquivos.forEach(foto => {
        formData.append('fotos', foto);
    });

    const response = await fetch(
        'http://localhost:8080/api/locais/upload',
        {
            method: 'POST',
            body: formData
        }
    );

    const resultado = await response.json();

    if (!response.ok) {
        throw new Error(
            resultado.erro || 'Erro ao enviar as fotos.'
        );
    }

    return resultado.fotos || [];
}



// ========================================================
// 7. CADASTRO E ATUALIZAÇÃO
// ========================================================

formulario.addEventListener('submit', async (event) => {

    event.preventDefault();

    botaoSubmit.disabled = true;

    const textoOriginal = localEmEdicao
        ? 'Salvar alterações'
        : 'Contribuir';

    botaoSubmit.textContent = 'Enviando...';

    try {

        // Envia as fotos selecionadas
        const fotosEnviadas = await enviarFotos();

    console.log('URLs das fotos:', fotosEnviadas);

        // Na edição, preserva as coordenadas originais
        const latitude = localOriginal
            ? Number(localOriginal.lat)
            : Number(campoLatitude.value);

        const longitude = localOriginal
            ? Number(localOriginal.lng)
            : Number(campoLongitude.value);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            throw new Error('Localização inválida. Não foi possível salvar.');
        }

        // Monta os dados do local
        const local = {

            nome: document.getElementById('nome-local').value,

            lat: latitude,
            lng: longitude,

            descricao: campoDescricao.value,

            rampa:
                document.querySelector('input[name="rampa"]:checked')
                    ?.value === 'sim',

            banheiro:
                document.querySelector('input[name="banheiro"]:checked')
                    ?.value === 'sim',

            pisoTatil:
                document.querySelector('input[name="piso-tatil"]:checked')
                    ?.value === 'sim',

            // Preserva a foto anterior
            foto: fotosEnviadas.length > 0
    ? fotosEnviadas[0]
    : (localOriginal?.foto || null)
        };

        // Decide entre POST e PUT
        const response = await fetch(

            localEmEdicao
                ? `http://localhost:8080/api/locais/${localEmEdicao}`
                : 'http://localhost:8080/api/locais',

            {
                method: localEmEdicao ? 'PUT' : 'POST',

                headers: {
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify(local)
            }
        );

        if (!response.ok) {
            throw new Error('Erro ao salvar local.');
        }

        alert(
            localEmEdicao
                ? 'Local atualizado com sucesso!'
                : 'Local cadastrado com sucesso!'
        );

        // Limpa a edição anterior
        sessionStorage.removeItem('localEmEdicao');

        localEmEdicao = null;
        localOriginal = null;

        // Limpa o formulário
        formulario.reset();

        // Libera a localização para um novo cadastro
        campoLocalizacao.disabled = false;
        campoLocalizacao.readOnly = false;

        atualizarStatusFotos();

        botaoSubmit.textContent = 'Contribuir';

        obterLocalizacao();

    } catch (error) {

        console.error(error);

        alert(error.message || 'Não foi possível salvar o local.');

    } finally {

        botaoSubmit.disabled = false;

        botaoSubmit.textContent = localEmEdicao
            ? 'Salvar alterações'
            : 'Contribuir';
    }
});


// ========================================================
// 8. EXCLUIR LOCAL
// ========================================================

async function excluirLocal(id) {

    if (!confirm('Deseja realmente excluir este local?')) {
        return;
    }

    try {

        const response = await fetch(
            `http://localhost:8080/api/locais/${id}`,
            {
                method: 'DELETE'
            }
        );

        if (!response.ok) {
            throw new Error('Erro ao excluir local.');
        }

        alert('Local excluído com sucesso!');

        sessionStorage.removeItem('localEmEdicao');

        window.location.reload();

    } catch (error) {

        console.error(error);

        alert('Não foi possível excluir o local.');
    }
}
