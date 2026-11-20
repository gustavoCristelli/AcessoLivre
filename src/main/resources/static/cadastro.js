// ========================================================
// 1. Referências das etapas
// ========================================================
const formularioCadastro = document.getElementById('form-cadastro');
const etapaConta = document.getElementById('etapa-conta');
const etapaAcessibilidade = document.getElementById('etapa-acessibilidade');
const botaoVoltar = document.getElementById('voltar-cadastro');
const tituloCadastro = document.getElementById('titulo-cadastro');
const tituloAcessibilidade = document.getElementById('perfil-acessibilidade-titulo');
const prefereMovimentoReduzido = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const duracaoFade = prefereMovimentoReduzido ? 0 : 250;

let transicaoEmAndamento = false;

// ========================================================
// 2. Transição entre etapas
// ========================================================
function trocarEtapa(etapaAtual, proximaEtapa, tituloEmFoco) {
    if (transicaoEmAndamento) {
        return;
    }

    transicaoEmAndamento = true;
    etapaAtual.classList.add('is-fading-out');

    window.setTimeout(function () {
        etapaAtual.hidden = true;
        etapaAtual.classList.remove('is-fading-out');
        proximaEtapa.hidden = false;

        if (duracaoFade === 0) {
            transicaoEmAndamento = false;
            tituloEmFoco.focus();
            return;
        }

        proximaEtapa.classList.add('is-fading-in');
        void proximaEtapa.offsetWidth;
        window.requestAnimationFrame(function () {
            proximaEtapa.classList.remove('is-fading-in');
        });

        window.setTimeout(function () {
            transicaoEmAndamento = false;
            tituloEmFoco.focus();
        }, duracaoFade);
    }, duracaoFade);
}

// ========================================================
// 3. Eventos do cadastro
// ========================================================
formularioCadastro.addEventListener('submit', function (event) {
    event.preventDefault();
    trocarEtapa(etapaConta, etapaAcessibilidade, tituloAcessibilidade);
});

botaoVoltar.addEventListener('click', function () {
    trocarEtapa(etapaAcessibilidade, etapaConta, tituloCadastro);
});