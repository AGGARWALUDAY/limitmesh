
-- KEYS[1] = rate limiter key
-- ARGV[1] = request limit
-- ARGV[2] = window duration in milliseconds
-- ARGV[3] = current timestamp in milliseconds
-- ARGV[4] = unique request ID

local key = KEYS[1]

local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local currentTime = tonumber(ARGV[3])
local requestId = ARGV[4]

-- Validate inputs
if not limit or limit <= 0 or
   not window or window <= 0 or
   not currentTime or currentTime <= 0 or
   not requestId or requestId == "" then
    return redis.error_reply("Invalid sliding window log configuration")
end

local windowStart = currentTime - window

-- Remove expired requests
redis.call(
    "ZREMRANGEBYSCORE",
    key,
    "-inf",
    windowStart
)

-- Count requests in the current sliding window
local requestCount = redis.call("ZCARD", key)

-- Get the oldest request
local oldestRequest = redis.call(
    "ZRANGE",
    key,
    0,
    0,
    "WITHSCORES"
)

-- Reject if limit is exceeded
if requestCount >= limit then
    local resetTime = tonumber(oldestRequest[2]) + window

    local retryAfter = math.ceil(
        math.max(0, (resetTime - currentTime) / 1000)
    )

    return {
        0,
        requestCount,
        0,
        resetTime,
        retryAfter
    }
end

-- Add the new request
redis.call(
    "ZADD",
    key,
    currentTime,
    requestId
)

-- Refresh key expiration
redis.call("PEXPIRE", key, window)

local remaining = math.max(0, limit - requestCount - 1)

-- Calculate reset time after insertion
local firstRequest = redis.call(
    "ZRANGE",
    key,
    0,
    0,
    "WITHSCORES"
)

local resetTime = tonumber(firstRequest[2]) + window

return {
    1,
    requestCount + 1,
    remaining,
    resetTime,
    0
}
