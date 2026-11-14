const express = require("express");
const createRateLimiter = require("./middleware/RateLimiter.js");
const { connectRedis } = require("./lib/redisClient");

const app = express();
const PORT = 3000;
const metricsMiddleware = require("./metrics/metricsMiddleware");
const { registry } = require("./metrics/registry");

const algorithm = "sliding-window-log";

const rateLimiter = createRateLimiter({
  algorithm: algorithm,
  limit: 5,
  window: 60000,
  failMode: "closed",
});

app.use(metricsMiddleware(algorithm));

// Prometheus metrics endpoint
app.get("/metrics", async (req, res, next) => {
  try {
    const metrics = await registry.metrics();

    res.set("Content-Type", registry.contentType);
    res.end(metrics);
  } catch (error) {
    next(error);
  }
});

app.use(rateLimiter);

app.get("/", (req, res) => {
  res.status(200).send("Request passed through rate limiter");
});
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
