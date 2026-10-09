export function calcularEspera(tentativa, ajustes) {
  let espera = ajustes.esperaInicial;

  if (ajustes.exponencial) {
    espera = espera * ajustes.multiplicador ** (tentativa - 1);
  }

  espera = Math.min(espera, ajustes.esperaMaxima);

  if (ajustes.jitter) {
    const sorteio = ajustes.jitterMinimo + Math.random() * (ajustes.jitterMaximo - ajustes.jitterMinimo);
    espera = (espera * sorteio) / 100;
  }

  return espera;
}

export async function fazerPedido(ajustes, tentar, esperar) {
  for (let tentativa = 1; tentativa <= ajustes.tentativas; tentativa++) {
    try {
      return await tentar();
    } catch (erro) {
      if (tentativa === ajustes.tentativas) throw erro;
      await esperar(calcularEspera(tentativa, ajustes));
    }
  }
}
