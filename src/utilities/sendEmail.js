import nodemailer from "nodemailer";
import { EMAIL_USER, EMAIL_PASSWORD, EMAIL_FROM } from "../config/email.js";
import emailTemplate from "./emailTemplate.js";

let transporter;

/**
 * Creates the transporter on first use and reuses it afterwards, so we don't
 * open a new connection pool on every send.
 *
 * @returns {import('nodemailer').Transporter}
 */
const getTransporter = () => {
    if (!EMAIL_USER || !EMAIL_PASSWORD) {
        throw new Error(
            "Email is not configured: set EMAIL_USER and EMAIL_PASSWORD in your .env file"
        );
    }

    transporter ??= nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: "islamashraf520.dev@gmail.com",
            pass: "wpvc ifxl fmur vpfc",
        },
    });

    return transporter;
};

/**
 * Sends one email. Rejects if the message is incomplete or the SMTP send
 * fails, so callers can forward the error to the express error handler.
 *
 * @param {object} options
 * @param {string | string[]} options.to - Recipient address(es).
 * @param {string} options.subject
 * @param {string} [options.text] - Plain text body. At least one of text/html is required.
 * @param {string} [options.html] - HTML body, e.g. built with emailTemplate().
 * @returns {Promise<import('nodemailer').SentMessageInfo>}
 */
export default async function sendEmail({ to, subject, text, html }) {
    if (!to) throw new Error("sendEmail requires a 'to' address");
    if (!subject) throw new Error("sendEmail requires a 'subject'");
    if (!text && !html) throw new Error("sendEmail requires either 'text' or 'html'");

    return await getTransporter().sendMail({
        from: EMAIL_FROM,
        to,
        subject,
        text,
        html,
    });
}

/**
 * Sends the welcome email that goes out after sign-up. The subject and body are
 * fixed here so callers only have to supply who it goes to.
 *
 * @param {object} options
 * @param {string} options.email - Recipient address.
 * @param {string} options.name - Recipient's name, used in the greeting.
 * @returns {Promise<import('nodemailer').SentMessageInfo>}
 */
export const sendWelcomeEmail = async ({ email, name }) =>
    await sendEmail({
        to: email,
        subject: "Welcome to Note App",
        text: `Welcome, ${name}! Your account has been created successfully. You can now sign in and start creating notes.`,
        html: emailTemplate({
            title: `Welcome, ${name}!`,
            message: "Your account has been created successfully. You can now sign in and start creating notes.",
        }),
    });

/**
 * Checks the SMTP credentials without sending anything. Useful on startup.
 *
 * @returns {Promise<true>}
 */
export const verifyEmailConnection = async () => await getTransporter().verify();
