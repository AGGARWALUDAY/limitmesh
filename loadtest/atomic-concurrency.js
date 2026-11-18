import http from "k6/http";
import { check } from "k6";
import { Counter } from "k6/metrics";

export function setup() {
  return {
    clientId: `k6-atomic-shared-${Date.now()}`,
  };
}
const accepted = new Counter("atomic_accepted");
const rejected = new Counter("atomic_rejected");
const unexpected = new Counter("atomic_unexpected");

http.setResponseCallback(http.expectedStatuses(200, 429));

export const options = {
  scenarios: {
    concurrent_same_client: {
      executor: "per-vu-iterations",
      vus: 20,
      iterations: 8,
      maxDuration: "30s",
    },
  },

  thresholds: {
    checks: ["rate==1"],
    http_req_failed: ["rate==0"],
    atomic_accepted: ["count==5"],
    atomic_rejected: ["count==155"],
    atomic_unexpected: ["count==0"],
  },
};

export default function (data) {
  const response = http.get("http://localhost:8080/", {
    headers: {
      "x-test-ip": data.clientId,
    },
  });

  if (response.status === 200) {
    accepted.add(1);
  } else if (response.status === 429) {
    rejected.add(1);
  } else {
    unexpected.add(1);
  }

  check(response, {
    "shared rate limit enforced": (r) => r.status === 200 || r.status === 429,

    "rate limit header exists": (r) =>
      Object.keys(r.headers).some(
        (name) => name.toLowerCase() === "x-ratelimit-limit"
      ),
  });
}
