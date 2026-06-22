const nodemailer = require("nodemailer");
const axios = require("axios");
const rateLimit = require("express-rate-limit");
const {
  prepareMailOptions,
  isResendConfigured,
} = require("./email-utils");

let transporter = null;

const getEmailPassword = () =>
  String(process.env.EMAIL_PASS || "")
    .replace(/^["']|["']$/g, "")
    .trim();

const getTransporter = () => {
  if (transporter) return transporter;

  const user = process.env.EMAIL_USER;
  const pass = getEmailPassword();

  if (!user || !pass) {
    throw new Error("EMAIL_USER and EMAIL_PASS must be set in environment");
  }

  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: { user, pass },
    });
  } else if (process.env.SERVICE === "gmail") {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  } else {
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user, pass },
    });
  }

  return transporter;
};

const sendViaResend = async (mail) => {
  const payload = {
    from: mail.from,
    to: Array.isArray(mail.to) ? mail.to : [mail.to],
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  };

  if (mail.replyTo) {
    payload.reply_to = mail.replyTo;
  }

  if (mail.headers && Object.keys(mail.headers).length > 0) {
    payload.headers = mail.headers;
  }

  if (mail.emailType) {
    payload.tags = [{ name: "type", value: String(mail.emailType) }];
  }

  if (Array.isArray(mail.attachments) && mail.attachments.length > 0) {
    payload.attachments = mail.attachments.map((att) => {
      const content = Buffer.isBuffer(att.content)
        ? att.content.toString("base64")
        : typeof att.content === "string"
          ? att.content
          : Buffer.from(att.content || "").toString("base64");
      return {
        filename: att.filename || "attachment",
        content,
        content_type: att.contentType || att.content_type || "application/octet-stream",
      };
    });
  }

  const { data } = await axios.post("https://api.resend.com/emails", payload, {
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    timeout: 30000,
  });

  return data;
};

const sendEmail = (body) => {
  return new Promise((resolve, reject) => {
    let mail;
    try {
      mail = prepareMailOptions(body);
    } catch (err) {
      return reject(err);
    }

    if (isResendConfigured()) {
      sendViaResend(mail)
        .then((data) => {
          console.log(
            `[email] Resend → ${mail.to} | ${mail.subject} | id=${data?.id || "ok"}`
          );
          resolve(data);
        })
        .catch((err) => {
          console.error("Resend API error:", err.response?.data || err.message);
          reject(
            new Error(
              err.response?.data?.message ||
                err.message ||
                "Resend failed to send email"
            )
          );
        });
      return;
    }

    console.warn(
      "[email] Using SMTP (Gmail) — transactional mail often lands in spam. Set RESEND_API_KEY."
    );

    getTransporter().sendMail(mail, (err, info) => {
      if (err) {
        console.error("Error sending email:", err);
        if (err.code === "EAUTH") {
          return reject(
            new Error(
              "SMTP authentication failed. Use Resend (RESEND_API_KEY) instead of Gmail. " +
                err.message
            )
          );
        }
        return reject(err);
      }
      return resolve(info);
    });
  });
};

const minutes = 30;
const emailVerificationLimit = rateLimit({
  windowMs: minutes * 60 * 1000,
  max: 3,
  handler: (req, res) => {
    res.status(429).send({
      success: false,
      message: `You made too many requests. Please try again after ${minutes} minutes.`,
    });
  },
});

const passwordVerificationLimit = rateLimit({
  windowMs: minutes * 60 * 1000,
  max: 3,
  handler: (req, res) => {
    res.status(429).send({
      success: false,
      message: `You made too many requests. Please try again after ${minutes} minutes.`,
    });
  },
});

const supportMessageLimit = rateLimit({
  windowMs: minutes * 60 * 1000,
  max: 5,
  handler: (req, res) => {
    res.status(429).send({
      success: false,
      message: `You made too many requests. Please try again after ${minutes} minutes.`,
    });
  },
});

const phoneVerificationLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  handler: (req, res) => {
    res.status(429).send({
      success: false,
      message: "Too many OTP requests. Please wait 5 minutes and try again.",
    });
  },
});

module.exports = {
  sendEmail,
  emailVerificationLimit,
  passwordVerificationLimit,
  supportMessageLimit,
  phoneVerificationLimit,
};
