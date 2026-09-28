import { WebSocketClient } from './websocket-client.js';

export class ChatApp {
  constructor() {
    this.httpUrl = 'https://chat-backend-production-e6e8.up.railway.app';
    this.wsUrl = 'wss://chat-backend-production-e6e8.up.railway.app';

    this.myUser = null;
    this.wsClient = null;

    this.initHandlers();
  }

  showChat() {
    const modal = document.getElementById('reg-modal');
    const chatContainer = document.getElementById('chat-container');

    if (modal) modal.classList.remove('active');
    if (chatContainer) chatContainer.classList.remove('hidden');
  }

  async register() {
    const nicknameEl = document.getElementById('nickname');
    if (!nicknameEl) return;

    const nickname = nicknameEl.value.trim();
    if (!nickname) return;

    try {
      const res = await fetch(`${this.httpUrl}/new-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nickname }),
      });

      const data = await res.json();

      if (res.ok && data.status === 'ok') {
        this.myUser = data.user;
        this.showChat();
        await this.connectWs();
      } else {
        const errorEl = document.getElementById('reg-error');
        if (errorEl) errorEl.textContent = data.message || 'Никнейм занят. Выберите другой.';
      }
    } catch (err) {
      console.error(err);
      const errorEl = document.getElementById('reg-error');
      if (errorEl) errorEl.textContent = 'Ошибка соединения с сервером.';
    }
  }

  async connectWs() {
    this.wsClient = new WebSocketClient(this.wsUrl);
    this.wsClient.onOpen = () => {
      this.showConnectionStatus('Подключено', 'connected');
    };
    this.wsClient.onClose = () => {
      this.showConnectionStatus('Соединение потеряно. Переподключение...', 'disconnected');
    };
    this.wsClient.onReconnect = () => {
      this.showConnectionStatus('Переподключено', 'connected');
    };
    await this.wsClient.connect();
    this.wsClient.onMessage((data) => {
      if (Array.isArray(data)) this.renderUsers(data);
      else if (data.type === 'send') this.renderMessage(data);
    });
  }

  showConnectionStatus(text, className) {
    let statusEl = document.getElementById('connection-status');
    if (!statusEl) {
      statusEl = document.createElement('div');
      statusEl.id = 'connection-status';
      const chatContainer = document.getElementById('chat-container');
      if (chatContainer) chatContainer.insertAdjacentElement('afterbegin', statusEl);
    }
    statusEl.textContent = text;
    statusEl.className = `connection-status ${className}`;
  }

  renderUsers(users) {
    const ul = document.getElementById('users-ul');
    if (!ul) return;

    const fragment = document.createDocumentFragment();
    users.forEach((u) => {
      const li = document.createElement('li');
      li.textContent = u.name; // textContent — защита от XSS
      fragment.appendChild(li);
    });

    ul.replaceChildren(fragment);
  }

  renderMessage(data) {
    const messagesDiv = document.getElementById('messages');
    if (!messagesDiv) return;

    const div = document.createElement('div');
    const isMine = data.user?.id === this.myUser.id;

    div.className = `message ${isMine ? 'message--mine' : 'message--other'}`;

    const strong = document.createElement('strong');
    strong.textContent = isMine ? 'You' : (data.user?.name || 'Someone');

    const span = document.createElement('span');
    span.textContent = ': ' + data.message;

    div.appendChild(strong);
    div.appendChild(span);

    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  initHandlers() {
    const regBtn = document.getElementById('reg-btn');
    if (regBtn) {
      regBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.register();
      });
    }

    const nicknameEl = document.getElementById('nickname');
    if (nicknameEl) {
      nicknameEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.register();
        }
      });
    }

    const form = document.getElementById('message-form');
    const input = document.getElementById('message-input');

    this.renderUsers([]);

    if (form && input) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text || !this.myUser) return;

        if (this.wsClient) {
          this.wsClient.send({
            type: 'send',
            message: text,
            user: this.myUser,
          });
        }

        input.value = '';
      });
    }
  }
}
