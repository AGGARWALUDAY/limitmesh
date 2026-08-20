const express = require("express");
const createRateLimiter = require("./middleware/RateLimiter.js");
const app = express();
const PORT = 3000;

const rateLimiter = createRateLimiter({
  limit: 5,
  window: 60 * 1000,
});

app.use(rateLimiter);

app.get("/test", (req, res) => {
  res.status(200).send("Hello World");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});