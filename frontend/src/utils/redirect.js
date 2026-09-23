/**
 * Validates and returns a safe relative internal redirect URL.
 * Prevents open-redirect security vulnerabilities.
 */
export const getSafeRedirectUrl = (targetUrl, fallback = "/user/dashboard") => {
  if (!targetUrl || typeof targetUrl !== "string") return fallback;
  const trimmed = targetUrl.trim();
  if (
    trimmed.startsWith("/") &&
    !trimmed.startsWith("//") &&
    !trimmed.startsWith("/\\") &&
    !trimmed.includes(":")
  ) {
    return trimmed;
  }
  return fallback;
};
