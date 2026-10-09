import { tentar, esperar } from "./comum.js";

export const nome = "Retry com backoff exponencial + jitter";

const MAXIMO_DE_TENTATIVAS = 10;
const ESPERA_INICIAL_MS = 1000;
const ESPERA_MAXIMA_MS = 4000;

export async function fazerPedido() {
  for (let tentativa = 1; tentativa <= MAXIMO_DE_TENTATIVAS; tentativa++) {
    try {
      return await tentar();
    } catch (erro) {
      if (tentativa === MAXIMO_DE_TENTATIVAS) throw erro;

      const espera = ESPERA_INICIAL_MS * 2 ** (tentativa - 1);
      const jitter = 0.5 + Math.random();
      await esperar(Math.min(espera, ESPERA_MAXIMA_MS) * jitter);
    }
  }
}
