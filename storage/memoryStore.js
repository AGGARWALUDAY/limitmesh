class MemoryStore {
  constructor({ now = () => Date.now() } = {}) {
    this.data = new Map();
    this.now = now;
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

  async checkFixedWindow(key, limit, window) {
    const currentTime = this.now();
    let entry = this.data.get(key);

    if (!entry || entry.expiresAt <= currentTime) {
      entry = { count: 0, expiresAt: currentTime + window };
    }

    if (entry.count >= limit) {
      return {
        allowed: false,
        count: entry.count,
        ttl: entry.expiresAt - currentTime,
      };
    }

    entry.count += 1;
    this.data.set(key, entry);
    return {
      allowed: true,
      count: entry.count,
      ttl: entry.expiresAt - currentTime,
    };
  }

  async checkTokenBucket(key, capacity, refillRate, refillWindow) {
    const currentTime = this.now();
    let bucket = this.data.get(key);

    if (!bucket) {
      bucket = { tokens: capacity, lastRefillTime: currentTime };
    } else {
      const elapsed = Math.max(0, currentTime - bucket.lastRefillTime);
      bucket.tokens = Math.min(
        capacity,
        bucket.tokens + (elapsed * refillRate) / refillWindow
      );
      bucket.lastRefillTime = currentTime;
    }

    const allowed = bucket.tokens >= 1;
    if (allowed) bucket.tokens -= 1;

    this.data.set(key, bucket);
    return {
      allowed,
      remaining: bucket.tokens,
      retryAfterMs: allowed
        ? 0
        : Math.ceil(((1 - bucket.tokens) * refillWindow) / refillRate),
      currentTime,
      timeToFullMs: Math.ceil(
        ((capacity - bucket.tokens) * refillWindow) / refillRate
      ),
    };
  }
}

module.exports = MemoryStore;
