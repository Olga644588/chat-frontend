export class WebSocketClient {
  constructor(url) {
    this.url = url;
    this.ws = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);
      this.ws.onopen = () => resolve(this.ws);
      this.ws.onerror = (err) => reject(err);
    });
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  onMessage(callback) {
    if (!this.ws) return;
    this.ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        callback(data);
      } catch (e) {
        console.error('Не удалось распарсить сообщение', e);
      }
    });
  }

  close() {
    if (this.ws) this.ws.close();
  }
}
