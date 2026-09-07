const fixedWindow = require("./fixedWindow");
const tokenBucket = require("./tokenBucket");
const slidingWindowLog = require("./slidingWindowLog.js");
const slidingWindowCounter = require("./slidingWindowCounter");

module.exports = {
  "fixed-window": fixedWindow,
  "token-bucket": tokenBucket,
  "sliding-window-log": slidingWindowLog,
  "sliding-window-counter": slidingWindowCounter,
};