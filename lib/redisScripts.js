const fs = require("fs");
const path = require("path");
const { redisClient } = require("./redisClient");

const fixedWindowScript = fs.readFileSync(
  path.join(__dirname, "../lua/fixedWindow.lua"),
  "utf8"
);

class RedisUnavailableError extends Error {
  constructor(message, cause) {
    super(message, { cause });
    this.name = "RedisUnavailableError";
  }
}
async function fixedWindowCheck(key, limit, window) {
  const result = await redisClient.eval(fixedWindowScript, {
    keys: [key],
    arguments: [String(limit), String(window)],
  });

  return {
    allowed: Number(result[0]) === 1,
    count: Number(result[1]),
    ttl: Number(result[2]),
  };
}

const tokenBucketScript = fs.readFileSync(
  path.join(__dirname, "../lua/tokenBucket.lua"),
  "utf8"
);

async function tokenBucketCheck(key, capacity, refillRate, refillWindow) {
  try {
    const result = await redisClient.eval(tokenBucketScript, {
      keys: [key],
      arguments: [String(capacity), String(refillRate), String(refillWindow)],
    });

    return {
      allowed: Number(result[0]) === 1,
      remaining: Number(result[1]),
      retryAfterMs: Number(result[2]),
      currentTime: Number(result[3]),
      timeToFullMs: Number(result[4]),
    };
  } catch (error) {
    if (!redisClient.isReady) {
      throw new RedisUnavailableError("Redis is unavailable", error);
    }

    throw error;
  }
}

module.exports = {
  fixedWindowCheck,
  tokenBucketCheck,
  RedisUnavailableError,
};
