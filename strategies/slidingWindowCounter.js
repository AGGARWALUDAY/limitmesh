const setRateLimitHeaders = require("../utils/rateLimitHeaders");

console.log("Sliding Window Counter");

function slidingWindowCounter(options, store) {
  const { limit, window } = options;

  return async (req, res, next) => {
    const ip = req.headers["x-test-ip"] || req.ip;
    const currentTime = Date.now();

    let data = await store.get(ip);

    // First request from this IP
    if (!data) {
      data = {
        currentWindowStart: currentTime,
        currentCount: 0,
        previousCount: 0,
      };

      await store.set(ip, data);
    }

    const timePassed =
      currentTime - data.currentWindowStart;

    // Current window has expired
    if (timePassed >= window) {
      data.previousCount = data.currentCount;
      data.currentCount = 0;
      data.currentWindowStart = currentTime;
    }

    const timeIntoCurrentWindow =
      currentTime - data.currentWindowStart;

    // Calculate weight of previous window
    const previousWindowWeight =
      (window - timeIntoCurrentWindow) / window;

    // Estimate requests in sliding window
    const estimatedCount =
      data.previousCount * previousWindowWeight +
      data.currentCount;

    // Limit exceeded
    if (estimatedCount >= limit) {
      const resetTime =
        data.currentWindowStart + window;

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
    data.currentCount++;

    const remaining = Math.max(
      0,
      Math.floor(limit - estimatedCount - 1)
    );

    const resetTime =
      data.currentWindowStart + window;

    setRateLimitHeaders(res, {
      limit,
      remaining,
      lastRequestTime: currentTime,
      resetTime,
    });

    next();
  };
}

module.exports = slidingWindowCounter;