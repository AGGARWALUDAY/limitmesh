const setRateLimitHeaders = require("../utils/rateLimitHeaders");

console.log("Sliding Window Log");

function slidingWindowLog(options, store) {
  const { limit, window } = options;

  return async (req, res, next) => {
    const ip = req.headers["x-test-ip"] || req.ip;
    const currentTime = Date.now();

    let timestamps = await store.get(ip);

    // First request from this IP
    if (!timestamps) {
      timestamps = [];
      await store.set(ip, timestamps);
    }

    const windowStart = currentTime - window;

    // Remove expired requests
    while (
      timestamps.length > 0 &&
      timestamps[0] < windowStart
    ) {
      timestamps.shift();
    }

    // Limit exceeded
    if (timestamps.length >= limit) {
      const resetTime = timestamps[0] + window;

      const retryAfter =
        (resetTime - currentTime) / 1000;

      setRateLimitHeaders(res, {
        limit,
        remaining: 0,
        lastRequestTime: currentTime,
        resetTime,
        retryAfter,
      });

      return res.status(429).send("Too Many Requests");
    }

    // Request allowed
    timestamps.push(currentTime);

    const resetTime =
      timestamps[0] + window;

    setRateLimitHeaders(res, {
      limit,
      remaining: limit - timestamps.length,
      lastRequestTime: currentTime,
      resetTime,
    });

    next();
  };
}

module.exports = slidingWindowLog;