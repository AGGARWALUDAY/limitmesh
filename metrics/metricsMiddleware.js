const { requestsTotal, rateLimitRejectionsTotal } = require("./registry");

function metricsMiddleware(algorithm) {
  return (req, res, next) => {
    // Do not count Prometheus scraping as application traffic.
    if (req.path === "/metrics") {
      return next();
    }

    // Record the final outcome after Express finishes the response.
    res.once("finish", () => {
      let outcome;

      if (res.statusCode === 429) {
        outcome = "rejected";

        rateLimitRejectionsTotal.inc({
          algorithm,
        });
      } else if (res.statusCode >= 500) {
        outcome = "error";
      } else {
        outcome = "allowed";
      }

      requestsTotal.inc({
        algorithm,
        outcome,
      });
    });

    next();
  };
}

module.exports = metricsMiddleware;
