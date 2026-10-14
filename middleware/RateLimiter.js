const strategies = require("../strategies");
const RedisStore = require("../storage/redisStore");

function createRateLimiter(options) {
  const { algorithm } = options;

  const strategy = strategies[algorithm];

  if (!strategy) {
    throw new Error(`Unknown rate limiting algorithm: ${algorithm}`);
  }

  const store = new RedisStore();

  return strategy(options, store);
}

module.exports = createRateLimiter;