const { redisClient, connectRedis } = require("./lib/redisClient");
async function inspect() {
  await connectRedis();

  const key = "limitmesh:sliding-window-log:::1";

  const data = await redisClient.zRangeWithScores(key, 0, -1);
  const ttl = await redisClient.pTTL(key);

  console.log("Redis state:", data);
  console.log("TTL:", ttl, "ms");

  await redisClient.quit();
}

inspect().catch(console.error);
