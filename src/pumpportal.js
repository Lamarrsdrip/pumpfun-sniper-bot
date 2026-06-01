export class PumpPortalClient {
  constructor({ apiKey = '', events }) {
    this.apiKey = apiKey;
    this.events = events;
    this.ws = null;
    this.subscribedMints = new Set();
    this.retryCount = 0;
    this.reconnectTimer = null;
    this.connecting = false;
  }

  connect() {
    if (this.connecting || this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) return;
    this.connecting = true;
    const url = this.apiKey
      ? `wss://pumpportal.fun/api/data?api-key=${encodeURIComponent(this.apiKey)}`
      : 'wss://pumpportal.fun/api/data';
    this.ws = new WebSocket(url);
    this.ws.addEventListener('open', () => {
      this.connecting = false;
      this.retryCount = 0;
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
      this.send({ method: 'subscribeNewToken' });
      this.send({ method: 'subscribeMigration' });
      for (const mint of this.subscribedMints) this.send({ method: 'subscribeTokenTrade', keys: [mint] });
      this.events.emit('feed:status', { status: this.apiKey ? 'connected' : 'public-only', source: 'pumpportal', message: this.apiKey ? 'full stream connected' : 'missing API key; trade subscriptions unavailable' });
    });
    this.ws.addEventListener('message', (message) => this.handleMessage(message.data));
    this.ws.addEventListener('close', () => {
      this.connecting = false;
      this.ws = null;
      this.events.emit('feed:status', { status: this.apiKey ? 'offline' : 'public-only-offline', source: 'pumpportal' });
      this.scheduleReconnect();
    });
    this.ws.addEventListener('error', (error) => {
      this.connecting = false;
      this.events.emit('feed:error', { source: 'pumpportal', message: error.message || String(error) });
    });
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delay = Math.min(30000, 1000 * 2 ** this.retryCount);
    this.retryCount += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
    this.events.emit('feed:status', { status: 'reconnecting', source: 'pumpportal', retryInMs: delay });
  }

  subscribeTrades(mint) {
    if (!this.apiKey || this.subscribedMints.has(mint)) {
      if (!this.apiKey) this.events.emit('feed:sourceHealth', { source: 'PumpPortal', status: 'missing-key', message: 'API key required for token trade subscriptions', updatedAt: Date.now() });
      return;
    }
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
