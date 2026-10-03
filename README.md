# Reparaí

Reparaí é uma aplicação web desenvolvida para otimizar o fluxo de solicitação de consertos de hardware e computadores, com foco no modelo de coleta em domicílio. A plataforma gerencia a comunicação e o acompanhamento de status entre o cliente e o laboratório de assistência técnica.

A arquitetura do projeto foi desenhada visando alta performance e independência de frameworks pesados, estruturada como uma Single Page Application (SPA) nativa suportada por uma API REST em Python.

---

## Funcionalidades Principais

### Interface do Cliente
- **Autenticação:** Sistema de registro e login com persistência de sessão.
- **Painel de Controle (`conta.html`):** Rastreamento de pedidos em tempo real (ex: Em Análise, Orçamento & Conserto).
- **Formulário de Solicitação:** Fluxo de captura de dados técnicos dividido em múltiplas etapas.
- **Geolocalização (Leaflet.js):** Seleção de endereço via mapa interativo para captura de coordenadas exatas.
- **Notificações:** Sistema de feedback visual nativo (Toast Notifications) em resposta a requisições HTTP.
- **Integração WhatsApp:** Geração dinâmica de links de mensagens formatadas com dados do pedido.

### Interface Administrativa (`admin.html`)
- **Gestão de Pedidos:** Painel Kanban-style para visualização de fila de serviços.
- **Controle de Status:** Atualização assíncrona do andamento dos pedidos no banco de dados.
- **Notificações Ativas:** Disparo de atualizações de status para os clientes via integração com WhatsApp.

---

## Stack Tecnológica

O projeto adota uma abordagem "Vanilla", sem dependência de bibliotecas de terceiros (com exceção do Leaflet para mapas), garantindo total controle sobre a renderização e o DOM:

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+).
- **Backend:** Python 3 (Custom HTTP Server atuando como API RESTful).
- **Banco de Dados:** SQLite3.
- **Dependências Externas:** Leaflet.js (Mapas / OpenStreetMap).

---

## Executando o Projeto

O sistema opera com um backend Python e banco de dados SQLite local, logo as rotas de API (`/api/*`) exigem que o servidor esteja em execução. Não execute o arquivo HTML diretamente via protocolo `file:///`.

### Pré-requisitos
- Python 3.x configurado nas variáveis de ambiente.

### Passos de Instalação e Execução

1. Abra o terminal no diretório raiz do projeto (`Reparai`).
2. Inicialize o servidor local executando:
   ```bash
   python server.py
   ```
3. O servidor instanciará o banco de dados `reparai.db` na primeira execução caso não exista.
4. Acesse a aplicação via navegador na URL:
   **http://localhost:8000**

### Mapeamento de Rotas
- `/` ou `/index.html`: Landing page e formulário principal
- `/conta.html`: Rota autenticada do cliente
- `/admin.html`: Rota administrativa

---

## Detalhes de Arquitetura

- **Gerenciamento de Sessão:** Realizado no client-side via `localStorage` com tokens JSON, consumidos pelas lógicas de rotas de frontend.
- **Roteamento Backend:** A classe estendida de `BaseHTTPRequestHandler` no `server.py` intercepta as requisições `POST` (como `/api/login` ou `/api/pedidos`) antes de repassar chamadas `GET` para o manipulador de arquivos estáticos.
- **Armazenamento de Mídia:** O upload de fotos comprobatórias do hardware é convertido em Base64 no cliente e armazenado localmente pelo servidor na pasta de uploads.

---

**Desenvolvido por Marcelo** - *Ciência da Computação (UERJ)*