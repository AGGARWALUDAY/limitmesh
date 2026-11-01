const { createClient } = require("redis");

const redisClient = createClient({
  url: "redis://127.0.0.1:6379",

  socket: {
    reconnectStrategy: (retries, cause) => {
      const maxDelay = 30000;
      const baseDelay = 500;

      // Exponential backoff with jitter
      const delay =
        Math.min(baseDelay * 2 ** retries, maxDelay) +
        Math.floor(Math.random() * 500);

      console.log(
        `Redis reconnect attempt ${retries + 1}. Retrying in ${delay}ms`
      );

      return delay;
    },
  },
});

redisClient.on("error", (error) => {
  console.error("Redis error:", error.message);
});

redisClient.on("reconnecting", () => {
  console.log("Attempting to reconnect to Redis...");
});

redisClient.on("ready", () => {
  console.log("Redis connection is ready");
});

async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }

  console.log("Connected to Redis");
}

module.exports = {
  redisClient,
  connectRedis,
};
