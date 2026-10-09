export const TEMPO_LIMITE_MS = 2000;

export const avisos = new EventTarget();

const cliente = new URLSearchParams(location.search).get("cliente") ?? "1";

export class Falha extends Error {
  constructor(tipo) {
    super(tipo);
    this.tipo = tipo;
  }
}

export async function tentar() {
  avisos.dispatchEvent(new CustomEvent("tentativa"));
  try {
    const resposta = await fetch(`/api/pedido?cliente=${cliente}`, {
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
    });
    if (resposta.status === 429) throw new Falha("limite");
    if (!resposta.ok) throw new Falha("erro");
    const corpo = await resposta.json();
    avisos.dispatchEvent(new CustomEvent("resultado", { detail: "sucesso" }));
    return corpo;
  } catch (erro) {
    const tipo = erro.name === "TimeoutError" ? "timeout" : erro.tipo ?? "erro";
    avisos.dispatchEvent(new CustomEvent("resultado", { detail: tipo }));
    throw new Falha(tipo);
  }
}

export async function esperar(milissegundos) {
  avisos.dispatchEvent(new CustomEvent("espera", { detail: milissegundos }));
  await new Promise((pronto) => setTimeout(pronto, milissegundos));
}
