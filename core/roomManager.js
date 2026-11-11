class RoomManager {
  constructor({ idleMs = 2 * 60 * 60 * 1000 } = {}) {
    this.rooms = new Map();
    this.idleMs = idleMs;
    this._gc = setInterval(() => this.sweep(), 10 * 60 * 1000).unref();
  }

  _code() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let c;
    do {
      c = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    } while (this.rooms.has(c));
    return c;
  }

  create(initialState = {}) {
    const code = this._code();
    const room = { code, createdAt: Date.now(), touchedAt: Date.now(), players: new Map(), state: initialState };
    this.rooms.set(code, room);
    return room;
  }

  get(code) {
    const room = this.rooms.get(String(code || '').toUpperCase());
    if (room) room.touchedAt = Date.now();
    return room;
  }

  delete(code) { this.rooms.delete(code); }

  sweep() {
    const now = Date.now();
    for (const [code, r] of this.rooms) if (now - r.touchedAt > this.idleMs) this.rooms.delete(code);
  }
}

module.exports = { RoomManager };