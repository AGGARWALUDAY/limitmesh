const { redisClient } = require("../lib/redisClient");
const {
  fixedWindowCheck,
  tokenBucketCheck,
  slidingWindowCounterCheck,
  slidingWindowLogCheck,
} = require("../lib/redisScripts");
const CircuitBreaker = require("../lib/circuitBreaker");

const { StorageUnavailableError } = require("./errors");

const REDIS_CONNECTION_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "EPIPE",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ENOTFOUND",
  "EAI_AGAIN",
]);

const REDIS_CONNECTION_ERROR_NAMES = new Set([
  "ClientClosedError",
  "ClientOfflineError",
  "SocketClosedUnexpectedlyError",
  "ConnectionTimeoutError",
]);

const {
  redisErrorsTotal,
  redisOperationDuration,
} = require("../metrics/registry");

class RedisStore {
  constructor() {
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 10000,
    });
  }

  async get(key) {
    return this.#executeRedisOperation("get", async () => {
      const value = await redisClient.get(key);
      return value === null ? undefined : JSON.parse(value);
    });
  }

  async set(key, value) {
    return this.#executeRedisOperation("set", async () => {
      await redisClient.set(key, JSON.stringify(value));
    });
  }

  async has(key) {
    return this.#executeRedisOperation("has", async () => {
      const value = await redisClient.exists(key);
      return value === 1;
    });
  }

  async delete(key) {
    return this.#executeRedisOperation("delete", async () => {
      await redisClient.del(key);
    });
  }

  async checkFixedWindow(key, limit, window) {
    return this.#executeRedisOperation("fixed_window", () =>
      fixedWindowCheck(key, limit, window)
    );
  }

  async checkTokenBucket(key, capacity, refillRate, refillWindow) {
    return this.#executeRedisOperation("token_bucket", () =>
      tokenBucketCheck(key, capacity, refillRate, refillWindow)
    );
  }

  async checkSlidingWindowCounter(key, limit, window, currentTime) {
    return this.#executeRedisOperation("sliding_window_counter", () =>
      slidingWindowCounterCheck(key, limit, window, currentTime)
    );
  }

  async checkSlidingWindowLog(key, limit, window, currentTime, requestId) {
    return this.#executeRedisOperation("sliding_window_log", () =>
      slidingWindowLogCheck(key, limit, window, currentTime, requestId)
    );
  }

  #asStorageError(error) {
    if (error instanceof StorageUnavailableError) {
      return error;
    }

    let currentError = error;

    while (currentError) {
      if (
        REDIS_CONNECTION_ERROR_CODES.has(currentError.code) ||
        REDIS_CONNECTION_ERROR_NAMES.has(currentError.name)
      ) {
        return new StorageUnavailableError("Redis is unavailable", error);
      }

      currentError = currentError.cause;
    }

    if (!redisClient.isReady) {
      return new StorageUnavailableError("Redis is unavailable", error);
    }

    return error;
  }
  async #executeRedisOperation(operationName, operation) {
    return this.circuitBreaker.execute(async () => {
      const endTimer = redisOperationDuration.startTimer({
        operation: operationName,
      });

      try {
        return await operation();
      } catch (error) {
        const classifiedError = this.#asStorageError(error);

        if (classifiedError instanceof StorageUnavailableError) {
          redisErrorsTotal.inc({
            operation: operationName,
          });
        }

        throw classifiedError;
      } finally {
        endTimer();
      }
    });
  }
}

module.exports = RedisStore;
