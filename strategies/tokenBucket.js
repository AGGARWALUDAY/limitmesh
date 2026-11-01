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

      next();
    } catch (error) {
      if (error instanceof StorageUnavailableError) {
        console.error("Rate limit storage unavailable:", error.message);

        if (failMode === "open") {
          return next();
        }

        return res.status(503).send("Rate limiter temporarily unavailable");
      }

      // Unexpected errors should be passed to Express error handling.
      return next(error);
    }
  };
}

module.exports = tokenBucket;
