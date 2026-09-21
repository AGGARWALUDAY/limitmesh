function setRateLimitHeaders(
  res,
  {
    limit,
    remaining,
    lastRequestTime,
    resetTime,
    retryAfter = 0,
  }
) {
  res.setHeader("X-RateLimit-Limit", limit); 

  res.setHeader(
    "X-RateLimit-Remaining",
    Math.max(0, Math.floor(remaining))
  );

  res.setHeader(
    "X-RateLimit-Last-Request",
    new Date(lastRequestTime).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    })
  );

  res.setHeader(
    "X-RateLimit-Reset",
    Math.ceil(resetTime / 1000)
  );

  res.setHeader(
    "X-RateLimit-Reset-Time",
    new Date(resetTime).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    })
  );

  if (retryAfter > 0) {
    res.setHeader("Retry-After", Math.ceil(retryAfter));
  }
}

module.exports = setRateLimitHeaders;