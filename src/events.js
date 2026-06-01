import { EventEmitter } from 'node:events';

export class BotEvents extends EventEmitter {
  emit(type, payload) {
    return super.emit(type, { type, ...payload });
  }
}
