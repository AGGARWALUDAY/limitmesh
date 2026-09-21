const setRateLimitHeaders = require("../utils/rateLimitHeaders");

console.log("Token Bucket");

function tokenBucket(options, store) {
  const { capacity, refillRate, refillWindow } = options;

  return async (req, res, next) => {
    const ip = req.headers["x-test-ip"] || req.ip;
    const currentTime = Date.now();

    let bucket = await store.get(ip);

    // First request from this IP
    if (!bucket) {
      bucket = {
        tokens: capacity,
        lastRefillTime: currentTime,
      };

      await store.set(ip, bucket);
    }

    // Calculate time passed
    const timePassed =
      currentTime - bucket.lastRefillTime;

    // Calculate tokens to add
    const tokensToAdd =
      refillRate * (timePassed / refillWindow);

    bucket.tokens = Math.min(
      capacity,
      bucket.tokens + tokensToAdd
    );

    bucket.lastRefillTime = currentTime;

    // Request allowed
    if (bucket.tokens >= 1) {
      bucket.tokens--;

      setRateLimitHeaders(res, {
        limit: capacity,
        remaining: bucket.tokens,
        lastRequestTime: currentTime,
        resetTime:
          currentTime +
          ((1 - bucket.tokens) / refillRate) *
            refillWindow,
      });

      next();
      return;
    }

    // Request rejected
    const timeUntilNextToken =
      ((1 - bucket.tokens) / refillRate) *
      refillWindow;

    const resetTime =
      currentTime + timeUntilNextToken;

    setRateLimitHeaders(res, {
      limit: capacity,
      remaining: 0,
      lastRequestTime: currentTime,
      resetTime,
      retryAfter: timeUntilNextToken / 1000,
    });

    res.status(429).send("Too Many Requests");
  };
}

module.exports = tokenBucket;