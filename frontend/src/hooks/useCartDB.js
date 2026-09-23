import { useCallback, useContext } from "react";
import { useCart } from "react-use-cart";
import { UserContext } from "@context/UserContext";
import CustomerServices from "@services/CustomerServices";

/**
 * useCartDB
 *
 * Wraps every cart mutation so it updates both:
 *  - The local react-use-cart store (used for immediate UI rendering)
 *  - The MongoDB Customer.cart array (persisted per user in the database)
 *
 * Guest users (not logged in) only get local-cart updates.
 */
const useCartDB = () => {
    const {
        addItem,
        updateItemQuantity,
        removeItem,
        emptyCart,
        items,
        getItem,
    } = useCart();

    const userContext = useContext(UserContext);
    const userInfo = userContext?.userInfo || userContext?.state?.userInfo;
    const authStatus = userContext?.authStatus || userContext?.state?.authStatus;

    // Resolve customerId only when authenticated – supports both _id and id fields
    const customerId =
        authStatus === "authenticated" && (userInfo?._id || userInfo?.id)
            ? userInfo?._id || userInfo?.id
            : null;

    // ─── Helpers ────────────────────────────────────────────────────────────────

    /**
     * Resolve the canonical product/DB id from an item.
     * react-use-cart items may have an id that is either the raw MongoDB _id
     * or a variant composite string like "PRODUCT_ID-VARIANT_INFO".
     * For variant items we extract the base id portion.
     */
    const resolveDbProductId = useCallback((itemOrId) => {
        const rawId =
            typeof itemOrId === "string"
                ? itemOrId
                : itemOrId?._id || itemOrId?.productId || itemOrId?.id || null;

        if (!rawId) return null;

        // Variant ids are of the form "PRODUCT_ID-SOMETHING" — extract prefix
        const dashIdx = String(rawId).indexOf("-");
        return dashIdx !== -1 ? String(rawId).slice(0, dashIdx) : String(rawId);
    }, []);

    // ─── DB-synced actions ───────────────────────────────────────────────────────

    /**
     * addItemWithDB(product, quantity)
     *
     * Adds quantity units of `product` to local cart AND to the DB.
     * `product` must have at minimum an `id` (or `_id`) field recognised by
     * react-use-cart.
     */
    const addItemWithDB = useCallback(
        async (product, quantity = 1) => {
            // 1. Update local cart immediately (optimistic)
            addItem(product, quantity);

            // 2. Persist to DB if user is logged in
            if (customerId) {
                const dbId = resolveDbProductId(product);
                if (dbId) {
                    try {
                        await CustomerServices.addToCartDB(customerId, dbId, quantity);
                    } catch (err) {
                        console.error("[useCartDB] addToCartDB failed:", err?.message || err);
                    }
                }
            }
        },
        [addItem, customerId, resolveDbProductId]
    );

    /**
     * updateQuantityWithDB(itemId, newQuantity)
     *
     * Sets the quantity of an item in both local cart and DB.
     * If newQuantity <= 0, the item is removed from both.
     */
    const updateQuantityWithDB = useCallback(
        async (itemId, newQuantity) => {
            // 1. Update local cart immediately (optimistic)
            if (newQuantity <= 0) {
                removeItem(itemId);
            } else {
                updateItemQuantity(itemId, newQuantity);
            }

            // 2. Persist to DB if user is logged in
            if (customerId) {
                const dbId = resolveDbProductId(itemId);
                if (dbId) {
                    try {
                        await CustomerServices.updateCartItemDB(customerId, dbId, newQuantity);
                    } catch (err) {
                        console.error("[useCartDB] updateCartItemDB failed:", err?.message || err);
                    }
                }
            }
        },
        [updateItemQuantity, removeItem, customerId, resolveDbProductId]
    );

    /**
     * removeItemWithDB(itemId)
     *
     * Removes an item from both local cart and DB.
     */
    const removeItemWithDB = useCallback(
        async (itemId) => {
            // 1. Update local cart immediately (optimistic)
            removeItem(itemId);

            // 2. Persist to DB if user is logged in
            if (customerId) {
                const dbId = resolveDbProductId(itemId);
                if (dbId) {
                    try {
                        await CustomerServices.removeFromCartDB(customerId, dbId);
                    } catch (err) {
                        console.error("[useCartDB] removeFromCartDB failed:", err?.message || err);
                    }
                }
            }
        },
        [removeItem, customerId, resolveDbProductId]
    );

    /**
     * clearCartWithDB()
     *
     * Clears ALL items from both local cart and the DB.
     */
    const clearCartWithDB = useCallback(async () => {
        // 1. Update local cart immediately (optimistic)
        emptyCart();

        // 2. Persist to DB if user is logged in
        if (customerId) {
            try {
                await CustomerServices.clearCartDB(customerId);
            } catch (err) {
                console.error("[useCartDB] clearCartDB failed:", err?.message || err);
            }
        }
    }, [emptyCart, customerId]);

    return {
        addItemWithDB,
        updateQuantityWithDB,
        removeItemWithDB,
        clearCartWithDB,
        // Expose base cart state for convenience
        items,
        getItem,
        customerId,
    };
};

export default useCartDB;
