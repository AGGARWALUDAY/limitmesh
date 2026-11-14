const test = require("node:test");
const assert = require("node:assert/strict");

const createRateLimiter = require("../middleware/RateLimiter");

const tests = [
  {
    name: "Reject unknown algorithm",
    options: {
      algorithm: "invalid-algorithm",
      limit: 5,
      window: 60000,
    },
    expectedError: /Unknown rate limiting algorithm/,
  },

  // Common configuration validation
  {
    name: "Reject missing limit",
    options: { algorithm: "fixed-window", window: 60000 },
    expectedError: /Rate limit must be a positive integer/,
  },
  {
    name: "Reject zero limit",
    options: { algorithm: "fixed-window", limit: 0, window: 60000 },
    expectedError: /Rate limit must be a positive integer/,
  },
  {
    name: "Reject negative limit",
    options: { algorithm: "fixed-window", limit: -5, window: 60000 },
    expectedError: /Rate limit must be a positive integer/,
  },
  {
    name: "Reject missing window",
    options: { algorithm: "fixed-window", limit: 5 },
    expectedError: /Window must be a positive number/,
  },
  {
    name: "Reject invalid window",
    options: { algorithm: "fixed-window", limit: 5, window: 0 },
    expectedError: /Window must be a positive number/,
  },

  // Failure mode validation
  {
    name: "Reject invalid failMode",
    options: {
      algorithm: "fixed-window",
      limit: 5,
      window: 60000,
      failMode: "sometimes",
    },
    expectedError: /failMode must be either/,
  },
  {
    name: "Accept fail-open configuration",
    options: {
      algorithm: "fixed-window",
      limit: 5,
      window: 60000,
      failMode: "open",
    },
  },
  {
    name: "Accept fail-closed configuration",
    options: {
      algorithm: "fixed-window",
      limit: 5,
      window: 60000,
      failMode: "closed",
    },
  },

  // Token Bucket validation
  {
    name: "Reject invalid Token Bucket capacity",
    options: {
      algorithm: "token-bucket",
      capacity: 0,
      refillRate: 5,
      refillWindow: 60000,
    },
    expectedError: /Token Bucket capacity must be a positive integer/,
  },
  {
    name: "Reject invalid Token Bucket refillRate",
    options: {
      algorithm: "token-bucket",
      capacity: 5,
      refillRate: -1,
      refillWindow: 60000,
    },
    expectedError: /Token Bucket refillRate must be a positive number/,
  },
  {
    name: "Reject invalid Token Bucket refillWindow",
    options: {
      algorithm: "token-bucket",
      capacity: 5,
      refillRate: 5,
      refillWindow: 0,
    },
    expectedError: /Token Bucket refillWindow must be a positive number/,
  },
  {
    name: "Accept valid Token Bucket configuration",
    options: {
      algorithm: "token-bucket",
      capacity: 5,
      refillRate: 5,
      refillWindow: 60000,
    },
  },

  // Options validation
  {
    name: "Reject null options",
    options: null,
    expectedError: /Rate limiter options must be an object/,
  },
  {
    name: "Reject array options",
    options: [],
    expectedError: /Rate limiter options must be an object/,
  },

  // Valid algorithm configurations
  {
    name: "Accept valid Fixed Window configuration",
    options: {
      algorithm: "fixed-window",
      limit: 5,
      window: 60000,
    },
  },
  {
    name: "Accept valid Sliding Window Log configuration",
    options: {
      algorithm: "sliding-window-log",
      limit: 5,
      window: 60000,
    },
  },
  {
    name: "Accept valid Sliding Window Counter configuration",
    options: {
      algorithm: "sliding-window-counter",
      limit: 5,
      window: 60000,
    },
  },
];

// Register every scenario as an independent Node.js test.
for (const { name, options, expectedError } of tests) {
  test(name, () => {
    if (expectedError) {
      assert.throws(() => createRateLimiter(options), expectedError);
    } else {
      const middleware = createRateLimiter(options);

      assert.equal(
        typeof middleware,
        "function",
        "Expected a valid Express middleware function"
      );
    }
  });
}
