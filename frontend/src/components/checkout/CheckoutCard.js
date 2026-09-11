import Image from "next/image";
import { useCart } from "react-use-cart";
import { FiPlus, FiMinus } from "react-icons/fi";

//internal imports
import useGetSetting from "@hooks/useGetSetting";
import { notifyError } from "@utils/toast";

const CheckoutCard = ({ item }) => {
  const { updateItemQuantity } = useCart();

  const { globalSetting } = useGetSetting();

  const currency = globalSetting?.default_currency || "₹";

  return (
    <div
      key={item.id}
      className="group w-full h-auto flex justify-start items-center py-2 px-5 border-b hover:bg-white transition-all border-gray-100 relative last:border-b-0"
    >
      <div className="relative flex rounded-md overflow-hidden flex-shrink-0 cursor-pointer mr-4">
        <Image
          src={
            (Array.isArray(item.image) ? item.image[0] : item.image) ||
            (Array.isArray(item.images) ? item.images[0] : item.images) ||
            "https://res.cloudinary.com/ahossain/image/upload/v1655097002/placeholder_kvepfp.png"
          }
          width={50}
          height={50}
          alt={item.title}
        />
      </div>
      <div className="flex flex-col w-full overflow-hidden">
        <div className="flex items-center justify-between">
          <p className="mb-0">
            <span className="text-sm font-medium text-gray-700 text-heading line-clamp-1">
              {item?.title?.substring(0, 5)}
            </span>
            <span className="text-xs text-gray-400 mb-2">
              Item Price{currency}
              {item.price.toFixed(2)}
            </span>
          </p>
          <div className="h-8 w-20 flex flex-wrap items-center justify-evenly p-1 border border-gray-100 bg-white text-gray-600 rounded-md">
            <div
              className={`cursor-pointer ${item?.minQuantity && item.quantity <= Number(item.minQuantity) ? 'opacity-50 pointer-events-none' : ''}`}
              onClick={() => {
                const minQty = item?.minQuantity ? Number(item.minQuantity) : 1;
                if (item.quantity - 1 < minQty) {
                  notifyError(`Minimum quantity is ${minQty}`);
                  return;
                }
                updateItemQuantity(item.id, item.quantity - 1);
              }}
            >
              <span className="text-dark text-base">
                <FiMinus />
              </span>
            </div>
            <p className="text-sm font-semibold text-dark px-1">
              {item.quantity}
            </p>
            <div
              className="cursor-pointer"
              onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
            >
              <span className="text-dark text-base">
                <FiPlus />
              </span>
            </div>
          </div>

          <div className="font-bold text-sm text-heading leading-5">
            <span>{currency}{(item.price * item.quantity).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutCard;
