// Simple in-memory rate limiter. For production use, store counts in Redis.
class RateLimiter {
  constructor(limit) {
    this.limit = limit;
    this.count = 0;
  }

  try() {
    if (this.count >= this.limit) return false;
    this.count++;
    return true;
  }
}

module.exports = RateLimiter;
