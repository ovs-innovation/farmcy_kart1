import Cookies from "js-cookie";
import dayjs from "dayjs";
import { useRouter } from "next/router";
import { useContext, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useCart } from "react-use-cart";
import useRazorpay from "react-razorpay";
import { useQuery } from "@tanstack/react-query";

//internal import
import { getUserSession } from "@lib/auth";
import { UserContext } from "@context/UserContext";
import { SidebarContext } from "@context/SidebarContext";
import OrderServices from "@services/OrderServices";
import useUtilsFunction from "./useUtilsFunction";
import CouponServices from "@services/CouponServices";
import { notifyError, notifySuccess } from "@utils/toast";
import CustomerServices from "@services/CustomerServices";
import { isProfileComplete, getDisplayEmail } from "@utils/profileAuth";
import NotificationServices from "@services/NotificationServices";
import ShiprocketServices from "@services/ShiprocketServices";
import useCartDB from "@hooks/useCartDB";

const useCheckoutSubmit = (storeSetting) => {
  const { dispatch } = useContext(UserContext);
  const { toggleCartDrawer } = useContext(SidebarContext);

  const [error, setError] = useState("");
  const [total, setTotal] = useState("");
  const [couponInfo, setCouponInfo] = useState({});
  const [minimumAmount, setMinimumAmount] = useState(0);
  const [showCard, setShowCard] = useState(false);
  const [shippingCost, setShippingCost] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [taxSummary, setTaxSummary] = useState({
    inclusiveTax: 0,
    exclusiveTax: 0,
    totalTax: 0,
  });
  const [isCheckoutSubmit, setIsCheckoutSubmit] = useState(false);
  const [isCouponApplied, setIsCouponApplied] = useState(false);
  const [useExistingAddress, setUseExistingAddress] = useState(false);
  const [isCouponAvailable, setIsCouponAvailable] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [selectedCouponCode, setSelectedCouponCode] = useState("");

  const router = useRouter();
  const couponRef = useRef("");
  const isRemovingCouponRef = useRef(false);
  const [Razorpay] = useRazorpay();
  const { isEmpty, emptyCart, items, cartTotal, removeItem } = useCart();
  const { clearCartWithDB } = useCartDB();

  const userInfo = getUserSession();
  const { showDateFormat, currency, globalSetting } = useUtilsFunction();

  const { data, isLoading } = useQuery({
    queryKey: ["shippingAddress", { id: userInfo?.id }],
    queryFn: async () =>
      await CustomerServices.getShippingAddress({
        userId: userInfo?.id,
      }),
    select: (data) => data?.shippingAddress,
    enabled: !!userInfo?.id,
  });

  const hasShippingAddress =
    !isLoading && data && Object.keys(data)?.length > 0;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    if (Cookies.get("couponInfo")) {
      const coupon = JSON.parse(Cookies.get("couponInfo"));
      setCouponInfo(coupon);
      setDiscountPercentage(coupon.discountType);
      setMinimumAmount(coupon.minimumAmount);
    }
    const displayEmail = getDisplayEmail(userInfo);
    if (displayEmail) {
      setValue("email", displayEmail);
    }
  }, [setValue, userInfo]);

  //remove coupon if total value less then minimum amount of coupon
  useEffect(() => {
    // Skip if coupon is already removed (no minimum amount or no active discount)
    if (minimumAmount === 0) {
      isRemovingCouponRef.current = false;
      return;
    }

    // Skip if we're already in the process of removing the coupon
    if (isRemovingCouponRef.current) {
      return;
    }

    // Check if coupon should be removed
    const shouldRemoveCoupon = minimumAmount > 0 && (minimumAmount - discountAmount > total || isEmpty);
    const hasActiveCoupon = discountPercentage !== 0 &&
      (typeof discountPercentage === 'object' ? Object.keys(discountPercentage).length > 0 : true);

    if (shouldRemoveCoupon && hasActiveCoupon) {
      isRemovingCouponRef.current = true;
      setDiscountPercentage(0);
      Cookies.remove("couponInfo");
      setCouponInfo({});
      setMinimumAmount(0);
    }
  }, [minimumAmount, total, discountAmount, isEmpty, discountPercentage]);

  // Load list of coupons applicable for current cart total
  useEffect(() => {
    const loadCoupons = async () => {
      try {
        const coupons = await CouponServices.getShowingCoupons();
        const applicable = (coupons || []).filter((coupon) => {
          const min = Number(coupon.minimumAmount || 0);
          const notExpired = coupon.endTime ? !dayjs().isAfter(dayjs(coupon.endTime)) : true;
          return notExpired;
        });
        setAvailableCoupons(applicable);

        // Reset selection if current coupon is no longer applicable
        if (
          selectedCouponCode &&
          !applicable.find((c) => c.couponCode === selectedCouponCode)
        ) {
          setSelectedCouponCode("");
        }
      } catch (err) {
        console.error("Error loading coupons", err);
      }
    };

    if (!isEmpty) {
      loadCoupons();
    } else {
      setAvailableCoupons([]);
      setSelectedCouponCode("");
    }
  }, [total, isEmpty, selectedCouponCode]);

  //calculate total and discount value
  //calculate total and discount value
  useEffect(() => {
    if (!items || items.length === 0) {
      setTaxSummary({ inclusiveTax: 0, exclusiveTax: 0, totalTax: 0 });
      setDiscountAmount(0);
      setTotal(0);
      return;
    }

    const discountProductTotal = items?.reduce(
      (preValue, currentValue) => preValue + currentValue.itemTotal,
      0
    );

    const nextTaxSummary = items?.reduce(
      (acc, item) => {
        const rate = Number(item?.taxRate ?? 0);
        const price = Number(item?.price ?? 0);
        if (!Number.isFinite(rate) || rate <= 0 || !Number.isFinite(price)) {
          return acc;
        }
        const quantity = Number(item?.quantity ?? 1);
        if (item?.isPriceInclusive) {
          const basePrice = price / (1 + rate / 100);
          const taxAmount = (price - basePrice) * quantity;
          acc.inclusiveTax += taxAmount;
        } else {
          const taxAmount = price * (rate / 100) * quantity;
          acc.exclusiveTax += taxAmount;
        }
        return acc;
      },
      { inclusiveTax: 0, exclusiveTax: 0 }
    );
    nextTaxSummary.totalTax =
      nextTaxSummary.inclusiveTax + nextTaxSummary.exclusiveTax;
    setTaxSummary(nextTaxSummary);

    let totalValue = 0;
    const subTotal = parseFloat(
      cartTotal + Number(shippingCost) + nextTaxSummary.exclusiveTax
    ).toFixed(2);

    let calculatedDiscountAmount = 0;
    if (discountPercentage && typeof discountPercentage === 'object' && discountPercentage.type) {
      calculatedDiscountAmount =
        discountPercentage.type === "fixed"
          ? discountPercentage.value
          : discountProductTotal * (discountPercentage.value / 100);
    }

    const discountAmountTotal = Math.max(0, calculatedDiscountAmount || 0);
    totalValue = Math.max(0, Number(subTotal) - discountAmountTotal);

    setDiscountAmount(discountAmountTotal);
    setTotal(totalValue);
  }, [items, cartTotal, shippingCost, discountPercentage]);

  const submitHandler = async (data) => {
    try {
      // Keep the old checkout flow: take details on checkout itself
      // and (if needed) complete the customer profile in the background.
      if (userInfo?.token && !isProfileComplete(userInfo)) {
        try {
          const profilePayload = {
            name:
              `${data.firstName || ""} ${data.lastName || ""}`.trim() ||
              userInfo?.name,
            phone: data.contact,
            address: data.address,
            city: data.city,
            country: data.country,
            zipCode: data.zipCode,
          };

          await CustomerServices.completeProfile(profilePayload);
        } catch (err) {
          // If profile completion fails, block placing order and show message
          notifyError(
            err?.response?.data?.message ||
            err?.message ||
            "Please check your delivery details and try again."
          );
          setIsCheckoutSubmit(false);
          return;
        }
      }

      // Validate payment method is selected
      if (!data.paymentMethod) {
        notifyError("Please select a payment method.");
        setIsCheckoutSubmit(false);
        return;
      }

      dispatch({ type: "SAVE_SHIPPING_ADDRESS", payload: data });
      Cookies.set("shippingAddress", JSON.stringify(data));
      setIsCheckoutSubmit(true);
      setError("");

      const userDetails = {
        name: `${data.firstName || ""} ${data.lastName || ""}`.trim() || userInfo?.name || "A customer",
        contact: data.contact,
        email: data.email,
        address: data.address,
        country: data.country,
        city: data.city,
        zipCode: data.zipCode,
      };

      // Generate unique idempotency key per logical checkout attempt
      const checkoutRequestId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // 1. Dedicated stock pre-check route before payment/order submission
      try {
        await OrderServices.checkStock({
          cart: items,
        });
      } catch (error) {
        const errorData = error?.response?.data;
        if (errorData?.outOfStockItems) {
          errorData.outOfStockItems.forEach((item) => {
            removeItem(item.id || item._id);
            notifyError(`${item.title || "Item"} is out of stock and removed from cart.`);
          });
          setIsCheckoutSubmit(false);
          toggleCartDrawer();
          return;
        }
      }

      const normalizedPaymentMethod = data.paymentMethod === "Cash" ? "COD" : data.paymentMethod;

      let orderInfo = {
        user_info: userDetails,
        shippingOption: data.shippingOption,
        paymentMethod: normalizedPaymentMethod,
        checkoutRequestId,
        status: "Pending",
        cart: items,
        subTotal: cartTotal,
        shippingCost: shippingCost,
        discount: discountAmount,
        coupon: couponInfo?.couponCode ? {
          couponCode: couponInfo.couponCode,
          discountAmount: discountAmount,
        } : null,
        taxSummary,
        total: total,
      };

      if (userInfo?.id) {
        await CustomerServices.addShippingAddress({
          userId: userInfo?.id,
          shippingAddressData: {
            ...userDetails,
          },
        });
      }

      // Handle payment based on method
      switch (data.paymentMethod) {
        case "RazorPay":
          await handleCashPayment(orderInfo);
          break;
        case "Cash":
        case "COD":
          await handleCashPayment({
            ...orderInfo,
            paymentMethod: "COD",
          });
          break;
        default:
          notifyError("Invalid payment method selected.");
          setIsCheckoutSubmit(false);
      }
    } catch (error) {
      console.error("Checkout submit error:", error);
      const errorData = error?.response?.data;
      console.log("Error Data from Server (Submit):", errorData);

      if (errorData?.outOfStockItems) {
        errorData.outOfStockItems.forEach((item) => {
          removeItem(item.id || item._id);
          notifyError(`${item.title} is out of stock and removed from cart.`);
        });
        setIsCheckoutSubmit(false);
        toggleCartDrawer();
        return;
      }
      notifyError(errorData?.message || error?.message || "An error occurred. Please try again.");
      setIsCheckoutSubmit(false);
    }
  };

  // console.log("globalSetting", globalSetting?.email_to_customer);

  const handleOrderSuccess = async (orderResponse, orderInfo) => {
    try {
      const notificationInfo = {
        orderId: orderResponse?._id,
        message: `${orderResponse?.user_info?.name || "A customer"
          } placed an order of ${parseFloat(orderResponse?.total || 0).toFixed(2)}!`,
        image:
          "https://res.cloudinary.com/ahossain/image/upload/v1655097002/placeholder_kvepfp.png",
      };

      const updatedData = {
        ...orderResponse,
        date: showDateFormat(orderResponse.createdAt),
        company_info: {
          currency: currency,
          vat_number: globalSetting?.vat_number,
          company: globalSetting?.company_name,
          address: globalSetting?.address,
          phone: globalSetting?.contact,
          email: globalSetting?.email,
          website: globalSetting?.website,
          from_email: globalSetting?.from_email,
        },
      };

      if (globalSetting?.email_to_customer) {
        // Trigger email in the background
        OrderServices.sendEmailInvoiceToCustomer(updatedData).catch(
          (emailErr) => {
            console.error("Failed to send email invoice:", emailErr.message);
          }
        );
      }

      // Backend handles Shiprocket order creation asynchronously
      if (orderResponse?.shiprocketSyncStatus === "Failed") {
        console.warn("Backend Shiprocket sync pending:", orderResponse.shiprocketLastError);
      }

      // Add notification
      await NotificationServices.addNotification(notificationInfo);

      // Proceed with order success
      router.push(`/order/${orderResponse?._id}`);
      notifySuccess(
        "Your Order Confirmed! The invoice will be emailed to you shortly."
      );
      Cookies.remove("couponInfo");
      // Clear local cart AND DB cart
      await clearCartWithDB();
      setIsCheckoutSubmit(false);
    } catch (err) {
      console.error("Order success handling error:", err.message);
      throw new Error(err.message);
    }
  };

  const buildShiprocketPayload = (orderResponse) => {
    if (!orderResponse?.user_info || !orderResponse?.cart?.length) return null;

    const {
      name = "",
      email,
      contact,
      address,
      address2,
      city,
      state,
      country,
      zipCode,
      isdCode,
      alternatePhone,
    } = orderResponse.user_info;

    const [firstName = "", ...restName] = name.trim().split(" ");
    const lastName = restName.join(" ");

    const orderItems = orderResponse.cart.map((item, index) => ({
      name: item.title || item.name || `Item-${index + 1}`,
      sku: item.sku || item.id || item._id || `SKU-${index + 1}`,
      units: item.quantity || 1,
      selling_price: (item.price || item.unit_price || 0).toString(),
      discount: item.discount || "",
      tax: item.tax || "",
      hsn: item.hsn || "",
    }));

    const totalWeight =
      orderResponse.cart.reduce(
        (weight, item) => weight + (Number(item.weight) || 0),
        0
      ) || 0.5;

    return {
      orderId: orderResponse._id,
      order_id: orderResponse.invoice || orderResponse._id || "",
      order_date: dayjs(orderResponse.createdAt).format("YYYY-MM-DD"),
      pickup_location: "home",
      comment: orderResponse.comment || "",
      reseller_name: orderResponse.reseller_name || "",
      company_name: orderResponse.company_name || globalSetting?.company_name || "",
      billing_customer_name: firstName || name,
      billing_last_name: lastName,
      billing_address: address,
      billing_address_2: address2 || "",
      billing_isd_code: isdCode || "",
      billing_city: city,
      billing_pincode: zipCode || "000000",
      billing_state: state || city,
      billing_country: country || "India",
      billing_email: email,
      billing_phone: contact,
      billing_alternate_phone: alternatePhone || "",
      shipping_is_billing: true,
      shipping_customer_name: firstName || name,
      shipping_last_name: lastName,
      shipping_address: orderResponse.shippingAddress || address,
      shipping_address_2: orderResponse.shippingAddress2 || address2 || "",
      shipping_city: orderResponse.shippingCity || city,
      shipping_pincode: orderResponse.shippingZipCode || zipCode || "000000",
      shipping_country: orderResponse.shippingCountry || country || "India",
      shipping_state: orderResponse.shippingState || state || city,
      shipping_email: orderResponse.shippingEmail || email,
      shipping_phone: orderResponse.shippingPhone || contact,
      order_items: orderItems,
      payment_method: orderResponse.paymentMethod === "Cash" ? "COD" : "Prepaid",
      shipping_charges: Number(orderResponse.shippingCost || 0),
      giftwrap_charges: orderResponse.giftwrap_charges || "",
      transaction_charges: orderResponse.transaction_charges || "",
      total_discount:
        Number(orderResponse.discount || 0) ||
        Number(orderResponse.total_discount || 0),
      sub_total: Number(orderResponse.subTotal || orderResponse.total || 0),
      length: orderResponse.package?.length || 10,
      breadth: orderResponse.package?.breadth || 10,
      height: orderResponse.package?.height || 2,
      weight: orderResponse.package?.weight || totalWeight,
      ewaybill_no: orderResponse.ewaybill_no || "",
      customer_gstin: orderResponse.customer_gstin || "",
      invoice_number: orderResponse.invoice || "",
      order_type: orderResponse.order_type || "",
    };
  };

  const syncOrderWithShiprocket = async (orderResponse) => {
    try {
      const payload = buildShiprocketPayload(orderResponse);
      if (!payload) return;
      await ShiprocketServices.createOrder(payload);
    } catch (err) {
      console.error("Shiprocket order sync failed:", err.message);
    }
  };

  //handle cash / COD payment
  const handleCashPayment = async (orderInfo) => {
    const headers = orderInfo.checkoutRequestId
      ? { headers: { "Idempotency-Key": orderInfo.checkoutRequestId } }
      : {};
    const orderResponse = await OrderServices.addOrder(orderInfo, headers);
    await handleOrderSuccess(orderResponse, orderInfo);
  };

  //handle razorpay payment
  const handlePaymentWithRazorpay = async (orderInfo) => {
    try {
      // Validate storeSetting and Razorpay configuration
      if (!storeSetting) {
        notifyError("Store settings not loaded. Please refresh the page.");
        setIsCheckoutSubmit(false);
        return;
      }

      if (!storeSetting?.razorpay_status) {
        notifyError("Razorpay payment gateway is not enabled.");
        setIsCheckoutSubmit(false);
        return;
      }

      if (!storeSetting?.razorpay_id) {
        notifyError("Razorpay is not configured. Please contact administrator.");
        setIsCheckoutSubmit(false);
        return;
      }

      // Create Razorpay order
      const amountToSend = Math.round(orderInfo.total);
      if (isNaN(amountToSend) || amountToSend <= 0) {
        notifyError("Invalid order total. Please check your cart.");
        setIsCheckoutSubmit(false);
        return;
      }

      const razorpayOrderResponse = await OrderServices.createOrderByRazorPay({
        amount: amountToSend.toString(),
        cart: orderInfo.cart,
      });

      if (!razorpayOrderResponse || !razorpayOrderResponse.id) {
        notifyError("Failed to create payment order. Please try again.");
        setIsCheckoutSubmit(false);
        return;
      }

      const { amount, id, currency } = razorpayOrderResponse;

      // Validate Razorpay SDK
      if (!Razorpay || typeof Razorpay !== "function") {
        notifyError("Razorpay SDK is not loaded. Please refresh the page.");
        setIsCheckoutSubmit(false);
        return;
      }

      const options = {
        key: storeSetting.razorpay_id,
        amount: amount,
        currency: currency || "INR",
        name: storeSetting?.store_name || "Farmacykart",
        description:
          storeSetting?.store_description ||
          "This is the total cost of your purchase",
        order_id: id,
        handler: async (response) => {
          try {
            if (!response || !response.razorpay_payment_id) {
              notifyError("Invalid payment response. Please try again.");
              setIsCheckoutSubmit(false);
              return;
            }

            const razorpayDetails = {
              amount: orderInfo.total,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature,
            };

            const orderData = { ...orderInfo, razorpay: razorpayDetails };
            const headers = orderInfo.checkoutRequestId
              ? { headers: { "Idempotency-Key": orderInfo.checkoutRequestId } }
              : {};
            const orderResponse = await OrderServices.addRazorpayOrder(orderData, headers);
            await handleOrderSuccess(orderResponse, orderInfo);
          } catch (err) {
            console.error("Razorpay order save error:", err);
            const errorData = err?.response?.data;
            console.log("Error Data from Server (Save Order):", errorData);

            if (errorData?.outOfStockItems) {
              errorData.outOfStockItems.forEach((item) => {
                removeItem(item.id || item._id);
                notifyError(`${item.title} is out of stock and removed from cart.`);
              });
              setIsCheckoutSubmit(false);
              toggleCartDrawer();
              return;
            }
            notifyError(
              errorData?.message ||
              "Failed to save order. Please contact support."
            );
            setIsCheckoutSubmit(false);
          }
        },
        prefill: {
          name: orderInfo?.user_info?.name || "Customer",
          email: orderInfo?.user_info?.email || "customer@example.com",
          contact: orderInfo?.user_info?.contact || "0000000000",
        },
        theme: { color: storeSetting?.razorpay_color || "#EC4899" },
        modal: {
          ondismiss: () => {
            setIsCheckoutSubmit(false);
          },
        },
      };

      try {
        const rzpay = new Razorpay(options);
        rzpay.open();
      } catch (openErr) {
        console.error("Error opening Razorpay:", openErr);
        notifyError(
          openErr?.message || "Error in opening checkout. Please try again."
        );
        setIsCheckoutSubmit(false);
      }
    } catch (err) {
      console.error("Razorpay payment error:", err);
      const errorData = err?.response?.data;
      console.log("Error Data from Server:", errorData);

      if (errorData?.outOfStockItems) {
        errorData.outOfStockItems.forEach((item) => {
          removeItem(item.id || item._id);
          notifyError(`${item.title} is out of stock and removed from cart.`);
        });
        setIsCheckoutSubmit(false);
        toggleCartDrawer();
        return;
      }

      const errorMessage = errorData?.message || err?.message || "Failed to process payment. Please try again.";
      notifyError(errorMessage);
      setIsCheckoutSubmit(false);
    }
  };

  const handleShippingCost = (value) => {
    // console.log("handleShippingCost", value);
    setShippingCost(Number(value));
  };

  //handle default shipping address
  const handleDefaultShippingAddress = (value) => {
    // console.log("handle default shipping", value);
    setUseExistingAddress(value);
    if (value) {


      const address = data;

      const nameParts = address?.name?.trim()?.split(/\s+/) || [];  //Split the name into parts

      const firstName = nameParts[0] || ""; // First name is the first element

      const lastName =
        nameParts.length > 1
          ? nameParts[nameParts.length - 1]
          : ""; // Last name is the last element, if it exists

      setValue("firstName", firstName);
      setValue("lastName", lastName);

      setValue("address", address.address);
      setValue("contact", address.contact);
      // setValue("email", address.email);
      setValue("city", address.city);
      setValue("country", address.country);
      setValue("zipCode", address.zipCode);
    } else {
      setValue("firstName");
      setValue("lastName");
      setValue("address");
      setValue("contact");
      // setValue("email");
      setValue("city");
      setValue("country");
      setValue("zipCode");
    }
  };
  const handleCouponCode = async (e) => {
    e.preventDefault();

    const code =
      selectedCouponCode || (couponRef.current && couponRef.current.value);

    if (!code) {
      notifyError("Please select or input a Coupon Code!");
      return;
    }
    setIsCouponAvailable(true);

    try {
      const coupons = await CouponServices.getShowingCoupons();
      const result = coupons.filter(
        (coupon) => coupon.couponCode === code
      );
      setIsCouponAvailable(false);

      if (result.length < 1) {
        notifyError("Please Input a Valid Coupon!");
        return;
      }

      if (dayjs().isAfter(dayjs(result[0]?.endTime))) {
        notifyError("This coupon is not valid!");
        return;
      }

      if (total < result[0]?.minimumAmount) {
        notifyError(
          `Minimum ${result[0].minimumAmount} ${currency} required for Apply this coupon!`
        );
        return;
      } else {
        notifySuccess(
          `Your Coupon ${result[0].couponCode} is Applied on ${result[0].productType}!`
        );
        isRemovingCouponRef.current = false; // Reset flag when applying new coupon
        setIsCouponApplied(true);
        setMinimumAmount(result[0]?.minimumAmount);
        setDiscountPercentage(result[0].discountType);
        setCouponInfo(result[0]); // <-- ADD THIS LINE
        dispatch({ type: "SAVE_COUPON", payload: result[0] });
        Cookies.set("couponInfo", JSON.stringify(result[0]));
      }
    } catch (error) {
      return notifyError(error.message);
    }
  };

  const handleRemoveCoupon = () => {
    isRemovingCouponRef.current = true;
    setDiscountPercentage(0);
    Cookies.remove("couponInfo");
    setCouponInfo({});
    setMinimumAmount(0);
    setIsCouponApplied(false);
    setSelectedCouponCode("");
    setDiscountAmount(0);
    dispatch({ type: "SAVE_COUPON", payload: null });
    notifySuccess("Coupon removed successfully!");
    setTimeout(() => {
      isRemovingCouponRef.current = false;
    }, 100);
  };


  return {
    register,
    errors,
    watch,
    showCard,
    setShowCard,
    error,
    couponInfo,
    couponRef,
    total,
    isEmpty,
    items,
    cartTotal,
    handleSubmit,
    submitHandler,
    handleShippingCost,
    handleCouponCode,
    discountPercentage,
    discountAmount,
    shippingCost,
    isCheckoutSubmit,
    isCouponApplied,
    useExistingAddress,
    hasShippingAddress,
    isCouponAvailable,
    availableCoupons,
    selectedCouponCode,
    setSelectedCouponCode,
    handleDefaultShippingAddress,
    taxSummary,
    setValue,
    handleRemoveCoupon,
  };
};

export default useCheckoutSubmit;
