const { redisClient } = require("../lib/redisClient");

class RedisStore {
  async get(key) {
    const value = await redisClient.get(key);

    if (value === null) {
      return undefined;
    }

    return JSON.parse(value);
  }

  async set(key, value) {
    await redisClient.set(key, JSON.stringify(value));
  }

  async has(key) {
    const value = await redisClient.exists(key);

    return value === 1;
  }

  async delete(key) {
    await redisClient.del(key);
  }
}

module.exports = RedisStore;