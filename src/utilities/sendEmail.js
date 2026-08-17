import nodemailer from "nodemailer";
import { EMAIL_USER, EMAIL_PASSWORD, EMAIL_FROM } from "../config/env.js";
import emailTemplate from "./emailTemplate.js";

let transporter;

/**
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
            user: EMAIL_USER,
            pass: EMAIL_PASSWORD,
        },
    });

    return transporter;
};

/**
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
 * @returns {Promise<true>}
 */
export const verifyEmailConnection = async () => await getTransporter().verify();
