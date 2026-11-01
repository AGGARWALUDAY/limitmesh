const test = require("node:test");
const assert = require("node:assert/strict");
const createRateLimiter = require("../middleware/RateLimiter");
const MemoryStore = require("../storage/memoryStore");

test("fixed window resets after its expiry", async () => {
  let now = 1_000;
  const store = new MemoryStore({ now: () => now });

  assert.equal((await store.checkFixedWindow("client", 2, 100)).allowed, true);
  assert.equal((await store.checkFixedWindow("client", 2, 100)).allowed, true);
  assert.equal((await store.checkFixedWindow("client", 2, 100)).allowed, false);

  now += 100;
  const result = await store.checkFixedWindow("client", 2, 100);
  assert.deepEqual(result, { allowed: true, count: 1, ttl: 100 });
});

test("token bucket refills at the configured rate", async () => {
  let now = 1_000;
  const store = new MemoryStore({ now: () => now });

  await store.checkTokenBucket("client", 2, 1, 1_000);
  await store.checkTokenBucket("client", 2, 1, 1_000);
  assert.equal(
    (await store.checkTokenBucket("client", 2, 1, 1_000)).allowed,
    false
  );

  now += 1_000;
  const result = await store.checkTokenBucket("client", 2, 1, 1_000);
  assert.equal(result.allowed, true);
  assert.equal(result.remaining, 0);
});

test("the middleware uses an injected store instead of creating Redis storage", async () => {
  const limiter = createRateLimiter({
    algorithm: "fixed-window",
    limit: 1,
    window: 1_000,
    store: new MemoryStore(),
  });
  const makeResponse = () => ({
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(body) {
      this.body = body;
    },
  });
  const request = { headers: { "x-test-ip": "memory-client" }, ip: "unused" };

  let continued = false;
  await limiter(request, makeResponse(), () => {
    continued = true;
  });
  assert.equal(continued, true);

  const rejected = makeResponse();
  await limiter(request, rejected, assert.fail);
  assert.equal(rejected.statusCode, 429);
});
