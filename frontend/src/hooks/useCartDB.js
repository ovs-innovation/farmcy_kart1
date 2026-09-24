import { useCallback, useContext, useEffect } from "react";
import { useCart } from "react-use-cart";
import { UserContext } from "@context/UserContext";
import CustomerServices from "@services/CustomerServices";
import { notifyError } from "@utils/toast";

/**
 * Normalizes MongoDB populated cart items into the shape expected by react-use-cart.
 * Ensures consistent prices, images, stock, quantities, and canonical product IDs.
 */
export const normalizeServerCart = (serverCart, isWholesaler = false, existingItems = []) => {
  if (!Array.isArray(serverCart)) return [];

  const existingMap = new Map();
  (existingItems || []).forEach((item) => {
    if (item?.id) existingMap.set(String(item.id), item);
  });

  return serverCart
    .map((cartItem) => {
      if (!cartItem) return null;
      const product = cartItem.productId;
      if (!product) return null;

      const isPopulated = typeof product === "object" && product._id;
      const productId = isPopulated ? String(product._id) : String(product);
      const existing = existingMap.get(productId);

      const title = isPopulated
        ? product.title?.en || product.title || existing?.title || "Product"
        : existing?.title || "Product";

      const image = isPopulated
        ? Array.isArray(product.image)
          ? product.image[0]
          : typeof product.image === "string"
          ? product.image
          : existing?.image || ""
        : existing?.image || "";

      const effectivePrice = isPopulated
        ? isWholesaler && product.wholePrice && Number(product.wholePrice) > 0
          ? Number(product.wholePrice)
          : product.prices?.price || product.prices?.originalPrice || product.price || existing?.price || 0
        : existing?.price || 0;

      const originalPrice = isPopulated
        ? product.prices?.originalPrice || existing?.originalPrice || effectivePrice
        : existing?.originalPrice || effectivePrice;

      const slug = isPopulated ? product.slug || existing?.slug || "" : existing?.slug || "";
      const stock = isPopulated
        ? typeof product.stock === "number"
          ? product.stock
          : product.variants?.[0]?.quantity ?? existing?.stock ?? 999
        : existing?.stock ?? 999;

      const minQuantity = isWholesaler
        ? isPopulated && product.minQuantity
          ? Number(product.minQuantity)
          : existing?.minQuantity || 1
        : 1;

      return {
        id: productId,
        productId: productId,
        title,
        image,
        price: Number(effectivePrice) || 0,
        originalPrice: Number(originalPrice) || 0,
        quantity: Math.max(1, Number(cartItem.quantity) || 1),
        slug,
        stock,
        minQuantity,
        wholePrice: isPopulated ? product.wholePrice : existing?.wholePrice,
      };
    })
    .filter(Boolean);
};

// ─── Module-level Mutation & Concurrency Controller ───────────────────────────
// Shared across all useCartDB hook instances in the client runtime to coordinate
// per-product debouncing (350ms), monotonic version sequencing, and rollback snapshots.
const mutationTimers = new Map(); // productId -> NodeJS.Timeout
const mutationVersions = new Map(); // productId -> number (monotonic version)
let globalCartEpoch = 0; // Incremented on clearCart, account change, or any local mutation
let lastConfirmedServerCart = null; // Last verified server-confirmed cart array
let activeSessionCustomerId = null; // Active authenticated customer ID for session guarding
let inFlightMutationsCount = 0; // Number of currently active network mutation requests

export const setLastConfirmedServerCart = (cart) => {
  lastConfirmedServerCart = Array.isArray(cart) ? cart : [];
};

export const getLastConfirmedServerCart = () => lastConfirmedServerCart;

export const hasActiveCartMutations = () => {
  return mutationTimers.size > 0 || inFlightMutationsCount > 0;
};

export const getCartEpoch = () => globalCartEpoch;

export const broadcastCartMutation = (customerId) => {
  if (!customerId) return;
  if (typeof window !== "undefined") {
    if (typeof BroadcastChannel !== "undefined") {
      try {
        const channel = new BroadcastChannel("farmacykart_cart_sync");
        channel.postMessage({ type: "CART_MUTATED", customerId: String(customerId), timestamp: Date.now() });
        channel.close();
      } catch (e) {
        // Fallback or ignore
      }
    }
    try {
      localStorage.setItem("farmacykart_cart_sync_signal", `${customerId}_${Date.now()}`);
    } catch (e) {}
  }
};

export const resetCartMutationState = () => {
  mutationTimers.forEach((timer) => clearTimeout(timer));
  mutationTimers.clear();
  mutationVersions.clear();
  globalCartEpoch++;
  inFlightMutationsCount = 0;
  lastConfirmedServerCart = null;
  activeSessionCustomerId = null;
};

/**
 * useCartDB
 *
 * Centralized cart mutation hook with Phase 2A/2B reliability:
 * - 350ms per-product debounce for rapid quantity adjustments (+, -, arbitrary qty).
 * - Monotonic per-product versioning preventing out-of-order stale response overwrites.
 * - Version-aware optimistic UI updates with automatic rollback to last confirmed server state on error.
 * - Strict session guarding: discards in-flight responses across logout / account switch boundaries.
 * - Immediate deterministic execution for distinct operations (add, remove, clear).
 * - Client-only execution for guests without network overhead.
 * - Active mutation signaling and cross-tab broadcast synchronization.
 */
const useCartDB = () => {
  const {
    addItem,
    updateItemQuantity,
    removeItem,
    emptyCart,
    setItems,
    items,
    getItem,
    inCart,
    totalItems,
    totalUniqueItems,
    cartTotal,
    isEmpty,
  } = useCart();

  const userContext = useContext(UserContext);
  const userInfo = userContext?.userInfo || userContext?.state?.userInfo;
  const authStatus = userContext?.authStatus || userContext?.state?.authStatus;

  const isWholesaler =
    userInfo?.role && String(userInfo.role).toLowerCase() === "wholesaler";

  // Resolve customerId only when authenticated
  const customerId =
    authStatus === "authenticated" && (userInfo?._id || userInfo?.id)
      ? String(userInfo?._id || userInfo?.id)
      : null;

  // Session change tracking & cleanup
  useEffect(() => {
    if (activeSessionCustomerId !== customerId) {
      // Clear pending debounces when user switches or logs out
      mutationTimers.forEach((timer) => clearTimeout(timer));
      mutationTimers.clear();
      mutationVersions.clear();
      globalCartEpoch++;
      inFlightMutationsCount = 0;
      activeSessionCustomerId = customerId;
      lastConfirmedServerCart = customerId ? items : null;
    }
  }, [customerId, items]);

  // Keep lastConfirmedServerCart updated with current items if not set
  useEffect(() => {
    if (customerId && lastConfirmedServerCart === null && items.length > 0) {
      lastConfirmedServerCart = items;
    }
  }, [customerId, items]);

  /**
   * Resolve canonical product/DB id from an item or string.
   */
  const resolveDbProductId = useCallback((itemOrId) => {
    const rawId =
      typeof itemOrId === "string"
        ? itemOrId
        : itemOrId?._id || itemOrId?.productId || itemOrId?.id || null;

    if (!rawId) return null;

    // Strip variant composite suffix if present ("PRODUCT_ID-VARIANT_INFO")
    const dashIdx = String(rawId).indexOf("-");
    return dashIdx !== -1 ? String(rawId).slice(0, dashIdx) : String(rawId);
  }, []);

  /**
   * addItemWithDB(product, quantity)
   *
   * Distinct operation: Not debounced. Cancels any pending update debounce for this product.
   */
  const addItemWithDB = useCallback(
    async (product, quantity = 1) => {
      const qty = Math.max(1, Number(quantity) || 1);

      if (!customerId) {
        // Guest mode: local cart only
        addItem(product, qty);
        return { success: true };
      }

      const dbId = resolveDbProductId(product);
      if (!dbId) {
        console.error("[useCartDB] Cannot add item: missing product ID", product);
        return { success: false, message: "Invalid product ID" };
      }

      // Cancel any pending debounced quantity update for this product
      if (mutationTimers.has(dbId)) {
        clearTimeout(mutationTimers.get(dbId));
        mutationTimers.delete(dbId);
      }

      // Increment version, advance epoch to invalidate in-flight background syncs, and capture state
      globalCartEpoch++;
      const nextVersion = (mutationVersions.get(dbId) || 0) + 1;
      mutationVersions.set(dbId, nextVersion);
      const requestVersion = nextVersion;
      const requestEpoch = globalCartEpoch;
      const requestCustomerId = customerId;

      inFlightMutationsCount++;
      try {
        const res = await CustomerServices.addToCartDB(requestCustomerId, dbId, qty);

        // Session & Concurrency Guard
        if (
          activeSessionCustomerId !== requestCustomerId ||
          globalCartEpoch !== requestEpoch ||
          mutationVersions.get(dbId) !== requestVersion
        ) {
          return { success: false, stale: true };
        }

        const serverCart = res?.cart || res?.data?.cart || [];
        const normalized = normalizeServerCart(serverCart, isWholesaler, items);
        lastConfirmedServerCart = normalized;
        setItems(normalized);
        broadcastCartMutation(requestCustomerId);
        return { success: true, cart: normalized };
      } catch (err) {
        console.error("[useCartDB] addToCartDB failed:", err?.message || err);

        // Rollback if active version
        if (
          activeSessionCustomerId === requestCustomerId &&
          globalCartEpoch === requestEpoch &&
          mutationVersions.get(dbId) === requestVersion
        ) {
          if (lastConfirmedServerCart) {
            setItems(lastConfirmedServerCart);
          }
          notifyError(err?.response?.data?.message || err?.message || "Failed to add item to cart");
        }
        return { success: false, error: err };
      } finally {
        inFlightMutationsCount = Math.max(0, inFlightMutationsCount - 1);
      }
    },
    [customerId, isWholesaler, items, addItem, setItems, resolveDbProductId]
  );

  /**
   * updateQuantityWithDB(itemId, newQuantity)
   *
   * Quantity change: Debounced by 350ms per product to coalesce rapid +/- clicks.
   * Provides immediate optimistic UI feedback with version-aware rollback.
   */
  const updateQuantityWithDB = useCallback(
    async (itemId, newQuantity) => {
      const qty = Number(newQuantity);

      if (!customerId) {
        // Guest mode: local cart only
        if (qty <= 0) {
          removeItem(itemId);
        } else {
          updateItemQuantity(itemId, qty);
        }
        return { success: true };
      }

      const dbId = resolveDbProductId(itemId);
      if (!dbId) {
        console.error("[useCartDB] Cannot update item: missing product ID", itemId);
        return { success: false, message: "Invalid product ID" };
      }

      // 1. Immediate optimistic UI update for instant responsive feedback
      if (qty <= 0) {
        removeItem(itemId);
      } else {
        updateItemQuantity(itemId, qty);
      }

      // 2. Cancel existing debounce timer for this product
      if (mutationTimers.has(dbId)) {
        clearTimeout(mutationTimers.get(dbId));
        mutationTimers.delete(dbId);
      }

      // 3. Monotonic version increment per product and epoch bump
      globalCartEpoch++;
      const nextVersion = (mutationVersions.get(dbId) || 0) + 1;
      mutationVersions.set(dbId, nextVersion);
      const requestVersion = nextVersion;
      const requestEpoch = globalCartEpoch;
      const requestCustomerId = customerId;
      const targetQty = qty;

      // 4. Schedule debounced API mutation (350ms)
      const timer = setTimeout(async () => {
        mutationTimers.delete(dbId);

        inFlightMutationsCount++;
        try {
          const res = await CustomerServices.updateCartItemDB(requestCustomerId, dbId, targetQty);

          // Session Guard: Verify user hasn't logged out or switched accounts
          if (activeSessionCustomerId !== requestCustomerId || globalCartEpoch !== requestEpoch) {
            return;
          }

          // Version Guard: Verify response belongs to the latest mutation for this product
          if (mutationVersions.get(dbId) !== requestVersion) {
            return; // Out-of-order / stale response discarded
          }

          const serverCart = res?.cart || res?.data?.cart || [];
          const normalized = normalizeServerCart(serverCart, isWholesaler, items);
          lastConfirmedServerCart = normalized;
          setItems(normalized);
          broadcastCartMutation(requestCustomerId);
        } catch (err) {
          console.error("[useCartDB] updateCartItemDB failed:", err?.message || err);

          // Rollback Guard: Only rollback if this is still the active version and session
          if (
            activeSessionCustomerId === requestCustomerId &&
            globalCartEpoch === requestEpoch &&
            mutationVersions.get(dbId) === requestVersion
          ) {
            if (lastConfirmedServerCart) {
              setItems(lastConfirmedServerCart);
            }
            notifyError(err?.response?.data?.message || err?.message || "Failed to update cart quantity");
          }
        } finally {
          inFlightMutationsCount = Math.max(0, inFlightMutationsCount - 1);
        }
      }, 350);

      mutationTimers.set(dbId, timer);
      return { success: true, optimistic: true };
    },
    [customerId, isWholesaler, items, removeItem, updateItemQuantity, setItems, resolveDbProductId]
  );

  /**
   * removeItemWithDB(itemId)
   *
   * Distinct operation: Not debounced. Cancels pending debounce timer for this product.
   */
  const removeItemWithDB = useCallback(
    async (itemId) => {
      if (!customerId) {
        // Guest mode: local cart only
        removeItem(itemId);
        return { success: true };
      }

      const dbId = resolveDbProductId(itemId);
      if (!dbId) {
        console.error("[useCartDB] Cannot remove item: missing product ID", itemId);
        return { success: false, message: "Invalid product ID" };
      }

      // Cancel any pending debounced quantity update for this product
      if (mutationTimers.has(dbId)) {
        clearTimeout(mutationTimers.get(dbId));
        mutationTimers.delete(dbId);
      }

      // Optimistically remove from UI
      removeItem(itemId);

      globalCartEpoch++;
      const nextVersion = (mutationVersions.get(dbId) || 0) + 1;
      mutationVersions.set(dbId, nextVersion);
      const requestVersion = nextVersion;
      const requestEpoch = globalCartEpoch;
      const requestCustomerId = customerId;

      inFlightMutationsCount++;
      try {
        const res = await CustomerServices.removeFromCartDB(requestCustomerId, dbId);

        // Session & Concurrency Guard
        if (
          activeSessionCustomerId !== requestCustomerId ||
          globalCartEpoch !== requestEpoch ||
          mutationVersions.get(dbId) !== requestVersion
        ) {
          return { success: false, stale: true };
        }

        const serverCart = res?.cart || res?.data?.cart || [];
        const normalized = normalizeServerCart(serverCart, isWholesaler, items);
        lastConfirmedServerCart = normalized;
        setItems(normalized);
        broadcastCartMutation(requestCustomerId);
        return { success: true, cart: normalized };
      } catch (err) {
        console.error("[useCartDB] removeFromCartDB failed:", err?.message || err);

        // Rollback if active version
        if (
          activeSessionCustomerId === requestCustomerId &&
          globalCartEpoch === requestEpoch &&
          mutationVersions.get(dbId) === requestVersion
        ) {
          if (lastConfirmedServerCart) {
            setItems(lastConfirmedServerCart);
          }
          notifyError(err?.response?.data?.message || err?.message || "Failed to remove item from cart");
        }
        return { success: false, error: err };
      } finally {
        inFlightMutationsCount = Math.max(0, inFlightMutationsCount - 1);
      }
    },
    [customerId, isWholesaler, items, removeItem, setItems, resolveDbProductId]
  );

  /**
   * clearCartWithDB()
   *
   * Distinct operation: Not debounced. Cancels all pending debounce timers across all products.
   */
  const clearCartWithDB = useCallback(async () => {
    if (!customerId) {
      // Guest mode: local cart only
      emptyCart();
      return { success: true };
    }

    // Cancel all active debounce timers across all products
    mutationTimers.forEach((timer) => clearTimeout(timer));
    mutationTimers.clear();
    mutationVersions.clear();

    // Increment global epoch to invalidate all in-flight product requests
    globalCartEpoch++;
    const requestEpoch = globalCartEpoch;
    const requestCustomerId = customerId;

    // Optimistically empty local store
    emptyCart();

    inFlightMutationsCount++;
    try {
      await CustomerServices.clearCartDB(requestCustomerId);

      if (activeSessionCustomerId !== requestCustomerId || globalCartEpoch !== requestEpoch) {
        return { success: false, stale: true };
      }

      lastConfirmedServerCart = [];
      emptyCart();
      broadcastCartMutation(requestCustomerId);
      return { success: true };
    } catch (err) {
      console.error("[useCartDB] clearCartDB failed:", err?.message || err);

      if (activeSessionCustomerId === requestCustomerId && globalCartEpoch === requestEpoch) {
        if (lastConfirmedServerCart) {
          setItems(lastConfirmedServerCart);
        }
        notifyError(err?.response?.data?.message || err?.message || "Failed to clear cart");
      }
      return { success: false, error: err };
    } finally {
      inFlightMutationsCount = Math.max(0, inFlightMutationsCount - 1);
    }
  }, [customerId, emptyCart, setItems]);

  return {
    addItemWithDB,
    updateQuantityWithDB,
    removeItemWithDB,
    clearCartWithDB,
    // Base cart state
    items,
    getItem,
    inCart,
    totalItems,
    totalUniqueItems,
    cartTotal,
    isEmpty,
    customerId,
    isWholesaler,
  };
};

export default useCartDB;


