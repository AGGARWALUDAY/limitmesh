const setRateLimitHeaders = require("../utils/rateLimitHeaders");

console.log("Fixed Window");

function fixedWindow(options, store) {
  const limit = options.limit;
  const window = options.window;

  return async (req, res, next) => {
    const ip = req.headers["x-test-ip"] || req.ip;
    const currentTime = Date.now();

    console.log("Request received:", ip);

    // First request from this IP
    if (!(await store.has(ip))) {
      await store.set(ip, {
        count: 1,
        startTime: currentTime,
      });

      setRateLimitHeaders(res, {
        limit,
        remaining: limit - 1,
        lastRequestTime: currentTime,
        resetTime: currentTime + window,
      });

      next();
      return;
    }

    const data = await store.get(ip);

    // Current window has expired
    if (currentTime >= data.startTime + window) {
      data.count = 1;
      data.startTime = currentTime;

      setRateLimitHeaders(res, {
        limit,
        remaining: limit - 1,
        lastRequestTime: currentTime,
        resetTime: currentTime + window,
      });

      next();
      return;
    }

    // Still inside the current window
    if (data.count < limit) {
      data.count++;

      const resetTime = data.startTime + window;

      setRateLimitHeaders(res, {
        limit,
        remaining: limit - data.count,
        lastRequestTime: currentTime,
        resetTime,
      });

      next();
      return;
    }

    // Limit exceeded
    console.log("Rate limit exceeded");
    console.log("IP:", ip);

    const resetTime = data.startTime + window;

    const retryAfter =
      (resetTime - currentTime) / 1000;

    setRateLimitHeaders(res, {
      limit,
      remaining: 0,
      lastRequestTime: currentTime,
      resetTime,
      retryAfter,
    });

    res.status(429).send("Too Many Requests");
  };
}

module.exports = fixedWindow;