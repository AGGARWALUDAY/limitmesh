import http from "k6/http";
import { check } from "k6";
import { Counter } from "k6/metrics";

const runId = Date.now();

const acceptedResponses = new Counter("rate_limit_accepted");
const rejectedResponses = new Counter("rate_limit_rejected");
const unexpectedResponses = new Counter("unexpected_status");

// HTTP 429 is an intentional and expected result in this test.
http.setResponseCallback(http.expectedStatuses(200, 429));

function hasHeader(headers, expectedName) {
  return Object.keys(headers).some(
    (name) => name.toLowerCase() === expectedName.toLowerCase()
  );
}

export const options = {
  scenarios: {
    multi_client_enforcement: {
      executor: "per-vu-iterations",
      vus: 20,
      iterations: 8,
      maxDuration: "30s",
    },
  },

  thresholds: {
    checks: ["rate==1"],
    http_req_failed: ["rate==0"],
    rate_limit_accepted: ["count==100"],
    rate_limit_rejected: ["count==60"],
    unexpected_status: ["count==0"],
  },
};

export default function () {
  const clientId = `k6-enforcement-${runId}-${__VU}`;

  const response = http.get("http://localhost:8080/", {
    headers: {
      "x-test-ip": clientId,
    },
  });

  if (response.status === 200) {
    acceptedResponses.add(1);
  } else if (response.status === 429) {
    rejectedResponses.add(1);
  } else {
    unexpectedResponses.add(1);
  }

  // Each VU sends eight requests using one identity.
  // Iterations 0-4 should succeed; iterations 5-7 should be rejected.
  const expectedStatus = __ITER < 5 ? 200 : 429;

  check(response, {
    "per-client rate limit is enforced": (r) => r.status === expectedStatus,

    "rate limit header exists": (r) =>
      hasHeader(r.headers, "x-ratelimit-limit"),
  });
}
