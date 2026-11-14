const test = require("node:test");
const assert = require("node:assert/strict");

const CircuitBreaker = require("../lib/circuitBreaker");
const { StorageUnavailableError } = require("../storage/errors");

function redisFailure() {
  return new StorageUnavailableError("Redis is unavailable");
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test("Circuit breaker starts in CLOSED state", () => {
  const breaker = new CircuitBreaker();

  assert.deepEqual(breaker.getState(), {
    state: "CLOSED",
    failureCount: 0,
    nextAttempt: null,
  });
});

test("Circuit opens after 3 consecutive storage failures", async () => {
  const breaker = new CircuitBreaker({
    failureThreshold: 3,
  });

  for (let i = 1; i <= 3; i++) {
    await assert.rejects(
      breaker.execute(async () => {
        throw redisFailure();
      }),
      StorageUnavailableError
    );

    if (i < 3) {
      assert.equal(breaker.getState().state, "CLOSED");
      assert.equal(breaker.getState().failureCount, i);
    }
  }

  assert.equal(breaker.getState().state, "OPEN");
  assert.equal(breaker.getState().failureCount, 3);
});

test("OPEN circuit rejects requests without executing the operation", async () => {
  const breaker = new CircuitBreaker({
    failureThreshold: 1,
  });

  await assert.rejects(
    breaker.execute(async () => {
      throw redisFailure();
    }),
    StorageUnavailableError
  );

  let operationCalled = false;

  await assert.rejects(
    breaker.execute(async () => {
      operationCalled = true;
    }),
    StorageUnavailableError
  );

  assert.equal(operationCalled, false);
  assert.equal(breaker.getState().state, "OPEN");
});

test("Successful HALF_OPEN probe closes the circuit", async () => {
  const breaker = new CircuitBreaker({
    failureThreshold: 1,
    resetTimeout: 20,
  });

  await assert.rejects(
    breaker.execute(async () => {
      throw redisFailure();
    }),
    StorageUnavailableError
  );

  await delay(30);

  const result = await breaker.execute(async () => "Redis recovered");

  assert.equal(result, "Redis recovered");
  assert.equal(breaker.getState().state, "CLOSED");
  assert.equal(breaker.getState().failureCount, 0);
});

test("Failed HALF_OPEN probe opens the circuit again", async () => {
  const breaker = new CircuitBreaker({
    failureThreshold: 1,
    resetTimeout: 20,
  });

  await assert.rejects(
    breaker.execute(async () => {
      throw redisFailure();
    }),
    StorageUnavailableError
  );

  await delay(30);

  await assert.rejects(
    breaker.execute(async () => {
      throw redisFailure();
    }),
    StorageUnavailableError
  );

  assert.equal(breaker.getState().state, "OPEN");
});

test("Only one request is allowed to perform a HALF_OPEN probe", async () => {
  const breaker = new CircuitBreaker({
    failureThreshold: 1,
    resetTimeout: 20,
  });

  await assert.rejects(
    breaker.execute(async () => {
      throw redisFailure();
    }),
    StorageUnavailableError
  );

  await delay(30);

  let operationCalled = 0;
  let resolveProbe;

  const firstProbe = breaker.execute(() => {
    operationCalled++;

    return new Promise((resolve) => {
      resolveProbe = resolve;
    });
  });

  // The first probe is now pending.
  assert.equal(breaker.getState().state, "HALF_OPEN");

  // A second request must be rejected immediately.
  await assert.rejects(
    breaker.execute(async () => {
      operationCalled++;
    }),
    StorageUnavailableError
  );

  assert.equal(operationCalled, 1);

  resolveProbe("Success");

  assert.equal(await firstProbe, "Success");
  assert.equal(breaker.getState().state, "CLOSED");
});

test("Unexpected command errors do not trip the CLOSED circuit", async () => {
  const breaker = new CircuitBreaker();

  await assert.rejects(
    breaker.execute(async () => {
      throw new Error("WRONGTYPE Operation against a key");
    }),
    /WRONGTYPE/
  );

  assert.equal(breaker.getState().state, "CLOSED");
  assert.equal(breaker.getState().failureCount, 0);
});

test("Unexpected command error during HALF_OPEN closes the circuit", async () => {
  const breaker = new CircuitBreaker({
    failureThreshold: 1,
    resetTimeout: 20,
  });

  await assert.rejects(
    breaker.execute(async () => {
      throw redisFailure();
    }),
    StorageUnavailableError
  );

  await delay(30);

  await assert.rejects(
    breaker.execute(async () => {
      throw new Error("WRONGTYPE");
    }),
    /WRONGTYPE/
  );

  assert.equal(breaker.getState().state, "CLOSED");
});
