
const fs = require("fs");
const path = require("path");
const { redisClient } = require("./redisClient");

const fixedWindowScript = fs.readFileSync(
  path.join(__dirname, "../lua/fixedWindow.lua"),
  "utf8"
);


async function fixedWindowCheck(key, limit, window) {
  const result = await redisClient.eval(fixedWindowScript, {
    keys: [key],
    arguments: [String(limit), String(window)],
  });

  return {
  allowed: Number(result[0]) === 1,
  count: Number(result[1]),
  ttl: Number(result[2]),
};
}

module.exports = {
  fixedWindowCheck,
};
