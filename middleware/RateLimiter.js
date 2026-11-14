const strategies = require("../strategies");
const RedisStore = require("../storage/redisStore");

function validateCommonOptions(options) {
  if (!Number.isInteger(options.limit) || options.limit <= 0) {
    throw new Error("Rate limit must be a positive integer");
  }

  if (!Number.isFinite(options.window) || options.window <= 0) {
    throw new Error("Window must be a positive number");
  }
}

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
}

function createRateLimiter(options) {
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw new Error("Rate limiter options must be an object");
  }

  const { algorithm, store = new RedisStore() } = options;

  const strategy = strategies[algorithm];

  if (!strategy) {
    throw new Error(`Unknown rate limiting algorithm: ${algorithm}`);
  }

  // Validate algorithm-specific configuration
  if (algorithm === "token-bucket") {
    validateTokenBucketOptions(options);
  } else {
    validateCommonOptions(options);
  }

  // Validate failure mode for every algorithm
  const failMode = options.failMode ?? "closed";

  if (!["open", "closed"].includes(failMode)) {
    throw new Error('failMode must be either "open" or "closed"');
  }

  const validatedOptions = {
    ...options,
    failMode,
  };

  return strategy(validatedOptions, store);
}

module.exports = createRateLimiter;
