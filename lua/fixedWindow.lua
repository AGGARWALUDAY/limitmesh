
local currentCount = redis.call("GET", KEYS[1])

if not currentCount then
    redis.call("SET", KEYS[1], 1, "PX", ARGV[2])
    return {1, 1, tonumber(ARGV[2])}
end

if tonumber(currentCount) >= tonumber(ARGV[1]) then
    local ttl = redis.call("PTTL", KEYS[1])
    return {0, tonumber(currentCount), ttl}
end

local newCount = redis.call("INCR", KEYS[1])
local ttl = redis.call("PTTL", KEYS[1])

return {1, newCount, ttl}
