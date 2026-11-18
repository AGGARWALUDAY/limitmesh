import http from "k6/http";
import { check } from "k6";

const runId = Date.now();

function hasHeader(headers, expectedName) {
  return Object.keys(headers).some(
    (name) => name.toLowerCase() === expectedName.toLowerCase()
  );
}

function sendRequest(phase) {
  const response = http.get("http://localhost:8080/", {
    headers: {
      "x-test-ip": `k6-burst-${runId}-${phase}-${__VU}-${__ITER}`,
    },
  });

  check(response, {
    "status is 200": (r) => r.status === 200,
    "Nginx forwarded request": (r) => hasHeader(r.headers, "x-upstream"),
    "rate limit header exists": (r) =>
      hasHeader(r.headers, "x-ratelimit-limit"),
  });
}

export const options = {
  scenarios: {
    baseline: {
      executor: "constant-arrival-rate",
      exec: "baseline",
      startTime: "0s",
      rate: 10,
      timeUnit: "1s",
      duration: "10s",
      preAllocatedVUs: 5,
      maxVUs: 10,
    },

    burst: {
      executor: "constant-arrival-rate",
      exec: "burst",
      startTime: "10s",
      rate: 50,
      timeUnit: "1s",
      duration: "5s",
      preAllocatedVUs: 10,
      maxVUs: 30,
    },

    recovery: {
      executor: "constant-arrival-rate",
      exec: "recovery",
      startTime: "15s",
      rate: 10,
      timeUnit: "1s",
      duration: "10s",
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

export function baseline() {
  sendRequest("baseline");
}

export function burst() {
  sendRequest("burst");
}

export function recovery() {
  sendRequest("recovery");
}
