import { fazerPedido, calcularEspera } from "./estrategia.js";

const MAXIMO_DE_CLIENTES = 10;
const JANELA_DAS_RAIAS_MS = 20000;
const JANELA_DOS_INDICADORES_MS = 120000;
const RODADAS_NO_GRAFICO = 12;
const INICIO_DAS_RODADAS_MS = 8000;

const RECEITAS = {
  semRetry: { tentativas: 1, esperaInicial: 0, exponencial: false, jitter: false },
  retry: { tentativas: 10, esperaInicial: 0, exponencial: false, jitter: false },
  backoff: { tentativas: 10, esperaInicial: 1000, exponencial: true, multiplicador: 2, esperaMaxima: 4000, jitter: false },
  jitter: { tentativas: 10, esperaInicial: 1000, exponencial: true, multiplicador: 2, esperaMaxima: 4000, jitter: true, jitterMinimo: 50, jitterMaximo: 150 },
};

const ajustes = {};
const raias = Array.from({ length: MAXIMO_DE_CLIENTES }, () => []);
let pedidos = [];
let esperasSorteadas = [];
let segundosDoServidor = [];
let pausado = false;
let areasComDica = [];

const $ = (seletor) => document.querySelector(seletor);
const cor = (nome) => getComputedStyle(document.documentElement).getPropertyValue(`--${nome}`).trim();
const formatarNumero = (numero, casas = 1) => numero.toFixed(casas).replace(".", ",");

function lerAjustes() {
  for (const campo of document.querySelectorAll("#ajustes input")) {
    ajustes[campo.id] = campo.type === "checkbox" ? campo.checked : Number(campo.value);
  }
  ajustes.jitterMaximo = Math.max(ajustes.jitterMaximo, ajustes.jitterMinimo);

  for (const saida of document.querySelectorAll("output[data-para]")) {
    saida.textContent = `${ajustes[saida.dataset.para]}${saida.dataset.unidade ?? ""}`;
  }

  $("#esperaInicial").closest("fieldset").disabled = ajustes.tentativas === 1;
  $("#multiplicador").closest("fieldset").disabled = !ajustes.exponencial;
  $("#jitterMinimo").closest("fieldset").disabled = !ajustes.jitter;

  for (const botao of document.querySelectorAll("[data-receita]")) {
    const receita = RECEITAS[botao.dataset.receita];
    const igual = Object.entries(receita).every(([chave, valor]) => ajustes[chave] === valor);
    botao.classList.toggle("ativa", igual);
  }
}

function aplicarReceita(nome) {
  for (const [chave, valor] of Object.entries(RECEITAS[nome])) {
    const campo = $(`#${chave}`);
    if (campo.type === "checkbox") campo.checked = valor;
    else campo.value = valor;
  }
  lerAjustes();
  zerar();
}

function zerar() {
  pedidos = [];
  esperasSorteadas = [];
}

function enderecoDoCliente(numero) {
  if (location.hostname !== "localhost") return location.origin;
  return `${location.protocol}//c${numero}.localhost:${location.port}`;
}

async function ligar(numero, pedido) {
  pedido.ligacoes++;
  const ligacao = { tipo: "ligacao", tentativa: pedido.ligacoes, inicio: Date.now(), fim: null, resultado: null };
  raias[numero - 1].push(ligacao);

  try {
    const resposta = await fetch(`${enderecoDoCliente(numero)}/api/pedido?cliente=lab-${numero}`, {
      signal: AbortSignal.timeout(ajustes.timeout),
      cache: "no-store",
    });
    ligacao.resultado = resposta.ok ? "sucesso" : resposta.status === 429 ? "limite" : "erro";
  } catch (erro) {
    ligacao.resultado = erro.name === "TimeoutError" ? "timeout" : "erro";
  }

  ligacao.fim = Date.now();
  if (ligacao.resultado !== "sucesso") throw new Error(ligacao.resultado);
}

async function esperar(numero, pedido, milissegundos) {
  const agora = Date.now();
  raias[numero - 1].push({ tipo: "espera", tentativa: pedido.ligacoes, inicio: agora, fim: agora + milissegundos });
  esperasSorteadas.push({ cliente: numero, tentativa: pedido.ligacoes, milissegundos, quando: agora });
  await new Promise((pronto) => setTimeout(pronto, milissegundos));
}

function aguardarProximaRodada() {
  const intervalo = ajustes.intervalo * 1000;
  const falta = intervalo - ((Date.now() - INICIO_DAS_RODADAS_MS) % intervalo);
  return new Promise((pronto) => setTimeout(pronto, falta));
}

async function rodarCliente(numero) {
  while (true) {
    await aguardarProximaRodada();
    if (pausado || numero > ajustes.clientes) continue;

    const intervalo = ajustes.intervalo * 1000;
    const pedido = {
      cliente: numero,
      rodada: Math.round((Date.now() - INICIO_DAS_RODADAS_MS) / intervalo) * intervalo + INICIO_DAS_RODADAS_MS,
      inicio: Date.now(),
      ligacoes: 0,
    };
    pedidos.push(pedido);

    try {
      await fazerPedido(ajustes, () => ligar(numero, pedido), (ms) => esperar(numero, pedido, ms));
      pedido.sucesso = true;
    } catch {
      pedido.sucesso = false;
    }
    pedido.fim = Date.now();
  }
}

function prepararCanvas(canvas) {
  const escala = devicePixelRatio || 1;
  const largura = canvas.clientWidth;
  const altura = canvas.clientHeight;
  if (canvas.width !== largura * escala || canvas.height !== altura * escala) {
    canvas.width = largura * escala;
    canvas.height = altura * escala;
  }
  const contexto = canvas.getContext("2d");
  contexto.setTransform(escala, 0, 0, escala, 0, 0);
  contexto.clearRect(0, 0, largura, altura);
  return { contexto, largura, altura };
}

function retanguloArredondado(contexto, x, y, largura, altura, raio) {
  contexto.beginPath();
  contexto.roundRect(x, y, largura, altura, Math.min(raio, largura / 2, altura / 2));
  contexto.fill();
}

function desenharRaias(agora) {
  const { contexto, largura, altura } = prepararCanvas($("#raias"));
  const margem = { esquerda: 72, direita: 10, topo: 4, base: 20 };
  const inicioDaJanela = agora - JANELA_DAS_RAIAS_MS;
  const x = (momento) => margem.esquerda + ((momento - inicioDaJanela) / JANELA_DAS_RAIAS_MS) * (largura - margem.esquerda - margem.direita);
  const alturaDaRaia = (altura - margem.topo - margem.base) / ajustes.clientes;
  const cores = {
    sucesso: cor("sucesso"), limite: cor("limite"), timeout: cor("timeout"), erro: cor("texto-suave"),
    andamento: cor("destaque"), espera: cor("texto-apagado"), instavel: cor("faixa-instavel"),
    grade: cor("borda"), texto: cor("texto-suave"), apagado: cor("texto-apagado"),
  };
  areasComDica = [];

  contexto.fillStyle = cores.instavel;
  for (const segundo of segundosDoServidor) {
    if (!segundo.instavel) continue;
    const comeco = Math.max(x(segundo.segundo * 1000), margem.esquerda);
    const fim = x(segundo.segundo * 1000 + 1000);
    if (fim > comeco) contexto.fillRect(comeco, margem.topo, fim - comeco, altura - margem.topo - margem.base);
  }

  const intervalo = ajustes.intervalo * 1000;
  contexto.font = "11px system-ui, sans-serif";
  contexto.textAlign = "center";
  const primeiraRodada = Math.ceil((inicioDaJanela - INICIO_DAS_RODADAS_MS) / intervalo) * intervalo + INICIO_DAS_RODADAS_MS;
  for (let rodada = primeiraRodada; rodada <= agora; rodada += intervalo) {
    contexto.strokeStyle = cores.grade;
    contexto.setLineDash([3, 3]);
    contexto.beginPath();
    contexto.moveTo(x(rodada), margem.topo);
    contexto.lineTo(x(rodada), altura - margem.base);
    contexto.stroke();
    contexto.setLineDash([]);
    contexto.fillStyle = cores.apagado;
    contexto.fillText(new Date(rodada).toLocaleTimeString("pt-BR"), x(rodada), altura - 6);
  }

  contexto.textAlign = "left";
  for (let indice = 0; indice < ajustes.clientes; indice++) {
    const centro = margem.topo + alturaDaRaia * (indice + 0.5);
    const alturaDaLigacao = Math.min(16, alturaDaRaia * 0.6);

    contexto.fillStyle = cores.texto;
    contexto.font = "12px system-ui, sans-serif";
    contexto.fillText(`Cliente ${indice + 1}`, 4, centro + 4);
    contexto.fillStyle = cores.grade;
    contexto.fillRect(margem.esquerda, centro, largura - margem.esquerda - margem.direita, 1);

    for (const trecho of raias[indice]) {
      const fim = Math.min(trecho.fim ?? agora, agora);
      if (fim < inicioDaJanela) continue;
      const comeco = Math.max(x(trecho.inicio), margem.esquerda);

      if (trecho.tipo === "espera") {
        contexto.fillStyle = cores.espera;
        contexto.fillRect(comeco, centro - 1, Math.max(0, x(fim) - comeco), 2);
        areasComDica.push({ x1: comeco, x2: x(fim), y1: centro - 6, y2: centro + 6,
          texto: `Cliente ${indice + 1} · esperando ${Math.round(trecho.fim - trecho.inicio)} ms antes da tentativa ${trecho.tentativa + 1}` });
        continue;
      }

      const larguraDaLigacao = Math.max(4, x(fim) - comeco);
      contexto.fillStyle = cores[trecho.resultado ?? "andamento"];
      retanguloArredondado(contexto, comeco, centro - alturaDaLigacao / 2, larguraDaLigacao, alturaDaLigacao, 3);
      const nomes = { sucesso: "200 atendida", limite: "429 recusada", timeout: "timeout", erro: "erro", null: "ligando…" };
      areasComDica.push({ x1: comeco - 2, x2: comeco + larguraDaLigacao + 2, y1: centro - alturaDaLigacao, y2: centro + alturaDaLigacao,
        texto: `Cliente ${indice + 1} · tentativa ${trecho.tentativa} · ${nomes[trecho.resultado]} · ${Math.round(fim - trecho.inicio)} ms` });
    }
  }
}

function desenharPlano(agora) {
  const { contexto, largura, altura } = prepararCanvas($("#plano"));
  const cores = { faixa: cor("espera"), ponto: cor("destaque"), anel: cor("superficie"), texto: cor("texto-suave"), apagado: cor("texto-apagado"), grade: cor("borda") };
  contexto.font = "12px system-ui, sans-serif";

  if (ajustes.tentativas === 1) {
    contexto.fillStyle = cores.texto;
    contexto.fillText("Sem retry: falhou, o cliente desiste.", 8, 24);
    return;
  }

  const linhas = [];
  for (let tentativa = 1; tentativa < ajustes.tentativas; tentativa++) {
    const semJitter = calcularEspera(tentativa, { ...ajustes, jitter: false });
    const minimo = ajustes.jitter ? (semJitter * ajustes.jitterMinimo) / 100 : semJitter;
    const maximo = ajustes.jitter ? (semJitter * ajustes.jitterMaximo) / 100 : semJitter;
    linhas.push({ tentativa, minimo, maximo });
  }

  const margem = { esquerda: 92, direita: 14, topo: 4, base: 20 };
  const maior = Math.max(500, ...linhas.map((linha) => linha.maximo));
  const passoDoEixo = maior > 4000 ? 2000 : maior > 2000 ? 1000 : 500;
  const teto = Math.ceil(maior / passoDoEixo) * passoDoEixo;
  const x = (ms) => margem.esquerda + (ms / teto) * (largura - margem.esquerda - margem.direita);
  const alturaDaLinha = (altura - margem.topo - margem.base) / linhas.length;

  contexto.textAlign = "center";
  for (let ms = 0; ms <= teto; ms += passoDoEixo) {
    contexto.fillStyle = cores.grade;
    contexto.fillRect(x(ms), margem.topo, 1, altura - margem.topo - margem.base);
    contexto.fillStyle = cores.apagado;
    contexto.font = "11px system-ui, sans-serif";
    contexto.fillText(ms >= 1000 ? `${ms / 1000} s` : `${ms} ms`, x(ms), altura - 6);
  }

  for (const [indice, linha] of linhas.entries()) {
    const centro = margem.topo + alturaDaLinha * (indice + 0.5);
    contexto.textAlign = "left";
    contexto.fillStyle = cores.texto;
    contexto.font = "12px system-ui, sans-serif";
    contexto.fillText(`antes da ${linha.tentativa + 1}ª`, 4, centro + 4);

    contexto.fillStyle = cores.faixa;
    const comeco = x(linha.minimo);
    retanguloArredondado(contexto, comeco, centro - 5, Math.max(4, x(linha.maximo) - comeco), 10, 4);

    for (const sorteio of esperasSorteadas) {
      if (sorteio.tentativa !== linha.tentativa) continue;
      const idade = (agora - sorteio.quando) / 10000;
      if (idade > 1) continue;
      const deslocamento = ((sorteio.cliente % 5) - 2) * Math.min(4, alturaDaLinha / 10);
      contexto.globalAlpha = 1 - idade * 0.8;
      contexto.beginPath();
      contexto.arc(x(Math.min(sorteio.milissegundos, teto)), centro + deslocamento, 5, 0, Math.PI * 2);
      contexto.fillStyle = cores.ponto;
      contexto.fill();
      contexto.lineWidth = 2;
      contexto.strokeStyle = cores.anel;
      contexto.stroke();
      contexto.globalAlpha = 1;
    }
  }
}

function desenharRodadas() {
  const caixa = $("#rodadas");
  const largura = caixa.clientWidth;
  const altura = caixa.clientHeight;
  const margem = { esquerda: 24, direita: 6, topo: 6, base: 18 };
  const porRodada = new Map();
  for (const pedido of pedidos) {
    const contagem = porRodada.get(pedido.rodada) ?? { atendidos: 0, falharam: 0 };
    if (pedido.sucesso === true) contagem.atendidos++;
    if (pedido.sucesso === false) contagem.falharam++;
    porRodada.set(pedido.rodada, contagem);
  }
  const rodadas = [...porRodada.entries()].sort((a, b) => a[0] - b[0]).slice(-RODADAS_NO_GRAFICO);
  const teto = MAXIMO_DE_CLIENTES;
  const y = (valor) => altura - margem.base - (valor / teto) * (altura - margem.topo - margem.base);
  const passo = (largura - margem.esquerda - margem.direita) / RODADAS_NO_GRAFICO;

  let svg = `<svg viewBox="0 0 ${largura} ${altura}">`;
  for (let valor = 0; valor <= teto; valor += 5) {
    svg += `<line class="grade" x1="${margem.esquerda}" x2="${largura - margem.direita}" y1="${y(valor)}" y2="${y(valor)}"/>`;
    svg += `<text class="eixo" x="${margem.esquerda - 6}" y="${y(valor) + 4}" text-anchor="end">${valor}</text>`;
  }
  rodadas.forEach(([rodada, { atendidos, falharam }], indice) => {
    const x = margem.esquerda + indice * passo + 3;
    const larguraDaBarra = Math.max(4, passo - 6);
    const horario = new Date(rodada).toLocaleTimeString("pt-BR");
    const dica = `<title>${horario} · ${atendidos} atendidos · ${falharam} falharam</title>`;
    if (atendidos) {
      svg += `<rect x="${x}" y="${y(atendidos)}" width="${larguraDaBarra}" height="${y(0) - y(atendidos)}" rx="3" fill="var(--sucesso)">${dica}</rect>`;
    }
    if (falharam) {
      svg += `<rect x="${x}" y="${y(atendidos + falharam)}" width="${larguraDaBarra}" height="${y(atendidos) - y(atendidos + falharam) - 2}" rx="3" fill="var(--timeout)">${dica}</rect>`;
    }
    if (indice % 3 === 0) {
      svg += `<text class="eixo" x="${x + larguraDaBarra / 2}" y="${altura - 4}" text-anchor="middle">${horario.slice(3)}</text>`;
    }
  });
  svg += "</svg>";
  caixa.innerHTML = svg;
}

function atualizarIndicadores(agora) {
  const recentes = pedidos.filter((pedido) => pedido.fim && pedido.fim > agora - JANELA_DOS_INDICADORES_MS);
  const atendidos = recentes.filter((pedido) => pedido.sucesso);
  if (!recentes.length) {
    for (const id of ["taxaSucesso", "taxaFalha", "porPedido", "tempoMedio"]) $(`#${id}`).textContent = "–";
    return;
  }
  const ligacoes = recentes.reduce((total, pedido) => total + pedido.ligacoes, 0);
  const tempo = atendidos.reduce((total, pedido) => total + (pedido.fim - pedido.inicio), 0);

  $("#taxaSucesso").textContent = `${Math.round((atendidos.length / recentes.length) * 100)}%`;
  $("#taxaFalha").textContent = `${Math.round(((recentes.length - atendidos.length) / recentes.length) * 100)}%`;
  $("#porPedido").textContent = formatarNumero(ligacoes / recentes.length);
  $("#tempoMedio").textContent = atendidos.length ? `${formatarNumero(tempo / atendidos.length / 1000)} s` : "–";
}

function limparHistoricoAntigo(agora) {
  for (const raia of raias) {
    while (raia.length && (raia[0].fim ?? agora) < agora - JANELA_DAS_RAIAS_MS - 1000) raia.shift();
  }
  pedidos = pedidos.filter((pedido) => !pedido.fim || pedido.fim > agora - 180000);
  esperasSorteadas = esperasSorteadas.filter((sorteio) => sorteio.quando > agora - 10000);
}

async function acompanharServidor() {
  try {
    const resposta = await fetch("/api/estatisticas", { cache: "no-store" });
    segundosDoServidor = (await resposta.json()).segundos;
  } catch {
    segundosDoServidor = [];
  }
}

function animar() {
  const agora = Date.now();
  desenharRaias(agora);
  desenharPlano(agora);
  requestAnimationFrame(animar);
}

function mostrarDica(evento) {
  const canvas = $("#raias");
  const caixa = canvas.getBoundingClientRect();
  const x = evento.clientX - caixa.left;
  const y = evento.clientY - caixa.top;
  const area = areasComDica.findLast((a) => x >= a.x1 && x <= a.x2 && y >= a.y1 && y <= a.y2);
  const dica = $("#dica-flutuante");
  dica.hidden = !area;
  if (!area) return;
  dica.textContent = area.texto;
  dica.style.left = `${evento.clientX + 12}px`;
  dica.style.top = `${evento.clientY + 12}px`;
}

document.querySelectorAll("#ajustes input").forEach((campo) => campo.addEventListener("input", lerAjustes));
document.querySelectorAll("[data-receita]").forEach((botao) => {
  botao.addEventListener("click", () => aplicarReceita(botao.dataset.receita));
});
$("#pausar").addEventListener("click", (evento) => {
  pausado = !pausado;
  evento.target.textContent = pausado ? "▶ Continuar" : "⏸ Pausar";
});
$("#zerar").addEventListener("click", zerar);
$("#raias").addEventListener("mousemove", mostrarDica);
$("#raias").addEventListener("mouseleave", () => ($("#dica-flutuante").hidden = true));
$("#painel").src = "/painel.html";

const receitaInicial = new URLSearchParams(location.search).get("receita");
if (receitaInicial in RECEITAS) aplicarReceita(receitaInicial);
lerAjustes();

for (let numero = 1; numero <= MAXIMO_DE_CLIENTES; numero++) rodarCliente(numero);
setInterval(() => {
  const agora = Date.now();
  atualizarIndicadores(agora);
  desenharRodadas();
  limparHistoricoAntigo(agora);
}, 250);
setInterval(acompanharServidor, 500);
acompanharServidor();
animar();
