const { redisClient } = require("../lib/redisClient");
const {
  fixedWindowCheck,
  tokenBucketCheck,
  RedisUnavailableError,
} = require("../lib/redisScripts");
const { StorageUnavailableError } = require("./errors");

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

  async checkFixedWindow(key, limit, window) {
    try {
      return await fixedWindowCheck(key, limit, window);
    } catch (error) {
      throw this.#asStorageError(error);
    }
  }

  async checkTokenBucket(key, capacity, refillRate, refillWindow) {
    try {
      return await tokenBucketCheck(key, capacity, refillRate, refillWindow);
    } catch (error) {
      throw this.#asStorageError(error);
    }
  }

  #asStorageError(error) {
    if (error instanceof RedisUnavailableError || !redisClient.isReady) {
      return new StorageUnavailableError("Redis is unavailable", error);
    }

    return error;
  }
}

module.exports = RedisStore;
