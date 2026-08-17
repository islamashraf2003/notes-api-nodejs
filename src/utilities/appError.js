export default class AppError extends Error {
    /**
     * @param {string} message
     * @param {number} [status]
     */
    constructor(message, status = 500) {
        super(message);
        this.name = "AppError";
        this.status = status;
        Error.captureStackTrace?.(this, AppError);
    }
}
