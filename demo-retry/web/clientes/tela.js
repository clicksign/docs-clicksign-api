import { avisos, TEMPO_LIMITE_MS } from "./comum.js";

const parametros = new URLSearchParams(location.search);
const arquivo = parametros.get("estrategia") ?? "1-sem-retry";
const cliente = parametros.get("cliente") ?? "1";
const intervalo = Number(parametros.get("intervalo") ?? 10000);
const INICIO_DAS_RODADAS_MS = 8000;

const estrategia = await import(`./${arquivo}.js`);

const tela = {
  titulo: document.querySelector("#titulo"),
  estrategia: document.querySelector("#estrategia"),
  situacao: document.querySelector("#situacao"),
  progresso: document.querySelector("#progresso"),
  taxa: document.querySelector("#taxa"),
  placar: document.querySelector("#placar"),
  ligacoes: document.querySelector("#ligacoes"),
  porPedido: document.querySelector("#por-pedido"),
  historico: document.querySelector("#historico"),
};

const SIMBOLOS = { sucesso: "200", limite: "429", timeout: "⏱", erro: "!" };

const placar = { atendidos: 0, falhos: 0, ligacoes: 0 };
let linhaAtual = null;
let fichaAtual = null;
let tentativaAtual = 0;
let animacao = null;

tela.titulo.textContent = `Cliente ${cliente}`;
tela.estrategia.textContent = estrategia.nome;
document.title = `Cliente ${cliente} · ${estrategia.nome}`;

function animarBarra(duracao, classe) {
  cancelAnimationFrame(animacao);
  const inicio = performance.now();
  tela.progresso.className = classe;
  const passo = (agora) => {
    const fracao = Math.min(1, (agora - inicio) / duracao);
    tela.progresso.style.width = `${fracao * 100}%`;
    if (fracao < 1) animacao = requestAnimationFrame(passo);
  };
  animacao = requestAnimationFrame(passo);
}

function pararBarra() {
  cancelAnimationFrame(animacao);
  tela.progresso.style.width = "0";
}

function mostrarSituacao(texto, classe = "") {
  tela.situacao.textContent = texto;
  tela.situacao.className = classe;
}

function atualizarNumeros() {
  const total = placar.atendidos + placar.falhos;
  tela.taxa.textContent = total ? `${Math.round((placar.atendidos / total) * 100)}%` : "–";
  tela.placar.textContent = `${placar.atendidos} ✓ · ${placar.falhos} ✗`;
  tela.ligacoes.textContent = placar.ligacoes;
  tela.porPedido.textContent = total
    ? `ligações · ${(placar.ligacoes / total).toFixed(1).replace(".", ",")} por pedido`
    : "ligações ao servidor";
}

avisos.addEventListener("tentativa", () => {
  tentativaAtual++;
  placar.ligacoes++;
  atualizarNumeros();
  fichaAtual = document.createElement("span");
  fichaAtual.className = "ficha andamento";
  fichaAtual.textContent = "…";
  linhaAtual.append(fichaAtual);
  mostrarSituacao(`📞 Ligando… tentativa ${tentativaAtual}`);
  animarBarra(TEMPO_LIMITE_MS, "");
});

avisos.addEventListener("resultado", ({ detail: tipo }) => {
  fichaAtual.className = `ficha ${tipo}`;
  fichaAtual.textContent = SIMBOLOS[tipo];
  pararBarra();
});

avisos.addEventListener("espera", ({ detail: milissegundos }) => {
  const espera = document.createElement("span");
  espera.className = "espera";
  espera.textContent = `· ${Math.round(milissegundos)} ms`;
  linhaAtual.append(espera);
  mostrarSituacao(`⏳ Esperando ${Math.round(milissegundos)} ms para tentar de novo`);
  animarBarra(milissegundos, "espera");
});

function novaLinha(numero) {
  const linha = document.createElement("li");
  linha.innerHTML = `<span class="numero">#${numero}</span><span class="final"></span>`;
  tela.historico.prepend(linha);
  while (tela.historico.children.length > 14) tela.historico.lastElementChild.remove();
  return linha;
}

function aguardarProximoHorario() {
  const falta = intervalo - ((Date.now() - INICIO_DAS_RODADAS_MS) % intervalo);
  return new Promise((pronto) => setTimeout(pronto, falta));
}

async function executar() {
  for (let numero = 1; ; numero++) {
    await aguardarProximoHorario();
    linhaAtual = novaLinha(numero);
    tentativaAtual = 0;
    const final = linhaAtual.querySelector(".final");

    try {
      await estrategia.fazerPedido();
      placar.atendidos++;
      final.textContent = "✓";
      final.classList.add("sucesso");
      mostrarSituacao(`✓ Pedido #${numero} atendido`, "sucesso");
    } catch {
      placar.falhos++;
      final.textContent = "✗";
      final.classList.add("falha");
      mostrarSituacao(`✗ Pedido #${numero} falhou`, "falha");
    }
    atualizarNumeros();
  }
}

document.querySelector("#ver-codigo").addEventListener("click", async () => {
  const resposta = await fetch(`${arquivo}.js`);
  document.querySelector("#fonte").textContent = await resposta.text();
  document.querySelector("#codigo").showModal();
});

executar();
