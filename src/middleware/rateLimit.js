/**
 * @param {object} [options]
 * @param {number} [options.windowMs]
 * @param {number} [options.max]
 * @param {string} [options.message]
 * @returns {import('express').RequestHandler}
 */
export const rateLimit = ({
    windowMs = 15 * 60 * 1000,
    max = 10,
    message = "Too many requests, please try again later",
} = {}) => {
    /** @type {Map<string, {count: number, resetAt: number}>} */
    const hits = new Map();

    const sweep = setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of hits) {
            if (entry.resetAt <= now) hits.delete(key);
        }
    }, windowMs);
    sweep.unref();

    return (req, res, next) => {
        const key = req.ip ?? "unknown";
        const now = Date.now();
        const entry = hits.get(key);

        if (!entry || entry.resetAt <= now) {
            hits.set(key, { count: 1, resetAt: now + windowMs });
            return next();
        }

        entry.count += 1;

        if (entry.count > max) {
            const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
            res.set("Retry-After", String(retryAfter));
            return res.status(429).json({ message });
        }

        return next();
    };
};
