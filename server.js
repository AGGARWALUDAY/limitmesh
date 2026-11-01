const express = require("express");
const createRateLimiter = require("./middleware/RateLimiter.js");
const { connectRedis } = require("./lib/redisClient");

const app = express();
const PORT = 3000;

const rateLimiter = createRateLimiter({
  algorithm: "token-bucket",
  capacity: 2,
  refillRate: 1,
  refillWindow: 60000,
  failMode: "closed",
});

app.use(rateLimiter);

app.get("/test", (req, res) => {
  res.status(200).send("Hello World");
});

function startServer() {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  connectRedis().catch((error) => {
    console.error("Initial Redis connection failed:", error.message);
  });
}

startServer();
