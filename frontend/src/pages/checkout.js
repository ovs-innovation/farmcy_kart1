import React,{useState, useRef, useContext, useEffect} from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  IoReturnUpBackOutline,
  IoArrowForward,
  IoBagHandle,
  IoWalletSharp,
  IoClose,
  IoChevronForward,
  IoLocationOutline
} from "react-icons/io5";
import { FiLoader } from "react-icons/fi";
import { useQuery } from "@tanstack/react-query";
import { ImCreditCard } from "react-icons/im";
import useTranslation from "next-translate/useTranslation";
import { getUserSession } from "@lib/auth";

//internal import

import Layout from "@layout/Layout";
import Label from "@components/form/Label";
import Error from "@components/form/Error";
import CartItem from "@components/cart/CartItem";
import InputArea from "@components/form/InputArea";
import useGetSetting from "@hooks/useGetSetting";
import InputShipping from "@components/form/InputShipping";
import InputPayment from "@components/form/InputPayment";
import useCheckoutSubmit from "@hooks/useCheckoutSubmit";
import useUtilsFunction from "@hooks/useUtilsFunction";
import SettingServices from "@services/SettingServices";
import CustomerServices from "@services/CustomerServices";
import LocationServices from "@services/LocationServices";
import SwitchToggle from "@components/form/SwitchToggle";
import { notifySuccess, notifyError } from "@utils/toast";
import { UserContext } from "@context/UserContext";
import { isProfileComplete, getDisplayEmail } from "@utils/profileAuth";

const Checkout = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const formRef = useRef(null);
  const [portalReady, setPortalReady] = useState(false);
  const [addressForm, setAddressForm] = useState({
    name: "",
    address: "",
    city: "",
    country: "",
    zipCode: "",
    phone: "",
    addressType: "Home",
    isDefault: false
  });
  const userInfo = getUserSession();
  const { showingTranslateValue, currency } = useUtilsFunction();

  useEffect(() => {
    if (!userInfo?.token) {
      router.replace("/auth/login?redirectUrl=checkout");
      return;
    }
  }, [userInfo, router]);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!showAddressModal) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showAddressModal]);
  const { storeCustomizationSetting } = useGetSetting();
  const { state } = useContext(UserContext) || {};
  const isWholesaler = state?.userInfo?.role && state.userInfo.role.toString().toLowerCase() === "wholesaler";

  const { data: storeSetting } = useQuery({
    queryKey: ["storeSetting"],
    queryFn: async () => await SettingServices.getStoreSetting(),
    staleTime: 4 * 60 * 1000, // Api request after 4 minutes
  });

  // Fetch user's shipping addresses
  const { data: shippingAddressesResponse, refetch: refetchAddresses } = useQuery({
    queryKey: ["shippingAddresses", userInfo?._id],
    queryFn: async () => {
      if (!userInfo?._id) return null;
      const response = await CustomerServices.getShippingAddress({ userId: userInfo._id });
      return response?.shippingAddress || [];
    },
    enabled: !!userInfo?._id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Normalize shippingAddresses to always be an array
  const shippingAddresses = Array.isArray(shippingAddressesResponse) 
    ? shippingAddressesResponse 
    : shippingAddressesResponse 
      ? [shippingAddressesResponse] 
      : [];

  // Set default selected address on load
  React.useEffect(() => {
    if (shippingAddresses && shippingAddresses.length > 0 && !selectedAddress) {
      const defaultAddress = shippingAddresses.find(addr => addr.isDefault) || shippingAddresses[0];
      setSelectedAddress(defaultAddress);
    }
  }, [shippingAddresses]);

  const {
    error,
    couponInfo,
    couponRef,
    total,
    isEmpty,
    items,
    cartTotal,
    register,
    errors,
    watch,
    showCard,
    setShowCard,
    handleSubmit,
    submitHandler,
    handleShippingCost,
    handleCouponCode,
    discountAmount,
    shippingCost,
    isCheckoutSubmit,
    useExistingAddress,
    hasShippingAddress,
    isCouponAvailable,
    availableCoupons,
    selectedCouponCode,
    setSelectedCouponCode,
    handleDefaultShippingAddress,
    taxSummary,
    setValue,
    isCouponApplied,
    handleRemoveCoupon,
  } = useCheckoutSubmit(storeSetting);

  const selectedPaymentMethod = watch("paymentMethod");

  // Update form values when selected address changes
  React.useEffect(() => {
    if (selectedAddress && setValue) {
      const nameParts = (selectedAddress.name || "").split(" ");
      setValue("firstName", nameParts[0] || "");
      setValue("lastName", nameParts.slice(1).join(" ") || "");
      setValue("email", getDisplayEmail(userInfo) || "");
      setValue("contact", selectedAddress.phone || "");
      setValue("address", selectedAddress.address || "");
      setValue("address2", "");
      setValue("city", selectedAddress.city || "");
      setValue("state", selectedAddress.country || "");
      setValue("country", selectedAddress.country || "India");
      setValue("zipCode", selectedAddress.zipCode || "");
    }
  }, [selectedAddress, setValue, userInfo]);

  // Calculate totals for order summary
  const calculateTotals = () => {
    // For wholesalers, no discount calculation - only show subtotal
    if (isWholesaler) {
      return {
        totalMRP: 0,
        totalDiscount: 0,
        subtotal: cartTotal,
        taxAmount: taxSummary?.exclusiveTax || 0,
        total: parseFloat(total)
      };
    }
    
    let totalMRP = 0;
    let totalDiscount = 0;
    
    items.forEach(item => {
      const originalPrice = item.originalPrice || item.mrp || item.prices?.original || (item.price * 1.2);
      const currentPrice = item.price || item.prices?.sale || 0;
      const quantity = item.quantity || 1;
      
      totalMRP += originalPrice * quantity;
      totalDiscount += (originalPrice - currentPrice) * quantity;
    });
    
    return {
      totalMRP,
      totalDiscount,
      subtotal: cartTotal,
      taxAmount: taxSummary?.exclusiveTax || 0,
      total: parseFloat(total)
    };
  };

  // Handle address form input changes
  const handleAddressChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAddressForm({
      ...addressForm,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Auto fetch location by pincode
  React.useEffect(() => {
    const fetchLocation = async () => {
      if (addressForm.zipCode && addressForm.zipCode.length === 6 && /^\d+$/.test(addressForm.zipCode)) {
        try {
          const response = await fetch(`https://api.postalpincode.in/pincode/${addressForm.zipCode}`);
          const data = await response.json();
          if (data && data[0] && data[0].Status === "Success" && data[0].PostOffice && data[0].PostOffice.length > 0) {
            const postOffice = data[0].PostOffice[0];
            setAddressForm(prev => ({
              ...prev,
              city: postOffice.District || postOffice.Block || postOffice.Name,
              country: postOffice.State
            }));
            notifySuccess(`Location fetched: ${postOffice.District || postOffice.Block || postOffice.Name}, ${postOffice.State}`);
          }
        } catch (error) {
          console.error("Error fetching location details:", error);
        }
      }
    };
    
    const timeoutId = setTimeout(() => {
      fetchLocation();
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [addressForm.zipCode]);

  // Handle Use Current Location
  const handleUseCurrentLocation = async () => {
    if (!navigator.geolocation) {
      notifyError("Geolocation is not supported by your browser");
      return;
    }

    setIsLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const geocodeData = await LocationServices.getReverseGeocode({ lat: latitude, lng: longitude });

          if (geocodeData.status === 'OK' && geocodeData.results && geocodeData.results.length > 0) {
            const result = geocodeData.results[0];
            
            // Extract address components
            let street = "";
            let city = "";
            let state = "";
            let zip = "";

            // Street address parts
            const streetNumber = result.address_components.find(c => c.types.includes("street_number"))?.long_name || "";
            const route = result.address_components.find(c => c.types.includes("route"))?.long_name || "";
            const sublocality = result.address_components.find(c => c.types.includes("sublocality"))?.long_name || "";
            
            street = [streetNumber, route, sublocality].filter(Boolean).join(", ");
            
            // If street is still empty, use formatted_address part
            if (!street) {
                street = result.formatted_address.split(",")[0];
            }

            city = result.address_components.find(c => c.types.includes("locality"))?.long_name || "";
            state = result.address_components.find(c => c.types.includes("administrative_area_level_1"))?.long_name || "";
            zip = result.address_components.find(c => c.types.includes("postal_code"))?.long_name || "";

            setAddressForm(prev => ({
              ...prev,
              address: street || prev.address,
              city: city || prev.city,
              country: state || prev.country,
              zipCode: zip || prev.zipCode
            }));

            notifySuccess("Location updated successfully!");
          } else {
            notifyError("Unable to fetch current location. Please try again.");
          }
        } catch (error) {
          console.error("Location error:", error);
          notifyError("Unable to fetch current location. Please try again.");
        } finally {
          setIsLocationLoading(false);
        }
      },
      (error) => {
        setIsLocationLoading(false);
        if (error.code === error.PERMISSION_DENIED) {
          notifyError("Location permission denied. Please allow location access.");
        } else {
          notifyError("Unable to fetch current location. Please try again.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Open modal for adding new address
  const handleAddAddress = () => {
    setEditingAddress(null);
    setAddressForm({
      name: userInfo?.name || "",
      address: "",
      city: "",
      country: "",
      zipCode: "",
      phone: userInfo?.phone || "",
      addressType: "Home",
      isDefault: shippingAddresses.length === 0
    });
    setShowAddressModal(true);
  };

  // Open modal for editing address
  const handleEditAddress = (address) => {
    setEditingAddress(address);
    setAddressForm({
      name: address.name || "",
      address: address.address || "",
      city: address.city || "",
      country: address.country || "",
      zipCode: address.zipCode || "",
      phone: address.phone || "",
      addressType: address.addressType || "Home",
      isDefault: address.isDefault || false
    });
    setShowAddressModal(true);
  };

  // Handle address submission (add or update)
  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!userInfo || !userInfo._id) {
        notifyError("User ID not found in session");
        return;
      }

      let response;
      if (editingAddress && editingAddress._id) {
        // Update existing address
        response = await CustomerServices.updateShippingAddress({
          userId: userInfo._id,
          shippingId: editingAddress._id,
          shippingAddressData: addressForm
        });
      } else {
        // Add new address
        response = await CustomerServices.addShippingAddress({
          userId: userInfo._id,
          shippingAddressData: addressForm
        });
      }

      if (response.success || response.message) {
        setShowAddressModal(false);
        setEditingAddress(null);
        // Reset form
        setAddressForm({
          name: "",
          address: "",
          city: "",
          country: "",
          zipCode: "",
          phone: "",
          addressType: "Home",
          isDefault: false
        });
        // Refetch addresses to get the latest
        await refetchAddresses();
        // If this was set as default or is first address, select it
        if (addressForm.isDefault || shippingAddresses.length === 0) {
          const updatedResponse = await CustomerServices.getShippingAddress({ userId: userInfo._id });
          const updatedAddresses = Array.isArray(updatedResponse?.shippingAddress) 
            ? updatedResponse.shippingAddress 
            : [];
          const newDefault = updatedAddresses.find(addr => addr.isDefault) || updatedAddresses[updatedAddresses.length - 1];
          if (newDefault) setSelectedAddress(newDefault);
        }
        notifySuccess(editingAddress ? "Address updated successfully" : "Address added successfully");
      } else {
        notifyError(response.message || "Failed to save address");
      }
    } catch (error) {
      console.error("Error saving address:", error);
      notifyError(error?.response?.data?.message || error?.message || "Failed to save address");
    }
  };

  // Handle address deletion
  const handleDeleteAddress = async (addressId) => {
     

    try {
      const response = await CustomerServices.deleteShippingAddress({
        userId: userInfo._id,
        shippingId: addressId
      });

      if (response.message || response.success) {
        await refetchAddresses();
        // If deleted address was selected, select first available
        if (selectedAddress?._id === addressId) {
          const updatedResponse = await CustomerServices.getShippingAddress({ userId: userInfo._id });
          const updatedAddresses = Array.isArray(updatedResponse?.shippingAddress) 
            ? updatedResponse.shippingAddress 
            : [];
          if (updatedAddresses.length > 0) {
            setSelectedAddress(updatedAddresses[0]);
          } else {
            setSelectedAddress(null);
          }
        }
        notifySuccess("Address deleted successfully");
      } else {
        notifyError(response.message || "Failed to delete address");
      }
    } catch (error) {
      console.error("Error deleting address:", error);
      notifyError(error?.response?.data?.message || error?.message || "Failed to delete address");
    }
  };

  const totals = calculateTotals();

  return (
    <>
      <Layout title="Checkout" description="this is checkout page">
        <div className="mx-auto max-w-screen-2xl px-3 sm:px-6 lg:px-10">
          <div className="py-6 sm:py-10 lg:py-12 w-full flex flex-col lg:flex-row lg:gap-10 xl:gap-14">
            <div className="w-full lg:w-3/5 flex flex-col min-w-0">
              <div className="mt-2 lg:mt-0">
                <form ref={formRef} onSubmit={handleSubmit(submitHandler)}>
                  {hasShippingAddress && (
                    <div className="flex justify-end my-2">
                      <SwitchToggle
                        id="shipping-address"
                        title="Use Default Shipping Address"
                        processOption={useExistingAddress}
                        handleProcess={handleDefaultShippingAddress}
                      />
                    </div>
                  )}
                  <div className="form-group">
                    <h2 className="font-semibold font-serif text-base text-gray-700 pb-3">
                      {showingTranslateValue(
                        storeCustomizationSetting?.checkout?.personal_details
                      )}
                    </h2>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 sm:p-6">
                      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-4">
                        <h3 className="text-sm font-medium text-gray-900">Select Delivery Address</h3>
                        <button
                          type="button"
                          onClick={handleAddAddress}
                          className="inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-store-500 hover:bg-store-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-store-500 w-full sm:w-auto shrink-0"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add Address
                        </button>
                      </div>

                      {shippingAddresses && shippingAddresses.length > 0 ? (
                        <div className="space-y-3 max-h-[300px] overflow-y-auto scrollbar-hide">
                          {shippingAddresses.map((address) => {
                            const locationText = `${address.city || ''}${address.city && address.zipCode ? ', ' : ''}${address.zipCode || ''}`;
                            const locationDisplay = locationText.length > 25 ? locationText.substring(0, 25) + '..' : locationText;
                            const fullAddress = `${address.address || ''}, ${address.city || ''}${address.city && address.country ? ', ' : ''}${address.country || ''}.`;
                            
                            const isSelected = selectedAddress?._id === address._id || selectedAddress?.id === address.id;
                            
                            return (
                              <div
                                key={address._id || address.id || Math.random()}
                                onClick={() => {
                                  setSelectedAddress(address);
                                  // Update form values immediately when address is selected
                                  const nameParts = (address.name || "").split(" ");
                                  setValue("firstName", nameParts[0] || "");
                                  setValue("lastName", nameParts.slice(1).join(" ") || "");
                                  setValue("email", getDisplayEmail(userInfo) || "");
                                  setValue("contact", address.phone || "");
                                  setValue("address", address.address || "");
                                  setValue("address2", "");
                                  setValue("city", address.city || "");
                                  setValue("state", address.country || "");
                                  setValue("country", address.country || "India");
                                  setValue("zipCode", address.zipCode || "");
                                }}
                                className={`border-2 rounded-lg p-3 sm:p-4 cursor-pointer transition-all ${
                                  isSelected
                                    ? ' border-gray-200 ring-2 ring-store-300'
                                    : 'border-gray-200 bg-white hover:border-store-300 hover:shadow-sm'
                                }`}
                              >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div className="flex items-start gap-3 flex-1 min-w-0">
                                    {/* Radio Button */}
                                    <div className="flex-shrink-0 mt-1">
                                      <input
                                        type="radio"
                                        name="selectedAddress"
                                        checked={isSelected}
                                        onChange={() => {
                                          setSelectedAddress(address);
                                          const nameParts = (address.name || "").split(" ");
                                          setValue("firstName", nameParts[0] || "");
                                          setValue("lastName", nameParts.slice(1).join(" ") || "");
                                          setValue("email", getDisplayEmail(userInfo) || "");
                                          setValue("contact", address.phone || "");
                                          setValue("address", address.address || "");
                                          setValue("address2", "");
                                          setValue("city", address.city || "");
                                          setValue("state", address.country || "");
                                          setValue("country", address.country || "India");
                                          setValue("zipCode", address.zipCode || "");
                                        }}
                                        className="h-5 w-5 text-store-600 focus:ring-store-500 border-gray-300 cursor-pointer"
                                      />
                                    </div>
                                    <div className="flex-1">
                                      {isSelected && (
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className="px-2.5 py-1 text-xs font-semibold uppercase tracking-wide bg-blue-50 text-gray-700 rounded-full">
                                            DELIVER TO
                                          </span>
                                        </div>
                                      )}
                                      <div className="flex items-center gap-2 mb-1">
                                        <p className="text-base font-bold text-gray-900">
                                          {address.addressType || 'Home'} ({locationDisplay})
                                        </p>
                                      </div>
                                      <p className="text-sm text-gray-500 leading-relaxed">
                                        {fullAddress}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 sm:ml-4 shrink-0 self-end sm:self-start">
                                    <div className="flex flex-col items-end gap-1">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditAddress(address);
                                        }}
                                        className="text-gray-400 hover:text-store-600 p-1 transition-colors"
                                        title="Edit address"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                      </button>
                                      {shippingAddresses.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteAddress(address._id || address.id);
                                          }}
                                          className="text-gray-400 hover:text-red-600 p-1 transition-colors"
                                          title="Delete address"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <p className="mt-2 text-sm text-gray-600">No delivery address found</p>
                          <p className="text-xs text-gray-500 mt-1">Add your delivery address to continue</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cart Items Section */}
                  <div className="form-group mt-8 sm:mt-12 max-h-[420px] sm:max-h-[500px] overflow-y-auto scrollbar-hide">
                    <h2 className="font-semibold font-serif text-base text-gray-700 pb-3">
                      
                      Order Items
                    </h2>

                    <div className="space-y-2">
                      {items.map((item) => (
                        <CartItem key={item.id} item={item} currency={currency} />
                      ))}

                      {isEmpty && (
                        <div className="text-center py-10 border border-gray-200 rounded-lg">
                          <span className="flex justify-center my-auto text-gray-500 font-semibold text-4xl">
                            <IoBagHandle />
                          </span>
                          <h2 className="font-medium font-serif text-sm pt-2 text-gray-600">
                            No Item Added Yet!
                          </h2>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* <div className="grid grid-cols-6 gap-4 lg:gap-6 mt-10">
                    <div className="col-span-6 sm:col-span-3">
                      <Link
                        href="/"
                        className="bg-indigo-50 border border-indigo-100 rounded py-3 text-center text-sm font-medium text-gray-700 hover:text-gray-800 hover:border-gray-300 transition-all flex justify-center font-serif w-full"
                      >
                        <span className="text-xl mr-2">
                          <IoReturnUpBackOutline />
                        </span>
                        {showingTranslateValue(
                          storeCustomizationSetting?.checkout?.continue_button
                        )}
                      </Link>
                    </div>
                    <div className="col-span-6 sm:col-span-3">
                      <button
                        type="submit"
                        disabled={isEmpty || isCheckoutSubmit}
                        className={`bg-store-500 hover:bg-store-600 border border-store-500 transition-all rounded py-3 text-center text-sm font-serif font-medium text-white flex justify-center w-full`}
                      >
                        {isCheckoutSubmit ? (
                          <span className="flex justify-center text-center">
                            {" "}
                            <img
                              src="/loader/spinner.gif"
                              alt="Loading"
                              width={20}
                              height={10}
                            />{" "}
                            <span className="ml-2">
                              {t("processing")}
                            </span>
                          </span>
                        ) : (
                          <span className="flex justify-center text-center">
                            {showingTranslateValue(
                              storeCustomizationSetting?.checkout
                                ?.confirm_button
                            )}
                            <span className="text-xl ml-2">
                              {" "}
                              <IoArrowForward />
                            </span>
                          </span>
                        )}
                      </button>
                    </div>
                  </div> */}
                </form>
              </div>
            </div>

            <div className="w-full lg:w-2/5 flex flex-col self-start mt-8 lg:mt-0 lg:sticky lg:top-28 lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto min-w-0">
              <div className="border p-4 sm:p-5 lg:px-8 lg:py-8 rounded-lg bg-white">
                <h2 className="font-semibold font-serif text-lg pb-4">
                  {showingTranslateValue(
                    storeCustomizationSetting?.checkout?.order_summary
                  )}
                </h2>

                {/* Coupon Section - Hidden for wholesalers */}
                {!isWholesaler && (
                  <div className="flex items-center mt-4 py-4 lg:py-4 text-sm w-full font-semibold text-gray-500 last:border-b-0 last:text-base last:pb-0">
                    <form className="w-full">
                      {couponInfo.couponCode ? (
                        <div className="relative bg-emerald-50 border-2 border-dashed border-emerald-400 rounded-lg p-5 w-full overflow-hidden shadow-sm">
                          {/* Cutouts for coupon effect */}
                          <div className="absolute top-1/2 -left-3 transform -translate-y-1/2 w-6 h-6 bg-white rounded-full border-r-2 border-dashed border-emerald-400 z-10"></div>
                          <div className="absolute top-1/2 -right-3 transform -translate-y-1/2 w-6 h-6 bg-white rounded-full border-l-2 border-dashed border-emerald-400 z-10"></div>
                          
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs uppercase font-bold tracking-widest text-emerald-600 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" /></svg>
                                Coupon Applied
                              </span>
                              <span className="text-xl sm:text-2xl font-black text-emerald-800 tracking-widest uppercase font-serif">
                                {couponInfo.couponCode}
                              </span>
                            </div>
                            <div className="bg-emerald-500 text-white p-1.5 rounded-full shadow-sm mt-1">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          </div>
                          
                          <div className="border-t-2 border-dashed border-emerald-200 my-4 relative"></div>
                          
                          <div className="flex justify-between items-center">
                            <div className="text-sm text-emerald-800 font-medium">
                              You save <span className="font-bold text-lg text-emerald-600">{currency}{discountAmount.toFixed(2)}</span>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={handleRemoveCoupon}
                                className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors uppercase tracking-wider"
                              >
                                Remove
                              </button>
                              <span className="text-emerald-300">|</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveCoupon()}
                                className="text-xs font-bold text-emerald-600 hover:text-emerald-800 transition-colors uppercase tracking-wider"
                              >
                                Change
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-xs text-gray-500 italic mb-2">
                            * Applying a new coupon will replace the existing coupon.
                          </p>
                          {availableCoupons && availableCoupons.length > 0 ? (
                            <>
                              <select
                                value={selectedCouponCode}
                                onChange={(e) => setSelectedCouponCode(e.target.value)}
                                className="form-select py-2 px-3 md:px-4 w-full appearance-none transition ease-in-out border text-input text-sm rounded-md h-12 duration-200 bg-white border-gray-200 focus:ring-0 focus:outline-none focus:border-store-500"
                              >
                                <option value="">
                                  {t("Select a coupon")}
                                </option>
                                {availableCoupons.map((coupon) => (
                                  <option key={coupon._id} value={coupon.couponCode}>
                                    {coupon.couponCode} — Min ₹
                                    {Number(coupon.minimumAmount || 0).toFixed(2)}
                                  </option>
                                ))}
                              </select>

                              <div className="flex flex-col sm:flex-row items-start justify-end">
                                {isCouponAvailable ? (
                                  <button
                                    disabled
                                    type="button"
                                    className={`md:text-sm leading-4 inline-flex items-center cursor-pointer transition ease-in-out duration-300 font-semibold text-center justify-center border border-gray-200 rounded-md placeholder-white focus-visible:outline-none focus:outline-none px-5 md:px-6 lg:px-8 py-3 md:py-3.5 lg:py-3 mt-3 sm:mt-0 sm:ml-3 md:mt-0 md:ml-3 lg:mt-0 lg:ml-3 bg-gray-100 h-12 text-sm lg:text-base w-full sm:w-auto`}
                                  >
                                    <img
                                      src="/loader/spinner.gif"
                                      alt="Loading"
                                      width={20}
                                      height={10}
                                    />
                                    <span className=" ml-2 font-light">Processing</span>
                                  </button>
                                ) : (
                                  <button
                                    disabled={isCouponAvailable || !selectedCouponCode}
                                    onClick={handleCouponCode}
                                    className={`md:text-sm leading-4 inline-flex items-center cursor-pointer bg-store-600 transition ease-in-out duration-300 font-semibold text-center justify-center border border-gray-200 rounded-md placeholder-white focus-visible:outline-none focus:outline-none px-5 md:px-6 lg:px-8 py-3 md:py-3.5 lg:py-3 mt-3 sm:mt-0 sm:ml-3 md:mt-0 md:ml-3 lg:mt-0 lg:ml-3 hover:text-white hover:bg-store-500 h-12 text-sm text-white lg:text-base w-full sm:w-auto ${
                                      !selectedCouponCode ? "opacity-60 cursor-not-allowed" : ""
                                    }`}
                                  >
                                    {showingTranslateValue(
                                      storeCustomizationSetting?.checkout?.apply_button
                                    ) || "Apply"}
                                  </button>
                                )}
                              </div>

                              {discountAmount > 0 && (
                                <p className="text-xs text-green-600 font-semibold">
                                  You save {currency}
                                  {discountAmount.toFixed(2)} with this coupon.
                                </p>
                              )}
                            </>
                          ) : (
                            <p className="text-xs text-gray-500">
                              No coupons available for this order amount.
                            </p>
                          )}
                        </div>
                      )}
                    </form>
                  </div>
                )}
                
                {/* Total MRP - Hidden for wholesalers */}
                {!isWholesaler && (
                  <div className="flex items-center py-2 text-sm w-full font-semibold text-gray-500 last:border-b-0 last:text-base last:pb-0">
                    Total MRP
                    <span className="ml-auto flex-shrink-0 text-gray-800 font-bold">
                      {currency}
                      {totals.totalMRP.toFixed(2)}
                    </span>
                  </div>
                )}
                
                {/* Total Discount - Hidden for wholesalers */}
                {!isWholesaler && totals.totalDiscount > 0 && (
                  <div className="flex items-center py-2 text-sm w-full font-semibold text-green-600 last:border-b-0 last:text-base last:pb-0">
                    Total Discount
                    <span className="ml-auto flex-shrink-0 font-bold text-green-600">
                      -{currency}
                      {totals.totalDiscount.toFixed(2)}
                    </span>
                  </div>
                )}

                 
                 
                {/* Tax Display */}
                {taxSummary?.inclusiveTax > 0 && (
                  <div className="flex items-center py-2 text-xs sm:text-sm w-full font-semibold text-gray-500">
                    GST (included in price)
                    <span className="ml-auto flex-shrink-0 text-gray-800 font-bold">
                      {currency}
                      {Number(taxSummary.inclusiveTax).toFixed(2)}
                    </span>
                  </div>
                )}
                {taxSummary?.exclusiveTax > 0 && (
                  <div className="flex items-center py-2 text-xs sm:text-sm w-full font-semibold text-gray-500">
                    GST (added at checkout)
                    <span className="ml-auto flex-shrink-0 text-gray-800 font-bold">
                      {currency}
                      {Number(taxSummary.exclusiveTax).toFixed(2)}
                    </span>
                  </div>
                )}
                
                {/* Coupon Offer / Additional Discount - Hidden for wholesalers */}
                {!isWholesaler && discountAmount > 0 && (
                  <div
                    className={`flex items-center py-2 text-sm w-full font-semibold last:border-b-0 last:text-base last:pb-0 ${
                      isCouponApplied ? "text-green-600" : "text-gray-500"
                    }`}
                  >
                    {isCouponApplied
                      ? "Coupon Offer"
                      : showingTranslateValue(
                          storeCustomizationSetting?.checkout?.discount
                        )}
                    <span
                      className={`ml-auto flex-shrink-0 font-bold ${
                        isCouponApplied ? "text-green-600" : "text-orange-400"
                      }`}
                    >
                      {currency}
                      {discountAmount.toFixed(2)}
                    </span>
                  </div>
                )}
                
                {/* Shipping Cost */}
                {shippingCost > 0 ? (
                  <div className="flex items-center py-2 text-sm w-full font-semibold text-gray-500 last:border-b-0 last:text-base last:pb-0">
                    Shipping Cost
                    <span className="ml-auto flex-shrink-0 text-gray-800 font-bold">
                      {currency}
                      {shippingCost.toFixed(2)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center py-2 text-sm w-full font-semibold text-green-600 last:border-b-0 last:text-base last:pb-0">
                    Shipping Cost
                    <span className="ml-auto flex-shrink-0 font-bold text-green-600">
                      FREE
                    </span>
                  </div>
                )}
                <div className="border-t mt-4">
                  <div className="flex items-center font-bold font-serif justify-between pt-5 text-sm uppercase">
                    <div className="flex flex-col">
                      <span>
                        {showingTranslateValue(
                          storeCustomizationSetting?.checkout?.total_cost
                        )}
                      </span>
                      <span className="text-medium font-bold text-gray-900 capitalize">
                        Estimated Payable
                      </span>
                    </div>
                    <span className="font-serif font-extrabold text-lg">
                      {currency}
                      {parseFloat(total).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Payment Method and Place Order Section */}
                <div className="mt-6 bg-gray-50 rounded-lg p-4">
                  {/* Payment Method Selection */}
                  <div className="mb-4">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-white rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="relative">
                            <select
                              {...register("paymentMethod", {
                                required: "Payment Method is required!",
                              })}
                              className="w-full px-2 py-1 pr-8 bg-transparent border-none focus:ring-0 focus:outline-none text-sm font-medium text-store-600 cursor-pointer appearance-none"
                              defaultValue=""
                            >
                              <option value="" disabled>
                                Pay using
                              </option>
                              {storeSetting?.cod_status && (
                                <option value="Cash">
                                  Cash on Delivery
                                </option>
                              )}
                              {storeSetting?.razorpay_status && (
                                <option value="RazorPay">
                                  UPI / RazorPay
                                </option>
                              )}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pointer-events-none">
                              <svg className="w-4 h-4 text-store-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                      {selectedPaymentMethod && (
                        <div className="text-sm font-medium text-gray-700 shrink-0">
                          {selectedPaymentMethod === 'Cash' ? 'COD' : selectedPaymentMethod === 'RazorPay' ? 'UPI' : ''}
                        </div>
                      )}
                    </div>
                    <Error errorMessage={errors.paymentMethod} />
                  </div>

                  {/* Place Order Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      if (!agreeToTerms) {
                        notifyError("Please agree to Terms & Conditions to place order");
                        return;
                      }
                      if (!selectedAddress) {
                        notifyError("Please select or add a delivery address first.");
                        return;
                      }
                      // Trigger form submission
                      if (formRef.current) {
                        formRef.current.requestSubmit();
                      }
                    }}
                    disabled={isEmpty || isCheckoutSubmit || !agreeToTerms}
                    className={`w-full py-4 rounded-lg text-base font-semibold text-white transition-all ${
                      isEmpty || isCheckoutSubmit || !agreeToTerms
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-store-500 hover:bg-store-600 shadow-md hover:shadow-lg'
                    }`}
                  >
                    {isCheckoutSubmit ? (
                      <span className="flex items-center justify-center">
                        <img
                          src="/loader/spinner.gif"
                          alt="Loading"
                          width={20}
                          height={20}
                          className="mr-2"
                        />
                        Processing...
                      </span>
                    ) : (
                      <span>
                        {showingTranslateValue(
                          storeCustomizationSetting?.checkout?.place_order
                        ) || "Place order"}
                      </span>
                    )}
                  </button>

                  {/* Terms and Conditions */}
                  <div className="mt-4 flex items-start gap-2">
                    <input
                      type="checkbox"
                      id="agreeToTerms"
                      checked={agreeToTerms}
                      onChange={(e) => setAgreeToTerms(e.target.checked)}
                      className="mt-1 h-4 w-4 text-store-600 focus:ring-store-500 border-gray-300 rounded cursor-pointer"
                    />
                    <label htmlFor="agreeToTerms" className="text-xs sm:text-sm text-gray-900 font-semibold cursor-pointer leading-relaxed">
                      By placing the order, you agree to our{" "}
                      <Link href="/terms" className="text-store-700 hover:text-store-800 hover:underline font-bold">
                        Terms & Conditions
                      </Link>
                      {" "}and{" "}
                      <Link href="/privacy" className="text-store-700 hover:text-store-800 hover:underline font-bold">
                        Privacy Policy
                      </Link>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>

      {/* Address Modal — portal + high z-index so it sits above header/categories */}
      {portalReady && showAddressModal && createPortal(
        <div className="fixed inset-0 z-[10050]">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => setShowAddressModal(false)}
          />
          
          {/* Modal Panel - full screen on mobile, below header on desktop */}
          <div className="absolute right-0 w-full sm:max-w-md lg:max-w-lg flex flex-col top-16 h-[calc(100dvh-4rem)] lg:top-[148px] lg:h-[calc(100dvh-148px)]">
            <div className="flex flex-col flex-1 min-h-0 bg-white shadow-xl">
              {/* Header */}
              <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
                <h3 className="text-base sm:text-lg font-medium text-gray-900 pr-2">
                  {editingAddress ? "Edit Shipping Address" : "Add Shipping Address"}
                </h3>
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-500 focus:outline-none focus:text-gray-500 transition-colors"
                  onClick={() => {
                    setShowAddressModal(false);
                    setEditingAddress(null);
                    setAddressForm({
                      name: "",
                      address: "",
                      city: "",
                      country: "",
                      zipCode: "",
                      phone: "",
                      addressType: "Home",
                      isDefault: false
                    });
                  }}
                >
                  <IoClose className="h-6 w-6" />
                </button>
              </div>

              <form
                onSubmit={handleAddressSubmit}
                className="flex flex-col flex-1 min-h-0"
              >
                <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4">
                <div className="space-y-4">
                  {/* Use Current Location Button */}
                  <div className="mb-4">
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      disabled={isLocationLoading}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-semibold text-sm hover:bg-emerald-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLocationLoading ? (
                        <FiLoader className="animate-spin" size={18} />
                      ) : (
                        <IoLocationOutline size={18} />
                      )}
                      {isLocationLoading ? "Fetching Location..." : "Use Current Location"}
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={addressForm.name}
                      onChange={handleAddressChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-store-500 focus:border-transparent"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Street Address
                    </label>
                    <textarea
                      name="address"
                      value={addressForm.address}
                      onChange={handleAddressChange}
                      required
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-store-500 focus:border-transparent"
                      placeholder="123 Main St, Apt 4B"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={addressForm.city}
                        onChange={handleAddressChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-store-500 focus:border-transparent"
                        placeholder="New York"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State/Province
                      </label>
                      <input
                        type="text"
                        name="country"
                        value={addressForm.country}
                        onChange={handleAddressChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-store-500 focus:border-transparent"
                        placeholder="NY"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ZIP/Postal Code
                    </label>
                    <input
                      type="text"
                      name="zipCode"
                      value={addressForm.zipCode}
                      onChange={handleAddressChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-store-500 focus:border-transparent"
                      placeholder="10001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={addressForm.phone}
                      onChange={handleAddressChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-store-500 focus:border-transparent"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address Type
                      </label>
                      <select
                        name="addressType"
                        value={addressForm.addressType}
                        onChange={handleAddressChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-store-500 focus:border-transparent"
                      >
                        <option value="Home">Home</option>
                        <option value="Work">Work</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="flex items-center pt-0 sm:pt-7">
                      <input
                        type="checkbox"
                        name="isDefault"
                        checked={addressForm.isDefault}
                        onChange={handleAddressChange}
                        className="h-4 w-4 text-store-600 focus:ring-store-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-sm text-gray-700">
                        Set as default address
                      </label>
                    </div>
                  </div>
                </div>
                </div>

                {/* Footer Buttons - always visible */}
                <div className="flex-shrink-0 border-t border-gray-200 px-4 sm:px-6 py-3 sm:py-4 bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:space-x-3 sm:gap-0">
                  <button
                    type="button"
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-store-500"
                    onClick={() => setShowAddressModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 border border-transparent rounded-md text-sm font-medium text-white bg-store-500 hover:bg-store-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-store-500"
                  >
                    {editingAddress ? "Update Address" : "Save Address"}
                  </button>
                </div>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default dynamic(() => Promise.resolve(Checkout), { ssr: false });
