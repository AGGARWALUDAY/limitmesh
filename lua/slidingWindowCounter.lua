
-- KEYS[1] = rate limiter key
-- ARGV[1] = request limit
-- ARGV[2] = window duration in milliseconds
-- ARGV[3] = current timestamp in milliseconds

local key = KEYS[1]

local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local currentTime = tonumber(ARGV[3])

-- Validate inputs
if not limit or limit <= 0 or
   not window or window <= 0 or
   not currentTime or currentTime <= 0 then
    return redis.error_reply("Invalid sliding window counter configuration")
end

-- Read existing state
local values = redis.call(
    "HMGET",
    key,
    "currentWindowStart",
    "currentCount",
    "previousCount"
)

local currentWindowStart = tonumber(values[1])
local currentCount = tonumber(values[2])
local previousCount = tonumber(values[3])

-- Initialize state for the first request
if not currentWindowStart then
    currentWindowStart = currentTime
    currentCount = 0
    previousCount = 0
end

-- Calculate elapsed time
local timePassed = currentTime - currentWindowStart

-- Handle window rollover
if timePassed >= window then
    local windowsElapsed = math.floor(timePassed / window)

    if windowsElapsed == 1 then
        previousCount = currentCount
    else
        previousCount = 0
    end

    currentCount = 0
    currentWindowStart = currentWindowStart + (windowsElapsed * window)
end

-- Calculate previous window's weight
local timeIntoCurrentWindow = currentTime - currentWindowStart

local previousWindowWeight =
    (window - timeIntoCurrentWindow) / window

-- Estimate requests in the sliding window
local estimatedCount =
    (previousCount * previousWindowWeight) + currentCount

local resetTime = currentWindowStart + window

-- Check whether the request is allowed
if estimatedCount >= limit then

    local retryAfter = math.max(0, (resetTime - currentTime) / 1000)

    -- Persist state even when request is rejected
    redis.call(
        "HSET", key,
        "currentWindowStart", currentWindowStart,
        "currentCount", currentCount,
        "previousCount", previousCount
    )

    redis.call("PEXPIRE", key, window * 2)

    return {
        0,
        estimatedCount,
        0,
        resetTime,
        retryAfter
    }
end

-- Allow request and increment counter
currentCount = currentCount + 1

local remaining = math.max(
    0,
    math.floor(limit - estimatedCount - 1)
)

-- Save updated state
redis.call(
    "HSET", key,
    "currentWindowStart", currentWindowStart,
    "currentCount", currentCount,
    "previousCount", previousCount
)

redis.call("PEXPIRE", key, window * 2)

return {
    1,
    estimatedCount,
    remaining,
    resetTime,
    0
}
