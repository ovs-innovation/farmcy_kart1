import { useContext, useEffect } from "react";
import { UserContext } from "@context/UserContext";
import { setToken } from "@services/httpServices";

/** Resolves logged-in customer from UserContext as single source of truth and ensures API token is set. */
export default function useCustomerAuth() {
  const context = useContext(UserContext);

  const userInfo = context?.userInfo || context?.state?.userInfo || null;
  const authStatus = context?.authStatus || context?.state?.authStatus || "loading";
  const isAuthLoading = authStatus === "loading";
  const isAuthenticated = authStatus === "authenticated";
  const userId = userInfo?._id || userInfo?.id || null;
  const isLoggedIn = isAuthenticated && !!userInfo?.token && !!userId;

  useEffect(() => {
    if (userInfo?.token) {
      setToken(userInfo.token);
    }
  }, [userInfo?.token]);

  return {
    userInfo,
    userId,
    authStatus,
    isAuthLoading,
    isAuthenticated,
    isLoggedIn,
    logout: context?.logout,
    login: context?.login,
    dispatch: context?.dispatch,
  };
}

