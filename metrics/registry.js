const client = require("@prometheus-io/client");

// Create a dedicated registry for LimitMesh.
const registry = new client.Registry();

// Collect standard Node.js metrics.
client.collectDefaultMetrics({
  register: registry,
});

// 1. Total incoming requests.
const requestsTotal = new client.Counter({
  name: "limitmesh_requests_total",
  help: "Total number of requests processed by LimitMesh",
  labelNames: ["algorithm", "outcome"],
  registers: [registry],
});

// 2. Requests rejected by the rate limiter.
const rateLimitRejectionsTotal = new client.Counter({
  name: "limitmesh_rate_limit_rejections_total",
  help: "Total number of requests rejected by the rate limiter",
  labelNames: ["algorithm"],
  registers: [registry],
});

// 3. Redis storage errors.
const redisErrorsTotal = new client.Counter({
  name: "limitmesh_redis_errors_total",
  help: "Total number of Redis storage errors",
  labelNames: ["operation"],
  registers: [registry],
});

// 4. Redis operation duration.
const redisOperationDuration = new client.Histogram({
  name: "limitmesh_redis_operation_duration_seconds",
  help: "Duration of Redis operations in seconds",
  labelNames: ["operation"],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

// 5. Current circuit breaker state.
// CLOSED = 0, HALF_OPEN = 1, OPEN = 2.
const circuitBreakerState = new client.Gauge({
  name: "limitmesh_circuit_breaker_state",
  help: "Current circuit breaker state (0=CLOSED, 1=HALF_OPEN, 2=OPEN)",
  registers: [registry],
});

// Export registry and metric instances.
module.exports = {
  registry,
  requestsTotal,
  rateLimitRejectionsTotal,
  redisErrorsTotal,
  redisOperationDuration,
  circuitBreakerState,
};
