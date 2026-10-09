import { tentar } from "./comum.js";

export const nome = "Retry";

const MAXIMO_DE_TENTATIVAS = 10;

export async function fazerPedido() {
  for (let tentativa = 1; tentativa <= MAXIMO_DE_TENTATIVAS; tentativa++) {
    try {
      return await tentar();
    } catch (erro) {
      if (tentativa === MAXIMO_DE_TENTATIVAS) throw erro;
    }
  }
}
