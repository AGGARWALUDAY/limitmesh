class MemoryStore {
  constructor() {
    this.data = new Map();
  }

  async get(key) {
    return this.data.get(key);
  }

  async set(key, value) {
    this.data.set(key, value);
  }

  async has(key) {
    return this.data.has(key);
  }

  async delete(key) {
    this.data.delete(key);
  }
}

module.exports = MemoryStore;