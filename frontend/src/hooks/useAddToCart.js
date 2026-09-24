import { useState, useContext } from "react";
import { useCart } from "react-use-cart";
import { UserContext } from "@context/UserContext";
import { notifyError, notifySuccess } from "@utils/toast";
import useCartDB from "@hooks/useCartDB";

const useAddToCart = () => {
  const [item, setItem] = useState(1);
  const { items } = useCart();
  const { addItemWithDB, updateQuantityWithDB } = useCartDB();

  const userContext = useContext(UserContext);
  const userInfo = userContext?.userInfo || userContext?.state?.userInfo;
  const isWholesalerUser =
    userInfo?.role &&
    String(userInfo.role).toLowerCase() === "wholesaler";

  // Helper: return available stock number
  const getAvailableStock = (product) => {
    if (!product) return Number.MAX_SAFE_INTEGER;
    if (isWholesalerUser) return Number.MAX_SAFE_INTEGER;
    if (product?.variants?.length > 0) {
      if (
        product?.variant &&
        typeof product.variant.quantity === "number"
      )
        return Number(product.variant.quantity);
      if (
        product?.variants[0] &&
        typeof product.variants[0].quantity === "number"
      )
        return Number(product.variants[0].quantity);
    }
    if (typeof product?.stock === "number") return Number(product.stock);
    return Number.MAX_SAFE_INTEGER;
  };

  /**
   * handleAddItem
   * Adds a product to the local cart AND persists it to the database if authenticated.
   */
  const handleAddItem = async (product, qty) => {
    const quantityToAdd = typeof qty === "number" ? qty : item;
    const targetId = product.id || product._id;
    const result = items.find((i) => i.id === targetId || i.productId === targetId);

    const { variants, categories, description, ...updatedProduct } = product;

    const minQuantity = isWholesalerUser
      ? product?.minQuantity
        ? Number(product.minQuantity)
        : 1
      : 1;

    const effectivePrice =
      isWholesalerUser &&
        product?.wholePrice &&
        Number(product.wholePrice) > 0
        ? Number(product.wholePrice)
        : product.prices?.price ||
        product.prices?.originalPrice ||
        product.price ||
        0;

    updatedProduct.id = targetId;
    updatedProduct.productId = product._id || product.id;
    updatedProduct.minQuantity = minQuantity;
    updatedProduct.price = effectivePrice;
    updatedProduct.stock =
      product?.stock !== undefined
        ? product.stock
        : product?.variants && product.variants[0]
          ? product.variants[0].quantity
          : undefined;
    updatedProduct.wholePrice = product?.wholePrice;

    const available = getAvailableStock(product);
    const titleText =
      typeof product.title === "object"
        ? product.title?.en || "Product"
        : product.title || "Product";

    if (result !== undefined) {
      if (result?.quantity + quantityToAdd <= available) {
        const res = await addItemWithDB(updatedProduct, quantityToAdd);
        if (res?.success) {
          notifySuccess(`${quantityToAdd} ${titleText} added to cart!`);
        }
      } else {
        notifyError("Insufficient stock!");
      }
    } else {
      if (quantityToAdd <= available) {
        const res = await addItemWithDB(updatedProduct, quantityToAdd);
        if (res?.success) {
          notifySuccess(`${quantityToAdd} ${titleText} added to cart!`);
        }
      } else {
        notifyError("Insufficient stock!");
      }
    }
  };

  /**
   * handleIncreaseQuantity
   * Increments quantity by 1, updating both local cart and DB.
   */
  const handleIncreaseQuantity = async (product) => {
    const targetId = product.id || product._id;
    const result = items?.find((p) => p.id === targetId || p.productId === targetId);
    const available = getAvailableStock(product);

    if (result) {
      if (result?.quantity + 1 <= available) {
        await updateQuantityWithDB(targetId, result.quantity + 1);
      } else {
        notifyError("Insufficient stock!");
      }
    } else {
      await handleAddItem(product, 1);
    }
  };

  return {
    setItem,
    item,
    handleAddItem,
    handleIncreaseQuantity,
  };
};

export default useAddToCart;