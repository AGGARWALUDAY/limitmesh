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
    normal_load: {
      executor: "constant-arrival-rate",
      rate: 10,
      timeUnit: "1s",
      duration: "30s",
      preAllocatedVUs: 5,
      maxVUs: 10,
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
      "x-test-ip": `k6-normal-${runId}-${__VU}-${__ITER}`,
    },
  });

  check(response, {
    "status is 200": (r) => r.status === 200,
    "Nginx forwarded request": (r) => hasHeader(r.headers, "x-upstream"),
    "rate limit header exists": (r) =>
      hasHeader(r.headers, "x-ratelimit-limit"),
  });
}
