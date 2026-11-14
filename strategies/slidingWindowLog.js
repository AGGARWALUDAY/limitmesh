const { randomUUID } = require("crypto");
const setRateLimitHeaders = require("../utils/rateLimitHeaders");
const { StorageUnavailableError } = require("../storage/errors");

function slidingWindowLog(options, store) {
  const { limit, window, failMode } = options;

  return async (req, res, next) => {
    try {
      const ip = req.headers["x-test-ip"] || req.ip;
      const key = `limitmesh:sliding-window-log:${ip}`;

      const currentTime = Date.now();
      const requestId = randomUUID();

      const { allowed, remaining, resetTime, retryAfter } =
        await store.checkSlidingWindowLog(
          key,
          limit,
          window,
          currentTime,
          requestId
        );

      setRateLimitHeaders(res, {
        limit,
        remaining,
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

module.exports = slidingWindowLog;
