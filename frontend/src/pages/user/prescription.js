import React, { useContext, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCart } from "react-use-cart";
import Link from "next/link";
import Image from "next/image";
import { FiTrash2, FiShoppingCart } from "react-icons/fi";

// internal imports
import Dashboard from "@pages/user/dashboard";
import CustomerServices from "@services/CustomerServices";
import { UserContext } from "@context/UserContext";
import Loading from "@components/preloader/Loading";
import { notifySuccess, notifyError } from "@utils/toast";
import useUtilsFunction from "@hooks/useUtilsFunction";
import PrescriptionStatus from "@components/prescription/PrescriptionStatus";

const Prescription = () => {
  const {
    state: { userInfo },
  } = useContext(UserContext);
  const isWholesaler = userInfo?.role && String(userInfo.role).toLowerCase() === 'wholesaler';
  const { removeItem } = useCart();
  const queryClient = useQueryClient();
  const { showingTranslateValue, currency, getNumberTwo } = useUtilsFunction();

  const { data: customer, isLoading, refetch } = useQuery({
    queryKey: ["customer", userInfo?._id],
    queryFn: () => CustomerServices.getCustomerById(userInfo?._id),
    enabled: !!userInfo?._id,
  });

  const updateCustomerMutation = useMutation({
    mutationFn: (data) => CustomerServices.updateCustomer(userInfo?._id, data),
    onSuccess: (data) => {
      notifySuccess("Item removed from cart successfully!");
      queryClient.invalidateQueries(["customer", userInfo?._id]);
    },
    onError: (err) => {
      notifyError(err?.response?.data?.message || "Something went wrong!");
    },
  });

  const handleRemoveItem = async (productId) => {
    if (!customer?.cart) return;

    // Defensive: only consider cart entries with a populated productId and valid _id
    const updatedCart = customer.cart
      .filter((item) => item.productId && item.productId._id && item.productId._id !== productId)
      .map((item) => ({
        productId: item.productId._id,
        quantity: item.quantity,
      }));

    // Remove from local cart as well
    removeItem(productId);

    updateCustomerMutation.mutate({ cart: updatedCart });
  };

  return (
    <Dashboard title="Prescription" description="Manage your prescriptions and added products">
      <div className="overflow-hidden rounded-md font-serif">
        <div className="flex flex-col">

          <PrescriptionStatus userId={userInfo?._id} />

          <h2 className="text-xl font-serif font-semibold my-5">Added Products</h2>
          {isLoading ? (
            <Loading loading={isLoading} />
          ) : customer?.cart?.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {customer.cart.map((item) => (
                item.productId && (
                  <div
                    key={item._id}
                    className="flex items-center justify-between p-4 bg-white shadow-sm rounded-md border border-gray-100"
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative w-16 h-16 rounded-md overflow-hidden border border-gray-200">
                        <Image
                          src={
                            item.productId.image[0] ||
                            "https://res.cloudinary.com/ahossain/image/upload/v1655097002/placeholder_kvepfp.png"
                          }
                          fill
                          className="object-cover"
                          sizes="64px"
                          alt={showingTranslateValue(item.productId.title)}
                        />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-800">
                          <Link
                            href={`/product/${item.productId.slug}`}
                            className="hover:text-green-600 transition-colors"
                          >
                            {showingTranslateValue(item.productId.title)}
                          </Link>
                        </h3>
                        <p className="text-sm text-gray-500">
                          Quantity: {item.quantity}
                        </p>
                        <p className="font-bold text-gray-800">
                          {currency}
                          {isWholesaler && item.productId?.wholePrice && Number(item.productId.wholePrice) > 0
                            ? getNumberTwo(Number(item.productId.wholePrice))
                            : getNumberTwo(item.productId.prices?.price || 0)}

                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveItem(item.productId._id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                      title="Remove from cart"
                    >
                      <FiTrash2 size={20} />
                    </button>
                  </div>
                )
              ))}
            </div>
          ) : (
            <div className="text-center p-8 bg-gray-50 rounded-md">
              <FiShoppingCart className="mx-auto text-gray-400 mb-3" size={40} />
              <p className="text-gray-500">No products added yet.</p>
            </div>
          )}
        </div>
      </div>
    </Dashboard>
  );
};

export default Prescription;
