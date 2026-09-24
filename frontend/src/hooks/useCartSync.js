import { useEffect, useRef, useContext, useCallback } from "react";
import { useCart } from "react-use-cart";
import { UserContext } from "@context/UserContext";
import CustomerServices from "@services/CustomerServices";
import {
  normalizeServerCart,
  setLastConfirmedServerCart,
  resetCartMutationState,
  hasActiveCartMutations,
  getCartEpoch,
} from "@hooks/useCartDB";

/**
 * useCartSync
 *
 * Deterministically synchronizes the authenticated user's cart from MongoDB (SSOT):
 *  1. Initial Hydration: Additively migrates guest items ($Q_{server} + Q_{guest}$) and hydrates server cart.
 *  2. Focus & Visibility Sync: Automatically reconciles server cart when tab is focused or becomes visible.
 *  3. Cross-Tab Sync: Receives BroadcastChannel / storage invalidation signals from other tabs to reconcile state.
 *  4. Duplicate & Cooldown Guard: Prevents overlapping or redundant GET requests from rapid browser events.
 *  5. Active Mutation Supremacy: Never overwrites active debounced or in-flight user mutations with stale server state.
 *  6. Session & Logout Guard: Rejects in-flight sync responses across logout or account switch boundaries.
 *  7. Network Failure Resiliency: Preserves valid local state on network/server error without emptying cart.
 */
const useCartSync = () => {
  const { setItems, items } = useCart();
  const userContext = useContext(UserContext);
  const userInfo = userContext?.userInfo || userContext?.state?.userInfo;
  const authStatus = userContext?.authStatus || userContext?.state?.authStatus || "loading";

  const isSyncedRef = useRef(false);
  const lastUserIdRef = useRef(null);
  const isSyncingRef = useRef(false);
  const lastSyncTimeRef = useRef(0);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const userInfoRef = useRef(userInfo);
  userInfoRef.current = userInfo;
  const authStatusRef = useRef(authStatus);
  authStatusRef.current = authStatus;

  /**
   * Helper to extract clean product ID from item object or composite string.
   */
  const resolveDbId = useCallback((itemOrId) => {
    const rawId =
      typeof itemOrId === "string"
        ? itemOrId
        : itemOrId?._id || itemOrId?.productId || itemOrId?.id || null;
    if (!rawId) return null;
    const dashIdx = String(rawId).indexOf("-");
    return dashIdx !== -1 ? String(rawId).slice(0, dashIdx) : String(rawId);
  }, []);

  /**
   * Core backend cart synchronization method.
   * @param {boolean} isInitial - true if running initial login/hydration flow with guest migration.
   */
  const syncBackendCart = useCallback(
    async (isInitial = false) => {
      const activeUser = userInfoRef.current;
      const currentAuthStatus = authStatusRef.current;
      const currentSyncUserId = activeUser?._id || activeUser?.id || null;

      // 1. Must be authenticated
      if (!currentSyncUserId || currentAuthStatus !== "authenticated") {
        return;
      }

      // 2. Prevent overlapping / duplicate in-flight synchronization requests
      if (isSyncingRef.current) {
        return;
      }

      // 3. For event-triggered syncs (focus/visibility/cross-tab):
      if (!isInitial) {
        // Skip if active local mutations are currently debouncing or in-flight on this tab
        if (hasActiveCartMutations()) {
          return;
        }
        // Cooldown guard: skip if a sync succeeded less than 1000ms ago
        if (Date.now() - lastSyncTimeRef.current < 1000) {
          return;
        }
      }

      isSyncingRef.current = true;
      const requestEpoch = getCartEpoch();

      try {
        const isWholesalerUser =
          activeUser?.role &&
          String(activeUser.role).toLowerCase() === "wholesaler";

        // ── Step A: Additive Guest Items Migration (Initial Hydration only) ──
        if (isInitial && typeof window !== "undefined") {
          try {
            const guestStorage = localStorage.getItem("react-use-cart-guest");
            if (guestStorage) {
              const parsedGuest = JSON.parse(guestStorage);
              const guestItems = Array.isArray(parsedGuest?.items) ? parsedGuest.items : [];

              if (guestItems.length > 0) {
                let existingCartRes;
                try {
                  existingCartRes = await CustomerServices.getCart(currentSyncUserId);
                } catch (e) {
                  existingCartRes = await CustomerServices.getCustomerById(currentSyncUserId);
                }

                const backendCartList = existingCartRes?.cart || [];
                const backendQtyMap = new Map();

                backendCartList.forEach((c) => {
                  const pId = c.productId?._id?.toString() || c.productId?.toString();
                  if (pId) {
                    backendQtyMap.set(pId, Number(c.quantity) || 1);
                  }
                });

                for (const gItem of guestItems) {
                  if (!gItem || !gItem.id) continue;
                  const baseId = resolveDbId(gItem);
                  if (!baseId) continue;
                  const guestQty = Math.max(1, Number(gItem.quantity) || 1);

                  if (backendQtyMap.has(baseId)) {
                    const currentBackendQty = backendQtyMap.get(baseId);
                    const mergedQty = currentBackendQty + guestQty;
                    try {
                      await CustomerServices.updateCartItemDB(currentSyncUserId, baseId, mergedQty);
                      backendQtyMap.set(baseId, mergedQty);
                    } catch (updateErr) {
                      console.error("[useCartSync] Failed to merge guest quantity:", updateErr);
                    }
                  } else {
                    try {
                      await CustomerServices.addToCartDB(currentSyncUserId, baseId, guestQty);
                      backendQtyMap.set(baseId, guestQty);
                    } catch (addErr) {
                      console.error("[useCartSync] Failed to add guest item to backend:", addErr);
                    }
                  }
                }
              }

              // Clear guest cart storage only after migration finishes
              localStorage.removeItem("react-use-cart-guest");
            }
          } catch (guestErr) {
            console.error("[useCartSync] Error during guest cart migration:", guestErr);
          }
        }

        // Concurrency Check 1: Verify user hasn't changed or logged out
        const activeUserIdDuring = userInfoRef.current?._id || userInfoRef.current?.id;
        if (activeUserIdDuring !== currentSyncUserId || authStatusRef.current !== "authenticated") {
          return;
        }

        // ── Step B: Fetch Authoritative Populated Backend Cart ──────────────
        let res;
        try {
          res = await CustomerServices.getCart(currentSyncUserId);
        } catch (e) {
          res = await CustomerServices.getCustomerById(currentSyncUserId);
        }

        // Concurrency Check 2: Verify active session, unchanged epoch, and no intervening local mutations
        const activeUserIdAfter = userInfoRef.current?._id || userInfoRef.current?.id;
        if (
          activeUserIdAfter !== currentSyncUserId ||
          authStatusRef.current !== "authenticated" ||
          getCartEpoch() !== requestEpoch ||
          hasActiveCartMutations()
        ) {
          return; // Discard stale sync response if user switched, logged out, or started a local mutation
        }

        const backendCart = res?.cart || [];

        // ── Step C: Normalize and Atomically Hydrate Client Store ───────────
        const normalized = normalizeServerCart(backendCart, isWholesalerUser, itemsRef.current);
        setLastConfirmedServerCart(normalized);
        setItems(normalized);

        // ── Step D: Mark Sync Complete & Update Cooldown Timestamp ──────────
        lastSyncTimeRef.current = Date.now();
        isSyncedRef.current = true;
        lastUserIdRef.current = currentSyncUserId;
      } catch (err) {
        console.warn("[useCartSync] Error syncing cart (preserving local state):", err?.message || err);
      } finally {
        isSyncingRef.current = false;
      }
    },
    [resolveDbId, setItems]
  );

  // ── Effect 1: Initial Hydration on Authentication / Account Switch ─────────
  useEffect(() => {
    if (authStatus === "loading") {
      return;
    }

    const userId = userInfo?._id || userInfo?.id || null;

    if (!userId || authStatus !== "authenticated") {
      isSyncedRef.current = false;
      lastUserIdRef.current = null;
      isSyncingRef.current = false;
      resetCartMutationState();
      return;
    }

    if (lastUserIdRef.current !== userId) {
      isSyncedRef.current = false;
    }

    if (isSyncedRef.current || isSyncingRef.current) {
      return;
    }

    syncBackendCart(true);
  }, [userInfo?._id, userInfo?.id, authStatus, syncBackendCart]);

  // ── Effect 2: Focus, Visibility & Cross-Tab Invalidation Listeners ──────────
  useEffect(() => {
    const userId = userInfo?._id || userInfo?.id || null;
    if (!userId || authStatus !== "authenticated") {
      return;
    }

    // A. Focus event handler
    const handleFocus = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        syncBackendCart(false);
      }
    };

    // B. Visibility change event handler
    const handleVisibilityChange = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        syncBackendCart(false);
      }
    };

    // C. Cross-tab BroadcastChannel listener
    let channel = null;
    if (typeof window !== "undefined" && typeof BroadcastChannel !== "undefined") {
      try {
        channel = new BroadcastChannel("farmacykart_cart_sync");
        channel.onmessage = (event) => {
          if (
            event.data?.type === "CART_MUTATED" &&
            String(event.data?.customerId) === String(userId)
          ) {
            syncBackendCart(false);
          }
        };
      } catch (e) {
        // Fallback to storage listener below
      }
    }

    // D. Cross-tab storage event listener fallback
    const handleStorage = (e) => {
      if (e.key === "farmacykart_cart_sync_signal" && e.newValue) {
        if (e.newValue.startsWith(`${userId}_`)) {
          syncBackendCart(false);
        }
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("focus", handleFocus);
      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("storage", handleStorage);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", handleFocus);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener("storage", handleStorage);
      }
      if (channel) {
        try {
          channel.close();
        } catch (e) { }
      }
    };
  }, [userInfo?._id, userInfo?.id, authStatus, syncBackendCart]);
};

export default useCartSync;

