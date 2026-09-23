import { useEffect, useRef, useContext } from "react";
import { useCart } from "react-use-cart";
import { UserContext } from "@context/UserContext";
import CustomerServices from "@services/CustomerServices";

/**
 * useCartSync
 *
 * Synchronizes cart state deterministically across authentication boundaries:
 *  1. Waits until authentication is fully resolved (authStatus !== "loading").
 *  2. If guest items were added prior to login, migrates them to the authenticated
 *     user's backend cart exactly once, and removes the guest storage key.
 *  3. Fetches the authoritative backend cart from MongoDB.
 *  4. Idempotently reconciles the local cart state with exact backend quantities,
 *     preventing duplicate additions or accumulative count errors.
 *  5. Protects against race conditions and late responses during account switches/logout.
 */
const useCartSync = () => {
  const { addItem, items, updateItemQuantity, removeItem, getItem } = useCart();
  const userContext = useContext(UserContext);
  const userInfo = userContext?.userInfo || userContext?.state?.userInfo;
  const authStatus = userContext?.authStatus || userContext?.state?.authStatus || "loading";

  const isSyncedRef = useRef(false);
  const lastUserIdRef = useRef(null);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    // 1. Wait until authentication status has resolved
    if (authStatus === "loading") {
      return;
    }

    const userId = userInfo?._id || userInfo?.id || null;

    // 2. Reset sync state when unauthenticated or logged out
    if (!userId || authStatus !== "authenticated") {
      isSyncedRef.current = false;
      lastUserIdRef.current = null;
      isSyncingRef.current = false;
      return;
    }

    // Allow re-sync if the authenticated user has changed
    if (lastUserIdRef.current !== userId) {
      isSyncedRef.current = false;
    }

    // 3. Skip if already synced for this user or currently syncing
    if (isSyncedRef.current || isSyncingRef.current) {
      return;
    }

    isSyncingRef.current = true;
    const currentSyncUserId = userId;

    const syncBackendCart = async () => {
      try {
        const isWholesalerUser =
          userInfo?.role &&
          String(userInfo.role).toLowerCase() === "wholesaler";

        // ── Step 1: Migrate Guest Items (Single-Path Migration) ─────────────
        if (typeof window !== "undefined") {
          try {
            const guestStorage = localStorage.getItem("react-use-cart-guest");
            if (guestStorage) {
              const parsedGuest = JSON.parse(guestStorage);
              const guestItems = Array.isArray(parsedGuest?.items) ? parsedGuest.items : [];

              if (guestItems.length > 0) {
                // Fetch existing backend cart first to check if items already exist
                const initialRes = await CustomerServices.getCustomerById(currentSyncUserId);
                const existingDbProductIds = new Set(
                  (initialRes?.cart || [])
                    .map((c) => c.productId?._id?.toString() || c.productId?.toString())
                    .filter(Boolean)
                );

                // Add only guest items that do not already exist in the backend cart
                for (const gItem of guestItems) {
                  if (!gItem || !gItem.id) continue;
                  const rawId = String(gItem.id);
                  const baseId = rawId.includes("-") ? rawId.slice(0, rawId.indexOf("-")) : rawId;
                  const quantity = Number(gItem.quantity) || 1;

                  if (!existingDbProductIds.has(baseId)) {
                    try {
                      await CustomerServices.addToCartDB(currentSyncUserId, baseId, quantity);
                      existingDbProductIds.add(baseId);
                    } catch (dbErr) {
                      console.error("[useCartSync] Failed to add guest item to backend:", dbErr);
                    }
                  }
                }
              }

              // Clear guest cart storage immediately after migration
              localStorage.removeItem("react-use-cart-guest");
            }
          } catch (guestErr) {
            console.error("[useCartSync] Error during guest cart migration:", guestErr);
          }
        }

        // Concurrency Check: Ensure user has not changed during migration
        const activeUserIdAfterMigration = userInfo?._id || userInfo?.id;
        if (activeUserIdAfterMigration !== currentSyncUserId) {
          return;
        }

        // ── Step 2: Fetch Authoritative Populated Backend Cart ──────────────
        const res = await CustomerServices.getCustomerById(currentSyncUserId);

        // Concurrency Check: Discard late response if user switched or logged out
        const activeUserId = userInfo?._id || userInfo?.id;
        if (activeUserId !== currentSyncUserId) {
          return;
        }

        const backendCart = res?.cart || [];

        // ── Step 3: Build Exact Backend Item Map ────────────────────────────
        const backendItemMap = new Map();
        backendCart.forEach((cartItem) => {
          const product = cartItem.productId;
          if (!product || !product._id) return;

          const id = String(product._id);
          const backendQty = Math.max(1, Number(cartItem.quantity) || 1);

          const effectivePrice =
            isWholesalerUser &&
            product.wholePrice &&
            Number(product.wholePrice) > 0
              ? Number(product.wholePrice)
              : product.prices?.price || product.prices?.originalPrice || product.price || 0;

          backendItemMap.set(id, {
            id,
            price: effectivePrice,
            title: product.title?.en || product.title || "Product",
            image: Array.isArray(product.image)
              ? product.image[0]
              : typeof product.image === "string"
                ? product.image
                : "",
            quantity: backendQty,
            slug: product.slug,
            stock:
              product?.stock !== undefined
                ? product.stock
                : product?.variants && product.variants[0]
                  ? product.variants[0].quantity
                  : undefined,
            minQuantity: product?.minQuantity,
          });
        });

        // ── Step 4: Idempotently Reconcile Local Cart State ─────────────────
        // A. Remove any local items not present in the backend cart
        items.forEach((localItem) => {
          const rawId = String(localItem.id);
          const baseId = rawId.includes("-") ? rawId.slice(0, rawId.indexOf("-")) : rawId;
          if (!backendItemMap.has(baseId) && !backendItemMap.has(rawId)) {
            removeItem(localItem.id);
          }
        });

        // B. Reconcile backend items into local cart with exact quantities
        backendItemMap.forEach((data, id) => {
          const existing = getItem(id);
          if (existing) {
            if (existing.quantity !== data.quantity) {
              updateItemQuantity(id, data.quantity);
            }
          } else {
            addItem(data, data.quantity);
          }
        });

        // ── Step 5: Mark Sync Complete for Current User ─────────────────────
        isSyncedRef.current = true;
        lastUserIdRef.current = currentSyncUserId;
      } catch (err) {
        console.error("[useCartSync] Error syncing cart:", err);
      } finally {
        isSyncingRef.current = false;
      }
    };

    syncBackendCart();
  }, [userInfo?._id, userInfo?.id, authStatus]);
};

export default useCartSync;
