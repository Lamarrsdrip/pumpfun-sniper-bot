export class PumpPortalClient {
  constructor({ apiKey = '', events }) {
    this.apiKey = apiKey;
    this.events = events;
    this.ws = null;
    this.subscribedMints = new Set();
  }

  connect() {
    const url = this.apiKey
      ? `wss://pumpportal.fun/api/data?api-key=${encodeURIComponent(this.apiKey)}`
      : 'wss://pumpportal.fun/api/data';
    this.ws = new WebSocket(url);
    this.ws.addEventListener('open', () => {
      this.send({ method: 'subscribeNewToken' });
      this.send({ method: 'subscribeMigration' });
      this.events.emit('feed:status', { status: 'connected', source: 'pumpportal' });
    });
    this.ws.addEventListener('message', (message) => this.handleMessage(message.data));
    this.ws.addEventListener('close', () => {
      this.events.emit('feed:status', { status: 'closed', source: 'pumpportal' });
      setTimeout(() => this.connect(), 3000);
    });
    this.ws.addEventListener('error', (error) => {
      this.events.emit('feed:error', { message: error.message || String(error) });
    });
  }

  subscribeTrades(mint) {
    if (!this.apiKey || this.subscribedMints.has(mint)) return;
    this.subscribedMints.add(mint);
    this.send({ method: 'subscribeTokenTrade', keys: [mint] });
  }

  send(payload) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(payload));
  }

  handleMessage(data) {
    let event;
    try {
      event = JSON.parse(data);
    } catch {
      return;
    }
    const type = String(event.txType || event.type || event.method || '').toLowerCase();
    if (type.includes('create') || event.mint && event.name && !type.includes('buy') && !type.includes('sell')) {
      this.events.emit('feed:newToken', { ...event, source: 'pumpportal:new-token' });
      return;
    }
    if (type.includes('buy') || type.includes('sell')) {
      this.events.emit('feed:trade', { ...event, source: 'pumpportal:trade' });
      return;
    }
    if (type.includes('migration')) this.events.emit('feed:migration', { ...event, source: 'pumpportal:migration' });
  }
}
