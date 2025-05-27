class ApolloRateLimiter {
    constructor() {
        this.lastRequest = null;
        this.minWaitTime = 45000;
    }

    async enforceRateLimit() {
        if (this.lastRequest) {
            const elapsed = Date.now() - this.lastRequest;
            const waitTime = Math.max(0, this.minWaitTime - elapsed);
            if (waitTime > 0) {
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
        this.lastRequest = Date.now();
    }
}

module.exports = new ApolloRateLimiter();
