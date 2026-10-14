const setRateLimitHeaders = require("../utils/rateLimitHeaders");
const { fixedWindowCheck } = require("../lib/redisScripts");

console.log("Fixed Window");

function fixedWindow(options, store) {
  const { limit, window } = options;

  return async (req, res, next) => {
    try {
      const ip = req.headers["x-test-ip"] || req.ip;
      const key = `limitmesh:fixed-window:${ip}`;

      const currentTime = Date.now();

      const { allowed, count, ttl } = await fixedWindowCheck(
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

      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = fixedWindow;
