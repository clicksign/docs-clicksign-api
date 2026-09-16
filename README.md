# API Collections para Testes

Este repositório contém collections para facilitar o teste e a integração com a API da Clicksign. As collections estão disponíveis para as ferramentas **Postman** e **Insomnia** e foram criadas para ajudar desenvolvedores a entender e interagir com os endpoints da API de maneira prática e eficiente.

---

## Conteúdo do Repositório

### Clicksign API v3

- **Postman Collection**: Arquivo JSON das collections que pode ser importado diretamente no Postman.
- **Postman Environment**: Arquivo JSON das variáveis de ambiente que pode ser importado diretamente no Postman.
- **Insomnia Collection**: Arquivo JSON das collections que pode ser importado diretamente no Insomnia.
- **Insomnia Expert Collection**: Arquivo JSON com collections de todas versões da API da Clicksign (Sugerido para quem precisa de recursos avançados).

### ClickFlow e ClickForm

Collections geradas a partir das specs públicas (`/api/v1`, sem rotas internas). Host padrão: **sandbox**.

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

---

## Como Usar as Collections

### **Postman**

1. Faça o download do arquivo `Clicksign_Postman_Collection.json` (API v3) ou das collections ClickFlow/ClickForm listadas acima.
2. Abra o Postman.
3. Vá até o menu **File > Import**.
4. Selecione o arquivo baixado e importe.
5. Importe também as variáveis de ambiente correspondentes (`Clicksign_Postman_Environment.json` ou `ClickFlow_*` / `ClickForm_*_Environment.json`). O host padrão do Flow/Form é sandbox.

### **Insomnia**

1. Faça o download do arquivo `Insomnia_Collection.json` (API v3) ou das collections ClickFlow/ClickForm listadas acima.
2. Abra o Insomnia.
3. Clique no menu de Workspaces e selecione **Import/Export > Import Data**.
4. Escolha a opção **From File** e selecione o arquivo baixado.

### **Bruno** (ClickFlow / ClickForm)

1. Abra o Bruno e selecione **Open Collection**.
2. Aponte para a pasta `bruno/ClickFlow_Orchestrator`, `bruno/ClickFlow_Runner` ou `bruno/ClickForm`.
3. Selecione o ambiente **Sandbox** e preencha `access_token`.

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
