# API Collections para Testes

Este repositório contém collections para testar e integrar com as APIs da Clicksign: primeiro a API v3, depois o ClickFlow, o Módulo de Coleta de Dados (ClickForm) e os Módulos de Aceite e de Notificação. As ferramentas são **Postman**, **Insomnia** e **Bruno**.

---

## Conteúdo do Repositório

A API v3 fica na raiz. ClickFlow e ClickForm ficam em pasta própria, com `postman/`, `insomnia/` e `bruno/`. Host padrão de ClickFlow e ClickForm: **sandbox**.

| Produto | Postman | Insomnia | Bruno |
|---------|---------|----------|-------|
| API v3 | `Clicksign_Postman_Collection.json` e `Clicksign_Postman_Environment.json` | `Insomnia_Collection.json` | — |
| ClickFlow Orchestrator | `clickflow/orquestrador/postman/` | `clickflow/orquestrador/insomnia/` | `clickflow/orquestrador/bruno/` |
| ClickFlow Runner | `clickflow/executor/postman/` | `clickflow/executor/insomnia/` | `clickflow/executor/bruno/` |
| ClickForm | `clickform/postman/` | `clickform/insomnia/` | `clickform/bruno/` |
| Módulos de Aceite e de Notificação | `aceite-e-notificacao/postman/` | `aceite-e-notificacao/insomnia/` | `aceite-e-notificacao/bruno/` |

Na raiz também está `Clicksign_Insomnia_Expert_Collection.json`, com as APIs 1.9 e 2.0. A API v3 está em `Insomnia_Collection.json`.

Os arquivos de ClickFlow e ClickForm seguem o nome técnico da API. Na documentação do produto, ClickForm é o Módulo de Coleta de Dados (step `form`). ClickFlow Orchestrator é o Orquestrador e ClickFlow Runner é o Executor.

**Hosts sandbox (padrão) de ClickFlow e ClickForm:**

- Orchestrator: `clickflow-sandbox.clicksign.com`
- Runner: `clickflow-runner-sandbox.clicksign.com`
- Form: `clickform-sandbox.clicksign.com`
- Aceite e Notificação (sandbox): `app-acceptance-sandbox.clicksign.com`
- Aceite e Notificação (produção): `app-acceptance.clicksign.com`

---

## Como Usar as Collections

Use o arquivo do produto na tabela acima.

### **Postman**

1. Baixe o JSON da collection e o environment do produto.
2. Abra o Postman.
3. Vá em **File > Import**.
4. Importe a collection e, em seguida, o environment.

### **Insomnia**

1. Baixe o JSON da collection do produto.
2. Abra o Insomnia.
3. No menu de Workspaces, selecione **Import/Export > Import Data**.
4. Escolha **From File** e selecione o arquivo.

### **Bruno**

O Bruno cobre ClickFlow, ClickForm e os Módulos de Aceite e de Notificação.

1. Abra o Bruno e selecione **Open Collection**.
2. Aponte para a pasta `bruno/` do produto (`clickflow/orquestrador/bruno`, `clickflow/executor/bruno`, `clickform/bruno` ou `aceite-e-notificacao/bruno`).
3. Selecione o ambiente **Sandbox** e preencha as credenciais. No ClickFlow e no ClickForm, o campo é `access_token`. No Aceite e na Notificação, os campos são `api_key` e `api_secret`.

---

## Autenticação

A API v3, o ClickFlow e o ClickForm usam o header `Authorization` com o UUID em `access_token`, sem prefixo `Bearer`. Os Módulos de Aceite e de Notificação autenticam com os headers `X-API-Key` e `X-API-Secret`.

1. No Postman ou no Insomnia, abra o environment ou o header da request.
2. Substitua `access_token` pelo seu token.

No Bruno, o token vai no ambiente Sandbox. Endpoints `/health` de ClickFlow e ClickForm não exigem autenticação.

---

## O que cada collection cobre

- **API v3:** envelopes, documentos e signatários.
- **ClickFlow Orchestrator:** flows e execuções.
- **ClickFlow Runner:** disparo e acompanhamento da execução.
- **ClickForm:** formulários, versões e runs.
- **Módulos de Aceite e de Notificação:** criação, status e consulta da comunicação. No ClickFlow, o step é `consent`.

---

## Atualizações e Contribuições

Se houver atualizações ou melhorias nas collections, elas serão refletidas neste repositório.  
Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou enviar PRs.

---

## Suporte

Se você tiver dúvidas sobre como usar as collections ou a API, entre em contato pelo e-mail [ajuda@clicksign.com](mailto:ajuda@clicksign.com).

---

**Happy Coding!** 🚀
