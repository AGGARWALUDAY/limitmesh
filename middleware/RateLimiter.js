function createRateLimiter(options) {
  const limit = options.limit;
  const window = options.window;

  const rateLimits = new Map();

  return (req, res, next) => {
    const ip = req.headers["x-test-ip"] || req.ip;
    const currentTime = Date.now();

    // First request from this IP
    if (!rateLimits.has(ip)) {
      rateLimits.set(ip, {
        count: 1,
        startTime: currentTime,
      });

      res.setHeader("X-RateLimit-Limit", limit);
      res.setHeader("X-RateLimit-Remaining", limit - 1);
      res.setHeader(
        "X-RateLimit-Reset",
        Math.ceil((currentTime + window) / 1000)
      );

      res.setHeader(
        "X-RateLimit-Reset-Time",
        new Date(currentTime + window).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        })
      );

      next();
      return;
    }

    const data = rateLimits.get(ip);

    // Current window has expired
    if (currentTime >= data.startTime + window) {
      data.count = 1;
      data.startTime = currentTime;

      res.setHeader("X-RateLimit-Limit", limit);
      res.setHeader("X-RateLimit-Remaining", limit - 1);

      res.setHeader(
        "X-RateLimit-Reset",
        Math.ceil((currentTime + window) / 1000)
      );

      res.setHeader(
        "X-RateLimit-Reset-Time",
        new Date(currentTime + window).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        })
      );

      next();
      return;
    }

    // Still inside the current window
    if (data.count < limit) {
      data.count++;

      res.setHeader("X-RateLimit-Limit", limit);
      res.setHeader("X-RateLimit-Remaining", limit - data.count);

      res.setHeader(
        "X-RateLimit-Reset",
        Math.ceil((data.startTime + window) / 1000)
      );

      res.setHeader(
        "X-RateLimit-Reset-Time",
        new Date(data.startTime + window).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        })
      );

      next();
      return;
    }

    // Limit exceeded
    console.log("Rate limit exceeded");
    console.log("IP:", ip);

    res.setHeader("X-RateLimit-Limit", limit);
    res.setHeader("X-RateLimit-Remaining", 0);

    res.setHeader(
      "X-RateLimit-Reset",
      Math.ceil((data.startTime + window) / 1000)
    );

    res.setHeader(
      "X-RateLimit-Reset-Time",
      new Date(data.startTime + window).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      })
    );

    res.status(429).send("Too Many Requests");
  };
}

module.exports = createRateLimiter;
