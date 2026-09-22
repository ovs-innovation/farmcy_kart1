import Cookies from "js-cookie";

const getUserSession = () => {
  if (typeof window !== "undefined") {
    const cookieUserInfo = Cookies.get("userInfo");
    if (cookieUserInfo) {
      try {
        const parsed = JSON.parse(cookieUserInfo);
        return parsed?.token ? parsed : null;
      } catch (e) {
        return null;
      }
    }
  }

  return null;
};

export { getUserSession };

