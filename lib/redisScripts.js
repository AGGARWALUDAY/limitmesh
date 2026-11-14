const fs = require("fs");
const path = require("path");
const { redisClient } = require("./redisClient");

const fixedWindowScript = fs.readFileSync(
  path.join(__dirname, "../lua/fixedWindow.lua"),
  "utf8"
);

const tokenBucketScript = fs.readFileSync(
  path.join(__dirname, "../lua/tokenBucket.lua"),
  "utf8"
);

const slidingWindowCounterScript = fs.readFileSync(
  path.join(__dirname, "../lua/slidingWindowCounter.lua"),
  "utf8"
);

const slidingWindowLogScript = fs.readFileSync(
  path.join(__dirname, "../lua/slidingWindowLog.lua"),
  "utf8"
);

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

async function tokenBucketCheck(key, capacity, refillRate, refillWindow) {
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
}

async function slidingWindowCounterCheck(key, limit, window, currentTime) {
  const result = await redisClient.eval(slidingWindowCounterScript, {
    keys: [key],
    arguments: [String(limit), String(window), String(currentTime)],
  });

  return {
    allowed: Number(result[0]) === 1,
    estimatedCount: Number(result[1]),
    remaining: Number(result[2]),
    resetTime: Number(result[3]),
    retryAfter: Number(result[4]),
  };
}

async function slidingWindowLogCheck(
  key,
  limit,
  window,
  currentTime,
  requestId
) {
  const result = await redisClient.eval(slidingWindowLogScript, {
    keys: [key],
    arguments: [
      String(limit),
      String(window),
      String(currentTime),
      String(requestId),
    ],
  });

  return {
    allowed: Number(result[0]) === 1,
    count: Number(result[1]),
    remaining: Number(result[2]),
    resetTime: Number(result[3]),
    retryAfter: Number(result[4]),
  };
}

module.exports = {
  fixedWindowCheck,
  tokenBucketCheck,
  slidingWindowCounterCheck,
  slidingWindowLogCheck,
};
