const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const MIN_PASSWORD_LENGTH = 8;

/**
 * Validates the sign-up body before the request reaches the database, and
 * normalises the fields the model indexes on (trimmed name, lower-cased email)
 * so the unique constraint sees a canonical value.
 *
 * Every failure is reported through the same `errors` map, keyed by field.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const validateSignUp = (req, res, next) => {
    const { name, email, password } = req.body ?? {};
    const errors = {};

    if (typeof name !== "string" || name.trim() === "") {
        errors.name = "Name is required";
    }

    if (typeof email !== "string" || email.trim() === "") {
        errors.email = "Email is required";
    } else if (!EMAIL_REGEX.test(email.trim())) {
        errors.email = "Please enter a valid email address";
    }

    if (typeof password !== "string" || password === "") {
        errors.password = "Password is required";
    } else if (password.length < MIN_PASSWORD_LENGTH) {
        errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    }

    if (Object.keys(errors).length > 0) {
        return res.status(400).json({
            message: "Validation failed",
            errors,
        });
    }

    req.body.name = name.trim();
    req.body.email = email.trim().toLowerCase();

    return next();
}
