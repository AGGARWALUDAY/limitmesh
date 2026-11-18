import http from "k6/http";
import { check } from "k6";

const runId = Date.now();

export const options = {
  vus: 1,
  iterations: 5,

  thresholds: {
    checks: ["rate==1"],
    http_req_failed: ["rate==0"],
  },
};

export default function () {
  const response = http.get("http://localhost:8080/", {
    headers: {
      "x-test-ip": `k6-smoke-${runId}-${__VU}`,
    },
  });

  check(response, {
    "status is 200": (r) => r.status === 200,

    "Nginx forwarded request": (r) => Boolean(r.headers["X-Upstream"]),

    "rate limit header exists": (r) =>
      Object.keys(r.headers).some(
        (name) => name.toLowerCase() === "x-ratelimit-limit"
      ),
  });
}
