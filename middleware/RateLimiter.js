const strategies = require("../strategies");

function createRateLimiter(options) {
  const { algorithm } = options;

  const strategy = strategies[algorithm];

  if (!strategy) {
    throw new Error(`Unknown rate limiting algorithm: ${algorithm}`);
  }

  return strategy(options);
}

module.exports = createRateLimiter;