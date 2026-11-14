const setRateLimitHeaders = require("../utils/rateLimitHeaders");
const { StorageUnavailableError } = require("../storage/errors");

function tokenBucket(options, store) {
  const { capacity, refillRate, refillWindow, failMode } = options;

  return async (req, res, next) => {
    try {
      const ip = req.headers["x-test-ip"] || req.ip;
      const key = `limitmesh:token-bucket:${ip}`;

      const { allowed, remaining, retryAfterMs, currentTime, timeToFullMs } =
        await store.checkTokenBucket(key, capacity, refillRate, refillWindow);

      const resetTime = currentTime + timeToFullMs;

      setRateLimitHeaders(res, {
        limit: capacity,
        remaining,
        lastRequestTime: currentTime,
        resetTime,
        retryAfter: allowed ? 0 : retryAfterMs / 1000,
      });

      if (!allowed) {
        return res.status(429).send("Too Many Requests");
      }

      return next();
    } catch (error) {
      if (error instanceof StorageUnavailableError) {
        if (failMode === "open") {
          return next();
        }

        return res.status(503).send("Service Unavailable");
      }

      return next(error);
    }
  };
}

module.exports = tokenBucket;
