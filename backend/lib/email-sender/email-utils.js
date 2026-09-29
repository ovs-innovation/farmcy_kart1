const crypto = require("crypto");

const parseFromAddress = (from = "") => {
  const match = String(from).match(/<([^>]+)>/);
  return match ? match[1].trim() : String(from).trim();
};

const getBrandDomain = () => {
  const fromEmail = parseFromAddress(process.env.RESEND_FROM || "");
  if (fromEmail.includes("@")) {
    return fromEmail.split("@")[1];
  }
  const store = (process.env.STORE_URL || "https://farmacykart.com").replace(
    /^https?:\/\//,
    ""
  );
  return store.split("/")[0].replace(/^www\./, "") || "farmacykart.com";
};

/** Always same domain as RESEND_FROM — never Gmail in headers/body for Resend sends. */
const getSupportEmail = () => {
  if (process.env.EMAIL_REPLY_TO) {
    return process.env.EMAIL_REPLY_TO.trim();
  }
  return `support@${getBrandDomain()}`;
};

const getDefaultReplyTo = () => getSupportEmail();

const isResendConfigured = () =>
  Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM);

const htmlToPlainText = (html = "") => {
  return String(html)
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, "$2\n$1\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#?\w+;/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const buildTransactionalHeaders = (emailType) => {
  const supportEmail = getSupportEmail();
  const headers = {
    "X-Entity-Ref-ID": crypto.randomBytes(16).toString("hex"),
    "Auto-Submitted": "auto-generated",
    "X-Auto-Response-Suppress": "All",
    "List-Unsubscribe": `<mailto:${supportEmail}?subject=unsubscribe>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
  };
  if (emailType) {
    headers["X-Email-Type"] = String(emailType);
  }
  return headers;
};

const formatResendFrom = (rawFrom = "") => {
  let str = String(rawFrom || "").trim().replace(/^["']|["']$/g, "");
  if (!str) {
    return "Farmacykart <onboarding@resend.dev>";
  }

  const angleMatch = str.match(/^(.*?)\s*<([^>]+)>$/);
  let name = "Farmacykart";
  let email = str;

  if (angleMatch) {
    name = angleMatch[1].trim() || "Farmacykart";
    email = angleMatch[2].trim();
  }

  // If email is missing '@' (e.g. info.farmacykart.com), fix common typo
  if (!email.includes("@")) {
    if (email.includes(".")) {
      const firstDot = email.indexOf(".");
      email = email.slice(0, firstDot) + "@" + email.slice(firstDot + 1);
    } else {
      email = "onboarding@resend.dev";
    }
  }

  // Public domains like @gmail.com cannot be used on Resend without domain verification
  if (/@(gmail|yahoo|outlook|hotmail|icloud|live)\.com/i.test(email)) {
    return `${name} <onboarding@resend.dev>`;
  }

  return `${name} <${email}>`;
};

const prepareMailOptions = (body = {}) => {
  const useResend = isResendConfigured();

  if (!useResend && !process.env.EMAIL_USER) {
    throw new Error("Set RESEND_API_KEY + RESEND_FROM or EMAIL_USER for SMTP");
  }

  if (useResend && !process.env.RESEND_FROM) {
    throw new Error(
      "RESEND_FROM is required (e.g. Farmacykart <onboarding@resend.dev>)"
    );
  }

  const mail = { ...body };
  const replyTo = getDefaultReplyTo();

  if (useResend) {
    mail.from = formatResendFrom(process.env.RESEND_FROM);
  } else {
    const fromName = process.env.EMAIL_FROM_NAME || "Farmacykart";
    mail.from = `"${fromName}" <${process.env.EMAIL_USER}>`;
  }

  mail.replyTo = replyTo;

  delete mail.fromName;

  if (!mail.text && mail.html) {
    mail.text = body.text || htmlToPlainText(mail.html);
  }

  if (!mail.text) {
    throw new Error("Email must include text or html body");
  }

  mail.headers = {
    ...buildTransactionalHeaders(body.emailType),
    ...(body.headers || {}),
  };

  if (body.emailType) {
    mail.emailType = body.emailType;
  }

  return mail;
};

module.exports = {
  htmlToPlainText,
  parseFromAddress,
  getBrandDomain,
  getSupportEmail,
  getDefaultReplyTo,
  isResendConfigured,
  prepareMailOptions,
};
