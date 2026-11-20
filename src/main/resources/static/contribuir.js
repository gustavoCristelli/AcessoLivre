// ========================================================
// 1. Referências da tabela de acessibilidade
// ========================================================
const tabelaRecursos = document.querySelector('.tabela-recursos');
const areaAnexarFotos = document.getElementById('area-anexar-fotos');
const campoFotos = document.getElementById('fotos-local');
const statusFotos = document.getElementById('status-fotos-local');

// ========================================================
// 2. Limpeza opcional das respostas
// ========================================================
tabelaRecursos.addEventListener('click', function (event) {
    const botaoLimpar = event.target.closest('.limpar-resposta');

    if (!botaoLimpar) {
        return;
    }

    const linha = botaoLimpar.closest('tr');
    const respostaSelecionada = linha.querySelector('input[type="radio"]:checked');

    if (respostaSelecionada) {
        respostaSelecionada.checked = false;
        respostaSelecionada.dispatchEvent(new Event('input', { bubbles: true }));
        respostaSelecionada.dispatchEvent(new Event('change', { bubbles: true }));
    }
});

// ========================================================
// 3. Seleção e arraste de fotos
// ========================================================
function atualizarStatusFotos() {
    const quantidade = campoFotos.files.length;
    statusFotos.textContent = quantidade === 0
        ? ''
        : quantidade === 1
            ? campoFotos.files[0].name
            : `${quantidade} fotos selecionadas`;
}

function adicionarFotos(files) {
    const imagens = Array.from(files).filter(arquivo => arquivo.type.startsWith('image/'));

    if (imagens.length !== files.length) {
        statusFotos.textContent = 'Selecione apenas arquivos de imagem.';
        return;
    }

    const transferencia = new DataTransfer();
    imagens.forEach(imagem => transferencia.items.add(imagem));
    campoFotos.files = transferencia.files;
    atualizarStatusFotos();
}

areaAnexarFotos.addEventListener('click', () => campoFotos.click());
areaAnexarFotos.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        campoFotos.click();
    }
});
campoFotos.addEventListener('change', atualizarStatusFotos);

['dragenter', 'dragover'].forEach(tipoEvento => {
    areaAnexarFotos.addEventListener(tipoEvento, event => {
        event.preventDefault();
        areaAnexarFotos.classList.add('is-dragging');
    });
});

['dragleave', 'drop'].forEach(tipoEvento => {
    areaAnexarFotos.addEventListener(tipoEvento, event => {
        event.preventDefault();
        areaAnexarFotos.classList.remove('is-dragging');
    });
});

areaAnexarFotos.addEventListener('drop', event => {
    adicionarFotos(event.dataTransfer.files);
});