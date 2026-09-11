/** Farmacykart brand logo on Cloudinary (dse9adftu) */
export const DEFAULT_BRAND_LOGO =
  "/logo/logo.png";

const LEGACY_CLOUDS = ["dhqcwkpzp", "ahossain"];

export const isUsableImageUrl = (url) => {
  if (!url || typeof url !== "string") return false;
  const t = url.trim();
  if (t === "" || t.toLowerCase() === "undefined" || t.toLowerCase() === "null") return false;
  if (!t.startsWith("http") && !t.startsWith("/")) return false;
  const lower = t.toLowerCase();
  return !LEGACY_CLOUDS.some((c) => lower.includes(`res.cloudinary.com/${c}/`));
};

/** First valid URL, else default Cloudinary logo */
export const pickBrandLogo = (...candidates) => {
  for (const url of candidates) {
    if (isUsableImageUrl(url)) return url.trim();
  }
  return DEFAULT_BRAND_LOGO;
};
