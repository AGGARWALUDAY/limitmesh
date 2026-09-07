const requests = new Map();

function slidingWindowCounter(options) {
  const { limit, window } = options;

  return (req, res, next) => {
    const ip = req.headers["x-test-ip"] || req.ip;
    const currentTime = Date.now();

    let data = requests.get(ip);

    if (!data) {
      data = {
        currentWindowStart: currentTime,
        currentCount: 0,
        previousCount: 0,
      };

      requests.set(ip, data);
    }

    const timePassed = currentTime - data.currentWindowStart;

    // Move to the next window
    if (timePassed >= window) {
      data.previousCount = data.currentCount;
      data.currentCount = 0;
      data.currentWindowStart = currentTime;
    }

    const timeIntoCurrentWindow = currentTime - data.currentWindowStart;

    const previousWindowWeight = (window - timeIntoCurrentWindow) / window;

    const estimatedCount =
      data.previousCount * previousWindowWeight + data.currentCount;

    if (estimatedCount >= limit) {
      res.setHeader("X-RateLimit-Limit", limit);
      res.setHeader("X-RateLimit-Remaining", 0);

      return res.status(429).send("Too Many Requests");
    }

    data.currentCount++;

    const remaining = Math.max(0, Math.floor(limit - estimatedCount - 1));

    res.setHeader("X-RateLimit-Limit", limit);
    res.setHeader("X-RateLimit-Remaining", remaining);

    next();
  };
}

module.exports = slidingWindowCounter;
