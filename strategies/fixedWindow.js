const setRateLimitHeaders = require("../utils/rateLimitHeaders");
const { StorageUnavailableError } = require("../storage/errors");

function fixedWindow(options, store) {
  const { limit, window, failMode } = options;

  return async (req, res, next) => {
    try {
      const ip = req.headers["x-test-ip"] || req.ip;
      const key = `limitmesh:fixed-window:${ip}`;

      const currentTime = Date.now();

      const { allowed, count, ttl } = await store.checkFixedWindow(
        key,
        limit,
        window
      );

      const resetTime = currentTime + Math.max(0, ttl);
      const retryAfter = Math.ceil(ttl / 1000);

      setRateLimitHeaders(res, {
        limit,
        remaining: Math.max(0, limit - count),
        lastRequestTime: currentTime,
        resetTime,
        retryAfter: allowed ? 0 : retryAfter,
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

module.exports = fixedWindow;
