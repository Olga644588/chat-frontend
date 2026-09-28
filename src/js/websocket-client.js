export class WebSocketClient {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.messageCallback = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.shouldReconnect = true;

    this.onOpen = null;
    this.onClose = null;
    this.onReconnect = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        if (this.onOpen) this.onOpen();
        resolve(this.ws);
      };

      this.ws.onerror = (err) => {
        if (this.reconnectAttempts === 0) reject(err);
      };

      this.ws.onclose = () => {
        if (this.onClose) this.onClose();
        if (this.shouldReconnect) {
          this.tryReconnect();
        }
      };
    });
  }

  tryReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[WebSocketClient] Превышен лимит попыток переподключения');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * this.reconnectAttempts, 5000);

    console.log(`[WebSocketClient] Переподключение через ${delay}мс (попытка ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        if (this.onReconnect) this.onReconnect();
        if (this.onOpen) this.onOpen();
      };

      this.ws.onclose = () => {
        if (this.onClose) this.onClose();
        if (this.shouldReconnect) this.tryReconnect();
      };

      this.ws.onerror = () => {};

      this.ws.addEventListener('message', (event) => {
        this.handleMessage(event);
      });
    }, delay);
  }

  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      if (this.messageCallback) this.messageCallback(data);
    } catch (e) {
      console.error('Не удалось распарсить сообщение', e);
    }
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  onMessage(callback) {
    this.messageCallback = callback;
    if (this.ws) {
      this.ws.addEventListener('message', (event) => {
        this.handleMessage(event);
      });
    }
  }

  close() {
    this.shouldReconnect = false;
    if (this.ws) this.ws.close();
  }
}
