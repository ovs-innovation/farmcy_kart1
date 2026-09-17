const WISHLIST_KEY = "wishlist";
const WISHLIST_EVENT = "wishlist:changed";

export function getWishlistItems() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(WISHLIST_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setWishlistItems(items) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(items));
  // storage event won't fire in the same tab; dispatch our own signal
  window.dispatchEvent(new Event(WISHLIST_EVENT));
}

export function isInWishlist(productId) {
  if (!productId) return false;
  return getWishlistItems().some((item) => String(item?._id) === String(productId));
}

export function addToWishlist(product) {
  if (!product?._id) return { ok: false, reason: "invalid" };

  const wishlist = getWishlistItems();
  const exists = wishlist.some((item) => String(item?._id) === String(product._id));
  if (exists) return { ok: false, reason: "exists" };

  setWishlistItems([...wishlist, product]);
  return { ok: true };
}

export function removeFromWishlist(productId) {
  if (!productId) return { ok: false, reason: "invalid" };

  const wishlist = getWishlistItems();
  const next = wishlist.filter((item) => String(item?._id) !== String(productId));
  setWishlistItems(next);
  return { ok: true };
}

export function subscribeWishlist(callback) {
  if (typeof window === "undefined") return () => {};

  const handler = () => callback();
  // other tabs
  window.addEventListener("storage", handler);
  // same tab
  window.addEventListener(WISHLIST_EVENT, handler);

  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(WISHLIST_EVENT, handler);
  };
}


