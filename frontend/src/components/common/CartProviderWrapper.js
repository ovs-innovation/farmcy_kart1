import React, { useContext, useEffect } from "react";
import { CartProvider } from "react-use-cart";
import { UserContext } from "@context/UserContext";

/**
 * CartProviderWrapper
 *
 * Dynamically provides an isolated CartProvider based on the current user:
 * - Authenticated user: keyed & identified by `user_${customerId}`
 * - Guest user / Unauthenticated: keyed & identified by `guest`
 *
 * This guarantees strict cart isolation between accounts and guest sessions,
 * avoiding any shared client state or cross-account cart pollution.
 */
const CartProviderWrapper = ({ children }) => {
  const userContext = useContext(UserContext);
  const userInfo = userContext?.userInfo || userContext?.state?.userInfo || null;
  const authStatus = userContext?.authStatus || userContext?.state?.authStatus || "loading";

  const userId = userInfo?._id || userInfo?.id || null;
  const isAuthenticated = authStatus === "authenticated" && !!userId;

  // Determine isolated cart identifier
  const cartId = isAuthenticated ? `user_${userId}` : "guest";

  // Cleanup legacy global 'react-use-cart' key once on initial load
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        if (localStorage.getItem("react-use-cart")) {
          localStorage.removeItem("react-use-cart");
        }
      } catch (err) {
        // Safe fallback for restricted storage environments
      }
    }
  }, []);

  return (
    <CartProvider key={cartId} id={cartId}>
      {children}
    </CartProvider>
  );
};

export default CartProviderWrapper;
