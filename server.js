const express = require("express");
const createRateLimiter = require("./middleware/RateLimiter.js");
const { connectRedis } = require("./lib/redisClient");

const app = express();

const PORT = 3000;

const rateLimiter = createRateLimiter({
  algorithm: "fixed-window",
  limit: 5,
  window: 10 * 1000,
});

app.use(rateLimiter);

app.get("/test", (req, res) => {
  res.status(200).send("Hello World");
});

async function startServer() {
  await connectRedis();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();