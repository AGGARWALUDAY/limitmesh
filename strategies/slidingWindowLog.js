const requests = new Map();

function slidingWindowLog(options) {
  const { limit, window } = options;

  return (req, res, next) => {
    const ip = req.headers["x-test-ip"] || req.ip;
    const currentTime = Date.now();

    let timestamps = requests.get(ip);

    if (!timestamps) {
      timestamps = [];
      requests.set(ip, timestamps);
    }

    const windowStart = currentTime - window;

    while (timestamps.length > 0 && timestamps[0] < windowStart) {
      timestamps.shift();
    }

    if (timestamps.length >= limit) {
      res.setHeader("X-RateLimit-Limit", limit);
      res.setHeader("X-RateLimit-Remaining", 0);

      return res.status(429).send("Too Many Requests");
    }

    timestamps.push(currentTime);

    res.setHeader("X-RateLimit-Limit", limit);
    res.setHeader("X-RateLimit-Remaining", limit - timestamps.length);

    next();
  };
}

module.exports = slidingWindowLog;
