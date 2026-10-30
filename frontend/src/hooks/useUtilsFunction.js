import dayjs from "dayjs";
import Cookies from "js-cookie";
import useGetSetting from "./useGetSetting";

const useUtilsFunction = () => {
  const lang = Cookies.get("_lang");

  const { globalSetting } = useGetSetting();

  const rawCurrency = globalSetting?.default_currency;
  const currency = typeof rawCurrency === "string"
    ? rawCurrency
    : (typeof rawCurrency === "object" && rawCurrency !== null
        ? (rawCurrency.en || Object.values(rawCurrency).find(v => typeof v === "string") || "₹")
        : "₹");

  //for date and time format
  const showTimeFormat = (data, timeFormat) => {
    return dayjs(data).format(timeFormat);
  };

  const showDateFormat = (data) => {
    return dayjs(data).format(globalSetting?.default_date_format);
  };

  const showDateTimeFormat = (data, date, time) => {
    return dayjs(data).format(`${date} ${time}`);
  };

  //for formatting number

  const getNumber = (value = 0) => {
    return Number(parseFloat(value || 0).toFixed(2));
  };

  const getNumberTwo = (value = 0) => {
    return parseFloat(value || 0).toFixed(2);
  };

  //for translation
  const showingTranslateValue = (data) => {
    if (data === null || data === undefined) return "";
    if (typeof data === "string") return data;
    if (typeof data === "number" || typeof data === "boolean") return String(data);
    if (typeof data === "object") {
      if (lang && data[lang] && typeof data[lang] === "string") {
        return data[lang];
      }
      if (data.en) {
        if (typeof data.en === "string") return data.en;
        if (typeof data.en === "object" && data.en !== null) {
          const nested = data.en.en || Object.values(data.en).find(v => typeof v === "string");
          if (typeof nested === "string") return nested;
        }
      }
      const values = Object.values(data);
      for (const val of values) {
        if (typeof val === "string" && val.trim() !== "") {
          return val;
        }
        if (typeof val === "object" && val !== null) {
          const nested = val.en || Object.values(val).find(v => typeof v === "string");
          if (typeof nested === "string" && nested.trim() !== "") {
            return nested;
          }
        }
      }
      return "";
    }
    return "";
  };

  const showingImage = (data) => {
    if (!data || typeof data !== "string") return data || "";
    const trimmed = data.trim();
    if (!trimmed || trimmed === "undefined" || trimmed === "null") return "";

    const apiBase = (
      process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.farmacykart.com/api"
    ).replace(/\/api\/?$/, "");

    // Rewrite legacy development localhost ports (e.g. 8092, 5000) stored in DB
    if (
      trimmed.includes("localhost:8092") ||
      trimmed.includes("127.0.0.1:8092") ||
      trimmed.includes("localhost:5000") ||
      trimmed.includes("127.0.0.1:5000")
    ) {
      return trimmed.replace(
        /^https?:\/\/(localhost|127\.0\.0\.1):(8092|5000)/i,
        apiBase
      );
    }

    // Convert relative paths to live backend URL
    if (trimmed.startsWith("/uploads/") || trimmed.startsWith("/logo/")) {
      return `${apiBase}${trimmed}`;
    }

    return trimmed;
  };

  const showingUrl = (data) => {
    return data !== undefined ? data : "!#";
  };

  return {
    lang,
    currency,
    getNumber,
    getNumberTwo,
    showTimeFormat,
    showDateFormat,
    showingImage,
    showingUrl,
    globalSetting,
    showDateTimeFormat,
    showingTranslateValue,
  };
};

export default useUtilsFunction;
