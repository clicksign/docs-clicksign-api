const tela = {
  estado: document.querySelector("#estado"),
  modo: document.querySelector("#modo"),
  chegando: document.querySelector("#chegando"),
  capacidade: document.querySelector("#capacidade"),
  recusadas: document.querySelector("#recusadas"),
  travados: document.querySelector("#travados"),
  grafico: document.querySelector("#grafico"),
};

const CAMADAS = [
  { chave: "sucesso", cor: "var(--sucesso)", nome: "atendidas" },
  { chave: "timeout", cor: "var(--timeout)", nome: "travaram" },
  { chave: "limite", cor: "var(--limite)", nome: "recusadas" },
];

const formatar = (numero) => numero.toFixed(1).replace(".", ",");

function desenhar(dados) {
  const largura = tela.grafico.clientWidth;
  const altura = tela.grafico.clientHeight;
  const margem = { esquerda: 28, direita: 8, topo: 8, base: 18 };
  const segundos = dados.segundos;
  const totais = segundos.map((s) => s.sucesso + s.limite + s.timeout);
  const teto = Math.max(6, Math.ceil(Math.max(...totais) / 5) * 5);
  const passo = (largura - margem.esquerda - margem.direita) / segundos.length;
  const escala = (valor) => altura - margem.base - (valor / teto) * (altura - margem.topo - margem.base);

  let svg = `<svg viewBox="0 0 ${largura} ${altura}">`;

  segundos.forEach((s, i) => {
    if (s.instavel) {
      svg += `<rect class="instavel" x="${margem.esquerda + i * passo}" y="${margem.topo}" width="${passo}" height="${altura - margem.topo - margem.base}"/>`;
    }
  });

  for (let valor = 0; valor <= teto; valor += teto / 5) {
    svg += `<line class="grade" x1="${margem.esquerda}" x2="${largura - margem.direita}" y1="${escala(valor)}" y2="${escala(valor)}"/>`;
    svg += `<text class="eixo" x="${margem.esquerda - 6}" y="${escala(valor) + 4}" text-anchor="end">${valor}</text>`;
  }

  segundos.forEach((s, i) => {
    const x = margem.esquerda + i * passo + 2;
    const larguraBarra = Math.max(2, passo - 4);
    let base = 0;
    const horario = new Date(s.segundo * 1000).toLocaleTimeString("pt-BR");
    for (const camada of CAMADAS) {
      const valor = s[camada.chave];
      if (!valor) continue;
      const y = escala(base + valor);
      const alturaBarra = escala(base) - y - 2;
      svg += `<rect x="${x}" y="${y}" width="${larguraBarra}" height="${Math.max(1, alturaBarra)}" rx="2" fill="${camada.cor}"><title>${horario} · ${valor} ${camada.nome}</title></rect>`;
      base += valor;
    }
    if (i % 5 === 4) {
      svg += `<text class="eixo" x="${x + larguraBarra / 2}" y="${altura - 4}" text-anchor="middle">${horario.slice(3)}</text>`;
    }
  });

  const yCapacidade = escala(dados.capacidade_por_segundo);
  svg += `<line class="capacidade" x1="${margem.esquerda}" x2="${largura - margem.direita}" y1="${yCapacidade}" y2="${yCapacidade}"/>`;
  svg += `<text class="rotulo-capacidade" x="${largura - margem.direita - 4}" y="${yCapacidade - 4}" text-anchor="end">capacidade</text>`;
  svg += "</svg>";

  tela.grafico.innerHTML = svg;
}

function atualizarNumeros(dados) {
  const ultimos = dados.segundos.slice(-11, -1);
  const soma = (chave) => ultimos.reduce((total, s) => total + s[chave], 0);
  const chegaram = soma("sucesso") + soma("limite") + soma("timeout");

  tela.estado.textContent = dados.instavel_agora ? "⚠ instável" : "✓ estável";
  tela.estado.className = dados.instavel_agora ? "instavel" : "";
  tela.modo.textContent = dados.instabilidade === "nenhuma"
    ? "sem instabilidade programada"
    : `trava nos ${dados.instabilidade} terminados em 2, 3, 5 e 7`;
  tela.chegando.textContent = formatar(chegaram / 10);
  tela.capacidade.textContent = formatar(dados.capacidade_por_segundo);
  tela.recusadas.textContent = chegaram ? `${Math.round((soma("limite") / chegaram) * 100)}%` : "0%";
  tela.travados.textContent = dados.atendimentos_travados;
}

async function atualizar() {
  try {
    const resposta = await fetch("/api/estatisticas");
    const dados = await resposta.json();
    atualizarNumeros(dados);
    desenhar(dados);
  } catch {
    tela.estado.textContent = "servidor fora do ar";
    tela.estado.className = "instavel";
  }
}

atualizar();
setInterval(atualizar, 500);
