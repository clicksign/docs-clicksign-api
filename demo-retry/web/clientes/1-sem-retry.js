import { tentar } from "./comum.js";

export const nome = "Sem retry";

export async function fazerPedido() {
  return tentar();
}
