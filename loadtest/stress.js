import http from "k6/http";
import { check } from "k6";

const runId = Date.now();

function hasHeader(headers, expectedName) {
  return Object.keys(headers).some(
    (name) => name.toLowerCase() === expectedName.toLowerCase()
  );
}

export const options = {
  scenarios: {
    stress_test: {
      executor: "ramping-arrival-rate",
      startRate: 10,
      timeUnit: "1s",

      stages: [
        { target: 10, duration: "30s" },
        { target: 25, duration: "30s" },
        { target: 50, duration: "30s" },
        { target: 75, duration: "30s" },
        { target: 100, duration: "30s" },
      ],

      preAllocatedVUs: 10,
      maxVUs: 50,
    },
  },

  thresholds: {
    checks: ["rate==1"],
    http_req_failed: ["rate==0"],
    http_req_duration: ["p(95)<200", "p(99)<500"],
    dropped_iterations: ["count==0"],
  },
};

export default function () {
  const response = http.get("http://localhost:8080/", {
    headers: {
      "x-test-ip": `k6-stress-${runId}-${__VU}-${__ITER}`,
    },
  });

  check(response, {
    "status is 200": (r) => r.status === 200,

    "Nginx forwarded request": (r) => hasHeader(r.headers, "x-upstream"),

    "rate limit header exists": (r) =>
      hasHeader(r.headers, "x-ratelimit-limit"),
  });
}
