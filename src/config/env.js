/**
 * @param {string} key
 * @returns {string}
 */
const required = (key) => {
    const value = process.env[key];
    if (!value || value.trim() === "") {
        throw new Error(
            `Missing required environment variable: ${key}. ` +
            `Copy .env.example to .env and fill it in.`
        );
    }
    return value;
};

export const NODE_ENV = process.env.NODE_ENV || "development";
export const IS_PRODUCTION = NODE_ENV === "production";

export const PORT = Number(process.env.PORT) || 3000;

export const MONGO_URI =
    process.env.MONGO_URI || "mongodb://127.0.0.1:27017/mongoose-playground";

export const JWT_SECRET = required("JWT_SECRET");
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1d";

export const EMAIL_USER = process.env.EMAIL_USER || "";
export const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD || "";
export const EMAIL_FROM = process.env.EMAIL_FROM || `"Note App" <${EMAIL_USER}>`;
export const EMAIL_ENABLED = Boolean(EMAIL_USER && EMAIL_PASSWORD);
