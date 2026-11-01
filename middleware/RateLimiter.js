const strategies = require("../strategies");
const RedisStore = require("../storage/redisStore");

function validateTokenBucketOptions(options) {
  const { capacity, refillRate, refillWindow } = options;

  if (!Number.isInteger(capacity) || capacity <= 0) {
    throw new Error("Token Bucket capacity must be a positive integer");
  }

  if (!Number.isFinite(refillRate) || refillRate <= 0) {
    throw new Error("Token Bucket refillRate must be a positive number");
  }

  if (!Number.isFinite(refillWindow) || refillWindow <= 0) {
    throw new Error("Token Bucket refillWindow must be a positive number");
  }
  if (
    options.failMode !== undefined &&
    !["open", "closed"].includes(options.failMode)
  ) {
    throw new Error('failMode must be either "open" or "closed"');
  }
}

function createRateLimiter(options) {
  const { algorithm, store = new RedisStore() } = options;

  const strategy = strategies[algorithm];

  if (!strategy) {
    throw new Error(`Unknown rate limiting algorithm: ${algorithm}`);
  }

  if (algorithm === "token-bucket") {
    validateTokenBucketOptions(options);
  }

  // Default failure mode
  options.failMode ??= "closed";

  return strategy(options, store);
}

module.exports = createRateLimiter;
