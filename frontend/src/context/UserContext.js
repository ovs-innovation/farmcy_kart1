import Cookies from "js-cookie";
import { useSession, signOut } from "next-auth/react";
import React, { createContext, useEffect, useReducer, useCallback } from "react";

import { setToken } from "@services/httpServices";

export const UserContext = createContext();

const getInitialState = () => {
  const userInfoCookie = typeof window !== "undefined" ? Cookies.get("userInfo") : null;
  const shippingAddressCookie = typeof window !== "undefined" ? Cookies.get("shippingAddress") : null;
  const couponInfoCookie = typeof window !== "undefined" ? Cookies.get("couponInfo") : null;

  let initialUser = null;
  if (userInfoCookie) {
    try {
      const parsed = JSON.parse(userInfoCookie);
      if (parsed?.token) {
        initialUser = parsed;
      }
    } catch (e) {
      initialUser = null;
    }
  }

  return {
    authStatus: initialUser ? "authenticated" : "loading",
    userInfo: initialUser,
    shippingAddress: shippingAddressCookie ? JSON.parse(shippingAddressCookie) : {},
    couponInfo: couponInfoCookie ? JSON.parse(couponInfoCookie) : {},
  };
};

function reducer(state, action) {
  switch (action.type) {
    case "USER_LOGIN":
      return {
        ...state,
        userInfo: action.payload,
        authStatus: "authenticated",
      };

    case "USER_LOGOUT":
      return {
        ...state,
        userInfo: null,
        authStatus: "unauthenticated",
      };

    case "SET_AUTH_STATUS":
      return {
        ...state,
        authStatus: action.payload,
      };

    case "SAVE_SHIPPING_ADDRESS":
      return { ...state, shippingAddress: action.payload };

    case "SAVE_COUPON":
      return { ...state, couponInfo: action.payload };

    default:
      return state;
  }
}

export const UserProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, null, getInitialState);
  const { data: session, status } = useSession();

  // Centralized logout function
  const logout = useCallback(async () => {
    try {
      await signOut({ redirect: false });
    } catch (err) {
      console.warn("signOut error:", err);
    }
    Cookies.remove("userInfo");
    Cookies.remove("couponInfo");
    Cookies.remove("shippingAddress");
    setToken(null);
    dispatch({ type: "USER_LOGOUT" });
  }, []);

  // Centralized login function
  const login = useCallback((userData) => {
    if (!userData || !userData.token) return;
    setToken(userData.token);
    Cookies.set("userInfo", JSON.stringify(userData), { expires: 1 });
    dispatch({ type: "USER_LOGIN", payload: userData });
  }, []);

  // Session & Cookie Reconciliation Effect
  useEffect(() => {
    const cookieUserInfo = Cookies.get("userInfo");
    let parsedCookieUser = null;

    if (cookieUserInfo) {
      try {
        parsedCookieUser = JSON.parse(cookieUserInfo);
      } catch (e) {
        parsedCookieUser = null;
      }
    }

    // 1. Cookie is valid -> Authenticated
    if (parsedCookieUser?.token) {
      setToken(parsedCookieUser.token);
      dispatch({ type: "USER_LOGIN", payload: parsedCookieUser });
      return;
    }

    // 2. NextAuth session is authenticated -> Authenticated
    if (status === "authenticated" && session?.user) {
      const user = {
        ...session.user,
        _id: session.user._id || session.user.id,
      };
      if (user?.token) {
        setToken(user.token);
      }
      Cookies.set("userInfo", JSON.stringify(user), { expires: 1 });
      dispatch({ type: "USER_LOGIN", payload: user });
      return;
    }

    // 3. NextAuth finished and no cookie -> Unauthenticated
    if (status === "unauthenticated" && !parsedCookieUser?.token) {
      setToken(null);
      Cookies.remove("userInfo");
      dispatch({ type: "USER_LOGOUT" });
      return;
    }

    // 4. Still loading next-auth session and no cookie yet -> Loading
    if (status === "loading" && !parsedCookieUser?.token) {
      dispatch({ type: "SET_AUTH_STATUS", payload: "loading" });
    }
  }, [session, status]);

  // Handle multi-tab storage updates
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "userInfo") {
        if (!e.newValue) {
          setToken(null);
          dispatch({ type: "USER_LOGOUT" });
        } else {
          try {
            const parsed = JSON.parse(e.newValue);
            if (parsed?.token) {
              setToken(parsed.token);
              dispatch({ type: "USER_LOGIN", payload: parsed });
            }
          } catch (err) {
            setToken(null);
            dispatch({ type: "USER_LOGOUT" });
          }
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const value = {
    state,
    dispatch,
    authStatus: state.authStatus,
    isAuthLoading: state.authStatus === "loading",
    isAuthenticated: state.authStatus === "authenticated",
    userInfo: state.userInfo,
    logout,
    login,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

