const express = require("express");
const app = express();
const PORT = 3000;
const rateLimits = new Map();

const LIMIT = 5;
const WINDOW = 60 * 1000;

app.use((req, res, next) => {
  const ip = req.headers["x-test-ip"] || req.ip;
  const currentTime = Date.now();

  // First request from this IP
  if (!rateLimits.has(ip)) {
    rateLimits.set(ip, {
      count: 1,
      startTime: currentTime,
    });

    const readableResetTime = new Date(currentTime + WINDOW).toISOString();

    res.setHeader("X-RateLimit-Limit", LIMIT);
    res.setHeader("X-RateLimit-Remaining", LIMIT - 1);
    res.setHeader(
      "X-RateLimit-Reset",
      Math.ceil((currentTime + WINDOW) / 1000)
    );
    res.setHeader("X-RateLimit-Reset-Time", readableResetTime);

    console.log(readableResetTime);

    next();
    return;
  }

  const data = rateLimits.get(ip);

  // Current window has expired
  if (currentTime >= data.startTime + WINDOW) {
    data.count = 1;
    data.startTime = currentTime;

    const readableResetTime = new Date(currentTime + WINDOW).toISOString();

    res.setHeader("X-RateLimit-Limit", LIMIT);
    res.setHeader("X-RateLimit-Remaining", LIMIT - 1);
    res.setHeader(
      "X-RateLimit-Reset",
      Math.ceil((currentTime + WINDOW) / 1000)
    );
    res.setHeader("X-RateLimit-Reset-Time", readableResetTime);

    console.log(readableResetTime);

    next();
    return;
  }

  // Still inside the current window
  if (data.count < LIMIT) {
    data.count++;

    const readableResetTime = new Date(data.startTime + WINDOW).toISOString();

    res.setHeader("X-RateLimit-Limit", LIMIT);
    res.setHeader("X-RateLimit-Remaining", LIMIT - data.count);
    res.setHeader(
      "X-RateLimit-Reset",
      Math.ceil((data.startTime + WINDOW) / 1000)
    );
    res.setHeader("X-RateLimit-Reset-Time", readableResetTime);

    console.log(readableResetTime);

    next();
    return;
  }

  // Limit exceeded
  console.log("Rate limit exceeded");
  console.log("IP:", ip);

  const readableResetTime = new Date(data.startTime + WINDOW).toISOString();

  res.setHeader("X-RateLimit-Limit", LIMIT);
  res.setHeader("X-RateLimit-Remaining", 0);
  res.setHeader(
    "X-RateLimit-Reset",
    Math.ceil((data.startTime + WINDOW) / 1000)
  );
  res.setHeader("X-RateLimit-Reset-Time", readableResetTime);

  console.log(readableResetTime);

  res.status(429).send("Too Many Requests");
});

app.get("/test", (req, res) => {
  res.status(200).send("Hello World");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
