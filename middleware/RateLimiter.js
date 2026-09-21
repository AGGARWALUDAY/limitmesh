const strategies = require("../strategies");
const MemoryStore=require("../storage/memoryStore.js");
function createRateLimiter(options) {
  const { algorithm } = options;

  const strategy = strategies[algorithm];

  if (!strategy) {
    throw new Error(`Unknown rate limiting algorithm: ${algorithm}`);
  }
  const store=new MemoryStore();

  return strategy(options, store);
}

module.exports = createRateLimiter;