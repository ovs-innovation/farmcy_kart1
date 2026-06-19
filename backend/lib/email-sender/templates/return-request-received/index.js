const { getSupportEmail } = require("../../email-utils");
const { storeBaseUrl } = require("../../simple-templates");

const formatDate = (date) => {
  try {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return String(date);
  }
};

const returnRequestReceivedEmail = (option) => {
  const shop = option.shop_name || "Farmacykart";
  const support = getSupportEmail();
  const returnsUrl = `${storeBaseUrl()}/returns`;

  const text = `Hello ${option.name || "there"},

We have received your return/refund request and our team will review it shortly.

Return request details:
- Request ID: #${option.returnId}
- Order ID: #${option.invoice}
- Date submitted: ${option.submittedDate}
- Reason: ${option.returnReason}
- Current status: ${option.status}

View your returns: ${returnsUrl}

If you have questions, contact us at ${support}.

— ${shop}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Return Request Received – ${shop}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:24px auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;padding:32px;">
    <p style="margin:0 0 16px;font-size:20px;font-weight:700;color:#059669;">${shop}</p>
    <p>Hello <strong>${option.name || "there"}</strong>,</p>
    <p>We have received your <strong>return/refund request</strong> and our team will review it shortly.</p>
    <table style="width:100%;margin:20px 0;border-collapse:collapse;">
      <tr><td style="padding:8px 0;color:#6b7280;width:42%;">Request ID</td><td style="padding:8px 0;font-weight:600;">#${option.returnId}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;">Order ID</td><td style="padding:8px 0;font-weight:600;">#${option.invoice}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;">Date submitted</td><td style="padding:8px 0;font-weight:600;">${option.submittedDate}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;">Reason</td><td style="padding:8px 0;font-weight:600;">${option.returnReason}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;">Current status</td><td style="padding:8px 0;font-weight:600;">${option.status}</td></tr>
    </table>
    <p style="margin:28px 0;">
      <a href="${returnsUrl}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:6px;font-weight:600;">View return status</a>
    </p>
    <p style="color:#6b7280;font-size:14px;">Questions? Email <a href="mailto:${support}" style="color:#059669;">${support}</a>.</p>
  </div>
</body>
</html>`;

  return { html, text };
};

module.exports = { returnRequestReceivedEmail, formatDate };
