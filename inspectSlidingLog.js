const { redisClient, connectRedis } = require("./lib/redisClient");

async function inspect() {
  await connectRedis();

  const key = "limitmesh:sliding-window-log:10.0.0.21";

  const data = await redisClient.zRangeWithScores(key, 0, -1);
  const ttl = await redisClient.pTTL(key);

  console.log("Redis Sorted Set:", data);
  console.log("Request count:", data.length);
  console.log("TTL:", ttl, "ms");

  await redisClient.quit();
}

inspect().catch(console.error);
