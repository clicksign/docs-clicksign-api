# Demo: retry, backoff exponencial e jitter

Um servidor que falha de propósito e dez clientes ligando para ele ao mesmo tempo.
Só Python e JavaScript, sem instalar nada além do próprio Python.

Este servidor **não é a API da Clicksign**. Ele existe para mostrar, na sua máquina, a diferença entre tentar de novo na hora, esperar com backoff e espalhar as tentativas com jitter. Os limites da plataforma estão na documentação, em [Integração resiliente](https://developers.clicksign.com/docs/integracao-resiliente).

## Subir

Precisa do Python 3.9 ou mais novo (não usa nenhuma biblioteca extra) e do Chrome ou do Edge.

Extraia este projeto e, na pasta que contém `server.py`:

```bash
python3 server.py
```

No Windows o comando é `python server.py` (ou `py server.py`).

Abra **http://localhost:8013** no Chrome. Para parar o servidor, `Ctrl + C` no terminal.

| Página | Para quê |
|---|---|
| `http://localhost:8013/mosaico.html` | 10 clientes lado a lado + o painel do servidor. Troque a estratégia no topo; o botão `</> código` mostra o arquivo da estratégia ao lado. |
| `http://localhost:8013/laboratorio/` | Sliders de tentativas, espera, multiplicador, espera máxima, checkbox de jitter com mínimo/máximo. Gráficos ao vivo. |
| `http://localhost:8013/painel.html` | Só o servidor, segundo a segundo. |

Use **ou** o mosaico **ou** o laboratório por vez: os dois disputam o mesmo servidor e um bagunça os números do outro.

## O servidor (`server.py`)

| Regra | Comportamento |
|---|---|
| Sucesso | `200 {"status": "sucesso", "mensagem": "pedido processado", ...}` |
| Latência | toda resposta (200 ou 429) leva de 100 a 200 ms, como numa API de verdade. |
| Rate limit | aceita 1 ligação a cada 300 ms (no servidor inteiro). As outras recebem `429` na hora. |
| Instabilidade | nos segundos terminados em 2, 3, 5 e 7 o atendente trava por 10 s. O cliente desiste em 2 s (timeout). |

```bash
python3 server.py                          # trava nos segundos 2, 3, 5, 7
python3 server.py --instabilidade minutos  # trava o minuto inteiro quando o minuto termina em 2, 3, 5, 7
python3 server.py --instabilidade nenhuma  # só o rate limit
```

O terminal mostra cada ligação colorida: verde 200, amarelo 429, vermelho travou.

## Os clientes (`web/clientes/`)

Cada estratégia é um arquivo curto, para mostrar o código:

| Arquivo | O que faz |
|---|---|
| `1-sem-retry.js` | Liga uma vez. |
| `2-retry.js` | Liga de novo assim que recebe a resposta, até 10 vezes. |
| `3-backoff-exponencial.js` | Espera 1, 2, 4 s entre as tentativas (no máximo 4 s), até 10 vezes. |
| `4-backoff-com-jitter.js` | A mesma espera, multiplicada por um sorteio entre 0,5 e 1,5. |
| `comum.js` | `tentar()` (fetch com timeout de 2 s) e `esperar()`. É o que as quatro usam. |

Todos os clientes fazem um pedido a cada 10 s, **no mesmo instante do relógio** (nos segundos :08, :18, :28…, como uma rotina agendada às 14h00).
É isso que cria a rajada: dez ligações chegam juntas num servidor que aceita uma a cada 300 ms.

O laboratório usa a mesma lógica num arquivo só, parametrizado: `web/laboratorio/estrategia.js`.
Jitter lá é "sorteie entre mínimo% e máximo% da espera": 50–150% é o do arquivo 4; 0–100% é o *full jitter* da AWS.
Com 0–100%, alguns sorteios caem perto de zero, queimam tentativas em 429 e a taxa fica em ~98%; com o piso de 50% chega a ~99–100%.

## Roteiro sugerido

1. **Sem retry** (mosaico). A cada rodada, um cliente é atendido e nove levam 429. Quando a rodada cai num segundo instável, nem esse um.
2. **Retry**. A taxa de sucesso sobe para ~50%, mas custa ~7,6 ligações por pedido: o painel do servidor mostra a rajada a cada rodada. "Desligar e ligar de novo" no mesmo segundo só aumenta a fila.
   No painel, *atendentes presos* mostra quem continua ocupado com uma ligação que o cliente já desligou.
3. **Backoff exponencial**. Sobe para ~85–90% com bem menos ligações, mas olhe as fichas: todos esperam exatamente 1000, 2000, 4000 ms e voltam a ligar **juntos**. A rajada só mudou de lugar, e quem perde a disputa demora (~8 s até ser atendido).
4. **Backoff + jitter**. Cada cliente sorteia sua espera, as ligações se espalham: ~99–100% atendidos, com o **menor** número de ligações por pedido (~3) e mais rápido que o backoff puro.
5. **Laboratório**. As raias por cliente mostram o efeito: sem jitter as tentativas formam colunas verticais (sincronizadas); com jitter, viram uma nuvem. No gráfico *Quanto cada cliente espera*, os pontos se espalham pela faixa.
   Teste ao vivo: jitter 0–100% contra 50–150%, tentativas = 3, timeout menor que o travamento, e `--instabilidade minutos` para ver que nenhum retry salva uma queda longa.

### Números de referência (2 min por estratégia, 10 clientes, medidos no Chrome)

| Estratégia | Pedidos atendidos | Ligações por pedido | Tempo até ser atendido |
|---|---|---|---|
| Sem retry | 10% | 1,0 | 0,2 s |
| Retry | 53% | 7,6 | 0,8 s |
| Backoff exponencial | 90% | 4,4 | 8,4 s |
| Backoff + jitter | 100% | 3,0 | 5,3 s |

Variam um pouco a cada rodada, mas a ordem se repete.

## Por que cada cliente tem um endereço diferente

O mosaico abre os clientes em `c1.localhost`, `c2.localhost`, … e não em `localhost`.
O navegador só abre 6 conexões simultâneas por endereço; com 10 clientes presos em timeout no mesmo endereço,
o próprio navegador enfileiraria as ligações e o efeito apareceria errado. `*.localhost` sempre aponta para a sua máquina.

## Ajustes rápidos

- `server.py`: `JANELA_DO_LIMITE_S`, `TEMPO_TRAVADO_S`, `DIGITOS_PRIMOS`.
- `web/clientes/comum.js`: `TEMPO_LIMITE_MS` (timeout do cliente).
- Mosaico: `mosaico.html?estrategia=2-retry&intervalo=3000` muda o tempo entre pedidos (em ms).
