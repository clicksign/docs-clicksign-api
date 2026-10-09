import argparse
import json
import random
import threading
import time
from collections import deque
from datetime import datetime
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

PORTA = 8013
PASTA_WEB = Path(__file__).parent / "web"

JANELA_DO_LIMITE_S = 0.3
TEMPO_TRAVADO_S = 10
LATENCIA_S = (0.1, 0.2)
DIGITOS_PRIMOS = {2, 3, 5, 7}

VERDE = "\033[92m"
AMARELO = "\033[93m"
VERMELHO = "\033[91m"
CINZA = "\033[90m"
NORMAL = "\033[0m"


class Servidor:
    def __init__(self, instabilidade):
        self.instabilidade = instabilidade
        self.trava = threading.Lock()
        self.ultimo_atendimento = 0.0
        self.atendimentos_travados = 0
        self.eventos = deque()

    def esta_instavel(self, agora):
        momento = datetime.fromtimestamp(agora)
        if self.instabilidade == "segundos":
            return momento.second % 10 in DIGITOS_PRIMOS
        if self.instabilidade == "minutos":
            return momento.minute % 10 in DIGITOS_PRIMOS
        return False

    def passou_no_limite(self, agora):
        with self.trava:
            if agora - self.ultimo_atendimento < JANELA_DO_LIMITE_S:
                return False
            self.ultimo_atendimento = agora
            return True

    def registrar(self, agora, cliente, resultado):
        with self.trava:
            self.eventos.append((agora, cliente, resultado))
            while self.eventos and self.eventos[0][0] < agora - 60:
                self.eventos.popleft()

    def estatisticas(self):
        agora = time.time()
        segundo_atual = int(agora)
        segundos = {
            segundo: {"segundo": segundo, "sucesso": 0, "limite": 0, "timeout": 0,
                      "instavel": self.esta_instavel(segundo)}
            for segundo in range(segundo_atual - 29, segundo_atual + 1)
        }
        with self.trava:
            for momento, _, resultado in self.eventos:
                segundo = int(momento)
                if segundo in segundos:
                    segundos[segundo][resultado] += 1
            travados = self.atendimentos_travados
        return {
            "instabilidade": self.instabilidade,
            "instavel_agora": self.esta_instavel(agora),
            "capacidade_por_segundo": round(1 / JANELA_DO_LIMITE_S, 1),
            "atendimentos_travados": travados,
            "segundos": list(segundos.values()),
        }


class ServidorHttp(ThreadingHTTPServer):
    daemon_threads = True
    request_queue_size = 128


class Atendente(SimpleHTTPRequestHandler):
    servidor = None
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".css": "text/css",
    }

    def do_GET(self):
        endereco = urlparse(self.path)
        if endereco.path == "/api/pedido":
            cliente = parse_qs(endereco.query).get("cliente", ["?"])[0]
            self.atender_pedido(cliente)
        elif endereco.path == "/api/estatisticas":
            self.responder(200, self.servidor.estatisticas())
        else:
            super().do_GET()

    def atender_pedido(self, cliente):
        agora = time.time()

        if not self.servidor.passou_no_limite(agora):
            self.servidor.registrar(agora, cliente, "limite")
            time.sleep(random.uniform(*LATENCIA_S))
            anotar(cliente, AMARELO, "429  rate limit: outra ligação chegou há menos de 300 ms")
            self.responder(429, {"status": "erro", "motivo": "muitas requisições, tente mais tarde"})
            return

        if self.servidor.esta_instavel(agora):
            self.servidor.registrar(agora, cliente, "timeout")
            anotar(cliente, VERMELHO, f"...  instável: o atendente vai ficar {TEMPO_TRAVADO_S}s ocupado")
            self.ficar_travado()
            return

        self.servidor.registrar(agora, cliente, "sucesso")
        time.sleep(random.uniform(*LATENCIA_S))
        anotar(cliente, VERDE, "200  sucesso")
        self.responder(200, {
            "status": "sucesso",
            "mensagem": "pedido processado",
            "cliente": cliente,
            "horario": datetime.fromtimestamp(agora).strftime("%H:%M:%S.%f")[:-3],
        })

    def ficar_travado(self):
        with self.servidor.trava:
            self.servidor.atendimentos_travados += 1
        time.sleep(TEMPO_TRAVADO_S)
        with self.servidor.trava:
            self.servidor.atendimentos_travados -= 1
        try:
            self.responder(504, {"status": "erro", "motivo": "demorou demais"})
        except (BrokenPipeError, ConnectionResetError):
            pass

    def responder(self, codigo, corpo):
        conteudo = json.dumps(corpo).encode()
        self.send_response(codigo)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(conteudo)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(conteudo)

    def end_headers(self):
        if not self.path.startswith("/api/"):
            self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, formato, *argumentos):
        pass


def anotar(cliente, cor, mensagem):
    horario = datetime.now().strftime("%H:%M:%S.%f")[:-3]
    print(f"{CINZA}{horario}{NORMAL}  cliente {cliente:>6}  {cor}{mensagem}{NORMAL}", flush=True)


def main():
    parametros = argparse.ArgumentParser(description="Servidor instável para demonstrar retry, backoff e jitter")
    parametros.add_argument(
        "--instabilidade",
        choices=["segundos", "minutos", "nenhuma"],
        default="segundos",
        help="trava quando o segundo (ou o minuto) termina em 2, 3, 5 ou 7",
    )
    escolha = parametros.parse_args()

    Atendente.servidor = Servidor(escolha.instabilidade)
    atendente = partial(Atendente, directory=str(PASTA_WEB))
    servidor_http = ServidorHttp(("localhost", PORTA), atendente)

    print(f"Servidor ouvindo em http://localhost:{PORTA}")
    if escolha.instabilidade != "nenhuma":
        print(f"Instabilidade: trava nos {escolha.instabilidade} terminados em 2, 3, 5 ou 7")
    print(f"Rate limit: 1 requisição a cada {int(JANELA_DO_LIMITE_S * 1000)} ms")
    print(f"Latência: {int(LATENCIA_S[0] * 1000)} a {int(LATENCIA_S[1] * 1000)} ms por resposta\n")
    try:
        servidor_http.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor encerrado.")


if __name__ == "__main__":
    main()
