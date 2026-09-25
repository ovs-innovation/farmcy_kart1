import { useContext } from "react";
import Link from "next/link";
import { useCart } from "react-use-cart";
import { FiPlus, FiMinus, FiTrash2 } from "react-icons/fi";
import Image from "next/image";

//internal import
import useAddToCart from "@hooks/useAddToCart";
import useCartDB from "@hooks/useCartDB";
import { SidebarContext } from "@context/SidebarContext";
import { UserContext } from "@context/UserContext";
import { notifyError } from "@utils/toast";

const CartItem = ({
  item,
  currency = "₹",
  showCheckbox = false,
  isSelected = false,
  onToggleSelect = () => {},
}) => {
  const { closeCartDrawer } = useContext(SidebarContext);
  const { handleIncreaseQuantity } = useAddToCart();
  const { updateQuantityWithDB, removeItemWithDB } = useCartDB();
  const { state } = useContext(UserContext) || {};
  const isWholesaler =
    state?.userInfo?.role &&
    state.userInfo.role.toString().toLowerCase() === "wholesaler";

  // Calculate MRP and discount - Check multiple possible price fields (only for non-wholesalers)
  const originalPrice =
    item.originalPrice ||
    item.mrp ||
    item.prices?.original ||
    item.price * 1.2; // Add 20% markup as fallback
  const currentPrice = item.price || item.prices?.sale || 0;
  const discount = originalPrice > currentPrice ? originalPrice - currentPrice : 0;
  const discountPercentage =
    originalPrice > currentPrice
      ? ((discount / originalPrice) * 100).toFixed(0)
      : 0;

  /**
   * Handle decrease quantity — updates local cart + DB.
   * Enforces minQuantity constraint.
   */
  const handleDecrease = async () => {
    const minQty = item?.minQuantity ? Number(item.minQuantity) : 1;
    if (item.quantity - 1 < minQty) {
      notifyError(`Minimum quantity is ${minQty}`);
      return;
    }
    await updateQuantityWithDB(item.id, item.quantity - 1);
  };

  /**
   * Handle remove — removes from local cart + DB.
   */
  const handleRemove = async () => {
    await removeItemWithDB(item.id);
  };

  return (
    <div
      className={`group w-full h-auto flex justify-start items-start bg-white py-4 px-4 mb-3 rounded-xl border ${
        showCheckbox && isSelected
          ? "border-store-500 ring-1 ring-store-500/20 bg-store-50/10"
          : "border-gray-200 hover:border-emerald-300"
      } shadow-md hover:shadow-xl transition-all duration-300 relative`}
    >
      {/* Checkbox for selective checkout */}
      {showCheckbox && (
        <div className="flex items-center self-center mr-3 flex-shrink-0">
          <input
            type="checkbox"
            id={`select-cart-item-${item.id}`}
            checked={isSelected}
            onChange={onToggleSelect}
            aria-label={`Select ${item.title}`}
            className="h-5 w-5 text-store-600 focus:ring-store-500 border-gray-300 rounded cursor-pointer transition-all"
          />
        </div>
      )}

      {/* Enhanced Image Container */}
      <div className="relative flex rounded-xl border-2 border-gray-100 shadow-sm hover:shadow-md overflow-hidden flex-shrink-0 cursor-pointer mr-4 transition-all duration-300 group-hover:border-emerald-200 bg-gray-50">
        <Image
          key={item.id}
          src={
            (Array.isArray(item.image) ? item.image[0] : item.image) ||
            (Array.isArray(item.images) ? item.images[0] : item.images) ||
            "https://res.cloudinary.com/ahossain/image/upload/v1655097002/placeholder_kvepfp.png"
          }
          width={70}
          height={70}
          alt={item.title}
          className="object-cover"
        />
      </div>

      {/* Content Section */}
      <div className="flex flex-col w-full overflow-hidden flex-1">
        {/* Product Title */}
        <Link
          href={`/product/${item.slug || item.id || item._id}`}
          onClick={closeCartDrawer}
          className="truncate text-sm md:text-base font-semibold text-gray-800 hover:text-emerald-600 transition-colors duration-200 line-clamp-2 mb-1.5"
        >
          {item.title}
        </Link>

        {/* MRP and Discount Badge - Hidden for wholesalers */}
        {!isWholesaler && originalPrice > currentPrice && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-gray-500 line-through font-medium">
              MRP: {currency}{originalPrice.toFixed(2)}
            </span>
            <span className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-2 py-0.5 rounded-full text-xs font-bold shadow-sm">
              {discountPercentage}% OFF
            </span>
          </div>
        )}

        {/* Item Price - Hidden for wholesalers */}
        {!isWholesaler && (
          <span className="text-xs text-gray-500 mb-2 font-medium">
            Unit Price:{" "}
            <span className="text-emerald-600 font-semibold">
              {currency}{item.price.toFixed(2)}
            </span>
          </span>
        )}

        {/* Bottom Section: Price, Quantity, Delete */}
        <div className="flex items-center justify-between mt-auto pt-2">
          {/* Total Price */}
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 font-medium">Total</span>
            <span className="font-bold text-base md:text-lg text-gray-900 leading-tight">
              {currency}{(item.price * item.quantity).toFixed(2)}
            </span>
          </div>

          {/* Quantity Controls */}
          <div className="flex items-center gap-2">
            <div className="h-9 flex items-center justify-center p-1 border-2 border-emerald-300 bg-white hover:border-emerald-300 text-gray-700 rounded-lg transition-all duration-200 shadow-sm">
              <button
                onClick={handleDecrease}
                className="h-full px-2 hover:bg-gray-100 rounded-md transition-colors duration-150 active:scale-95"
              >
                <FiMinus className="text-gray-600" />
              </button>

              <span className="text-sm font-bold text-gray-800 px-3 min-w-[2rem] text-center">
                {item.quantity}
              </span>

              <button
                onClick={() => handleIncreaseQuantity(item)}
                className="h-full px-2 hover:bg-emerald-50 rounded-md transition-colors duration-150 active:scale-95"
              >
                <FiPlus className="text-emerald-600" />
              </button>
            </div>

            {/* Delete Button */}
            <button
              onClick={handleRemove}
              className="h-9 w-9 flex items-center justify-center hover:bg-red-50 text-red-400 hover:text-red-600 rounded-lg cursor-pointer transition-all duration-200 active:scale-95"
              aria-label="Remove item"
            >
              <FiTrash2 className="text-lg" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartItem;