const buckets = new Map();

function tokenBucket(options) {
  const { capacity, refillRate, refillWindow } = options;

  return (req, res, next) => {
    const ip = req.headers["x-test-ip"] || req.ip;
    const currentTime = Date.now();

    let bucket = buckets.get(ip);

    // First request from this IP
    if (!bucket) {
      bucket = {
        tokens: capacity,
        lastRefillTime: currentTime,
      };

      buckets.set(ip, bucket);
    }

    // Calculate how much time has passed
    const timePassed = currentTime - bucket.lastRefillTime;

    // Calculate new tokens
    const tokensToAdd = refillRate * (timePassed / refillWindow);

    bucket.tokens = Math.min(capacity, bucket.tokens + tokensToAdd);

    bucket.lastRefillTime = currentTime;

    // Check if we have at least 1 token
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;

      res.setHeader("X-RateLimit-Limit", capacity);
      res.setHeader("X-RateLimit-Remaining", Math.floor(bucket.tokens));

      next();
    } else {
      res.setHeader("X-RateLimit-Limit", capacity);
      res.setHeader("X-RateLimit-Remaining", 0);

      res.status(429).send("Too Many Requests");
    }
  };
}
module.exports = tokenBucket;
