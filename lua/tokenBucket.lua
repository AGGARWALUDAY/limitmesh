local key = KEYS[1]

local capacity = tonumber(ARGV[1])
local refillRate = tonumber(ARGV[2])
local refillWindow = tonumber(ARGV[3])

-- Get the current time from Redis so all server instances
-- use the same clock
local time = redis.call("TIME")
local currentTime =
    tonumber(time[1]) * 1000 +
    math.floor(tonumber(time[2]) / 1000)

-- Read the existing bucket state
local tokens = redis.call("HGET", key, "tokens")
local lastRefillTime =
    redis.call("HGET", key, "lastRefillTime")

-- A new client starts with a full bucket
if not tokens then
    tokens = capacity
    lastRefillTime = currentTime
else
    tokens = tonumber(tokens)
    lastRefillTime = tonumber(lastRefillTime)

    -- Calculate how many tokens have accumulated
    local elapsed = math.max(0, currentTime - lastRefillTime)

    local tokensToAdd =
        elapsed * refillRate / refillWindow

    tokens = math.min(capacity, tokens + tokensToAdd)
end

-- Check whether one token is available
local allowed = 0
local retryAfterMs = 0

if tokens >= 1 then
    tokens = tokens - 1
    allowed = 1
else
    retryAfterMs =
        math.ceil((1 - tokens) * refillWindow / refillRate)
end

-- Save the updated bucket state
redis.call(
    "HSET",
    key,
    "tokens", tokens,
    "lastRefillTime", currentTime
)

-- After enough inactivity, the bucket will be full again
local ttl = math.ceil(capacity * refillWindow / refillRate)
redis.call("PEXPIRE", key, ttl)

-- Calculate time until the bucket is completely full
local timeToFullMs =
    math.ceil((capacity - tokens) * refillWindow / refillRate)

return {
    allowed,
    tokens,
    retryAfterMs,
    currentTime,
    timeToFullMs
}