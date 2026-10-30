import Cookies from "js-cookie";

/**
 * Safely extracts a primitive string from any input (string, number, localized object {en: ...}, etc.)
 * Prevents React Minified Error #31 (Objects are not valid as a React child).
 *
 * @param {*} data - Any value to sanitize for JSX rendering.
 * @param {string} [preferredLang] - Optional language code override (defaults to cookie _lang or "en").
 * @param {string} [fallback=""] - Fallback string if value cannot be extracted.
 * @returns {string} - Guaranteed primitive string.
 */
export function getSafeString(data, preferredLang = null, fallback = "") {
  if (data === null || data === undefined) return fallback;
  if (typeof data === "string") return data;
  if (typeof data === "number" || typeof data === "boolean") return String(data);

  if (Array.isArray(data)) {
    if (data.length === 0) return fallback;
    return getSafeString(data[0], preferredLang, fallback);
  }

  if (typeof data === "object") {
    let lang = preferredLang;
    if (!lang && typeof window !== "undefined") {
      try {
        lang = Cookies.get("_lang");
      } catch (_) {}
    }
    if (!lang) lang = "en";

    // 1. Try preferred language
    if (data[lang] !== undefined && data[lang] !== null) {
      const val = getSafeString(data[lang], preferredLang, "");
      if (val) return val;
    }

    // 2. Try English
    if (data.en !== undefined && data.en !== null) {
      const val = getSafeString(data.en, preferredLang, "");
      if (val) return val;
    }

    // 3. Try common fallback keys
    for (const key of ["default", "title", "name", "value", "text", "label"]) {
      if (data[key] !== undefined && data[key] !== null) {
        const val = getSafeString(data[key], preferredLang, "");
        if (val) return val;
      }
    }

    // 4. Find first non-empty string in values
    for (const val of Object.values(data)) {
      if (val !== undefined && val !== null) {
        const str = getSafeString(val, preferredLang, "");
        if (str && str.trim() !== "") return str;
      }
    }

    return fallback;
  }

  return String(data || fallback);
}

export default getSafeString;
