/**
 * @param {unknown} value
 * @returns {string}
 */
const escapeHtml = (value) =>
    String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");

/**
 * @param {object} options
 * @param {string} options.title - Main heading, e.g. "Confirm your email".
 * @param {string} options.message - Body text shown under the heading.
 * @param {string} [options.buttonText] - Label of the call-to-action button.
 * @param {string} [options.buttonUrl] - URL the button points to.
 * @param {string} [options.footer] - Small print under the divider.
 * @returns {string} A complete HTML document.
 */
export default function emailTemplate({
    title,
    message,
    buttonText,
    buttonUrl,
    footer = "You received this email because you have an account on Note App.",
}) {
    if (!title || !message) {
        throw new Error("emailTemplate requires both 'title' and 'message'");
    }

    const button = buttonText && buttonUrl
        ? `
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 24px;">
                                <tr>
                                    <td align="center" bgcolor="#2563eb" style="border-radius: 6px;">
                                        <a href="${escapeHtml(buttonUrl)}"
                                           style="display: inline-block; padding: 12px 28px; font-family: Arial, Helvetica, sans-serif; font-size: 16px; font-weight: bold; color: #ffffff; text-decoration: none; border-radius: 6px;">
                                            ${escapeHtml(buttonText)}
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            <p style="margin: 0 0 24px; font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 20px; color: #6b7280;">
                                If the button doesn't work, copy this link into your browser:<br />
                                <span style="color: #2563eb; word-break: break-all;">${escapeHtml(buttonUrl)}</span>
                            </p>`
        : "";

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f3f4f6;">
        <tr>
            <td align="center" style="padding: 32px 16px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; background-color: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb;">
                    <tr>
                        <td style="padding: 32px;">
                            <h1 style="margin: 0 0 16px; font-family: Arial, Helvetica, sans-serif; font-size: 22px; line-height: 30px; color: #111827;">
                                ${escapeHtml(title)}
                            </h1>
                            <p style="margin: 0 0 24px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 24px; color: #374151;">
                                ${escapeHtml(message)}
                            </p>${button}
                            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0 0 16px;" />
                            <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 18px; color: #9ca3af;">
                                ${escapeHtml(footer)}
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}
