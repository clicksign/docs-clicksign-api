# API Collections para Testes

Este repositório contém collections para facilitar o teste e a integração com a API da Clicksign. As collections estão disponíveis para as ferramentas **Postman** e **Insomnia** e foram criadas para ajudar desenvolvedores a entender e interagir com os endpoints da API de maneira prática e eficiente.

---

## Conteúdo do Repositório

- **Postman Collection**: Arquivo JSON das collections que pode ser importado diretamente no Postman.
- **Postman Environment**: Arquivo JSON das variáveis de ambiente que pode ser importado diretamente no Postman.
- **Insomnia Collection**: Arquivo JSON das collections que pode ser importado diretamente no Insomnia.
- **Insomnia Expert Collection**: Arquivo JSON com collections de todas versões da API da Clicksign (Sugerido para quem precisa de recursos avançados).

### ClickFlow e ClickForm

Collections da API `/api/v1`. Host padrão: **sandbox**.

| Produto | Postman | Insomnia | Bruno |
|---------|---------|----------|-------|
| ClickFlow Orchestrator | `ClickFlow_Orchestrator_Postman_Collection.json` + `_Environment.json` | `ClickFlow_Orchestrator_Insomnia_Collection.json` | `bruno/ClickFlow_Orchestrator/` |
| ClickFlow Runner | `ClickFlow_Runner_Postman_Collection.json` + `_Environment.json` | `ClickFlow_Runner_Insomnia_Collection.json` | `bruno/ClickFlow_Runner/` |
| ClickForm | `ClickForm_Postman_Collection.json` + `_Environment.json` | `ClickForm_Insomnia_Collection.json` | `bruno/ClickForm/` |

**Hosts sandbox (padrão):**

- Orchestrator: `clickflow-sandbox.clicksign.com`
- Runner: `clickflow-runner-sandbox.clicksign.com`
- Form: `clickform-sandbox.clicksign.com`

Autenticação: header `Authorization` com UUID (`{{access_token}}`), sem prefixo `Bearer`. Endpoints `/health` não exigem auth.

No Postman e no Insomnia, importe o JSON do produto e o environment correspondente. No Bruno, abra a pasta `bruno/` do produto, selecione o ambiente Sandbox e preencha `access_token`.

---

## Como Usar as Collections

### **Postman**

1. Faça o download do arquivo `Clicksign_Postman_Collection.json`.
2. Abra o Postman.
3. Vá até o menu **File > Import**.
4. Selecione o arquivo baixado e importe.
5. Importe também as variáveis de ambiente `Clicksign_Postman_Environment.json`.

### **Insomnia**

1. Faça o download do arquivo `Clicksign_Insomnia_Collection.json`.
2. Abra o Insomnia.
3. Clique no menu de Workspaces e selecione **Import/Export > Import Data**.
4. Escolha a opção **From File** e selecione o arquivo baixado.

---

## Configuração da API Key

Ambas as collections requerem uma **API Key** válida para autenticação. Certifique-se de seguir as etapas abaixo:

1. No Postman ou Insomnia, localize o ambiente configurado ou os headers de autenticação da request.
2. Substitua `access_token` pelo seu token de autenticação.

---

## Estrutura das Requests

As collections incluem exemplos de requisições para:

- Criar envelopes.
- Adicionar documentos.
- Configurar signatários.
- Outras operações da API.

---

## Atualizações e Contribuições

Se houver atualizações ou melhorias nas collections, elas serão refletidas neste repositório.  
Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou enviar PRs.

---

## Suporte

Se você tiver dúvidas sobre como usar as collections ou a API, entre em contato pelo e-mail [ajuda@clicksign.com](mailto:ajuda@clicksign.com).

---

**Happy Coding!** 🚀
