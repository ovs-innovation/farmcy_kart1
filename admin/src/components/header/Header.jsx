import { Avatar, Badge, WindmillContext } from "@windmill/react-ui";
import Cookies from "js-cookie";
import React, { useContext, useEffect, useRef, useState } from "react";
import { Scrollbars } from "react-custom-scrollbars-2";

import {
  FiTrash2,
  FiGrid,
  FiLogOut,
  FiMenu,
  FiSun,
  FiMoon,
  FiBell,
  FiSettings,
  FiShoppingCart,
} from "react-icons/fi";
import { Link } from "react-router-dom";
import cookies from "js-cookie";
import { useTranslation } from "react-i18next";

//internal import
import ellipse from "@/assets/img/icons/ellipse.svg";
import { AdminContext } from "@/context/AdminContext";
import { SidebarContext } from "@/context/SidebarContext";
import useNotification from "@/hooks/useNotification";
import useUtilsFunction from "@/hooks/useUtilsFunction";
import NotFoundTwo from "@/components/table/NotFoundTwo";
import { resolveCloudinaryUrl } from "@/utils/cloudinaryUrl";
import NotificationServices from "@/services/NotificationServices";
import OrderServices from "@/services/OrderServices";
import SelectLanguage from "@/components/form/selectOption/SelectLanguage";
import { notifyError, notifySuccess } from "@/utils/toast";

const Header = () => {
  const { toggleSidebar, handleLanguageChange, setNavBar, navBar, currLang } =
    useContext(SidebarContext);
  const { state, dispatch } = useContext(AdminContext);
  const { adminInfo } = state;
  const { mode, toggleMode } = useContext(WindmillContext);
  const pRef = useRef();
  const nRef = useRef();

  const currentLanguageCode = cookies.get("i18next") || "en";
  const { t } = useTranslation();
  const { updated, setUpdated } = useNotification();
  const { showDateTimeFormat } = useUtilsFunction();

  const [data, setData] = useState([]);
  const [totalDoc, setTotalDoc] = useState(0);
  const [totalUnreadDoc, setTotalUnreadDoc] = useState(0);
  const [lastUnreadDoc, setLastUnreadDoc] = useState(() => {
    return Number(localStorage.getItem("lastUnreadCount")) || 0;
  });
  const [orderPopup, setOrderPopup] = useState(null);
  const [orderSound] = useState(
    () =>
      typeof Audio !== "undefined"
        ? new Audio(
            "https://actions.google.com/sounds/v1/alarms/beep_short.ogg"
          )
        : null
  );
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);

  // console.log("currentLanguageCode", currentLanguageCode);

  const handleLogOut = () => {
    dispatch({ type: "USER_LOGOUT" });
    Cookies.remove("adminInfo");
    const adminDomain = import.meta.env.VITE_APP_ADMIN_DOMAIN;
    if (adminDomain) {
      const loginUrl = adminDomain.startsWith("http")
        ? `${adminDomain.replace(/\/+$/, "")}/login`
        : `https://${adminDomain.replace(/\/+$/, "")}/login`;
      window.location.replace(loginUrl);
    } else {
      window.location.replace("/login");
    }
  };

  const handleNotificationOpen = async () => {
    setNotificationOpen(!notificationOpen);
    setProfileOpen(false);
    await handleGetAllNotifications();
  };
  const handleProfileOpen = () => {
    setProfileOpen(!profileOpen);
    setNotificationOpen(false);
  };

  // handle notification status change
  const handleNotificationStatusChange = async (id) => {
    try {
      await NotificationServices.updateStatusNotification(id, {
        status: "read",
      });

      const getAllRes = await NotificationServices.getAllNotification();
      setData(getAllRes?.notifications);
      setTotalUnreadDoc(getAllRes?.totalUnreadDoc);
      window.location.reload(false);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    }
  };

  // handle notification delete
  const handleNotificationDelete = async (id) => {
    try {
      await NotificationServices.deleteNotification(id);
      const getAllRes = await NotificationServices.getAllNotification();
      setData(getAllRes?.notifications);
      setTotalUnreadDoc(getAllRes?.totalUnreadDoc);
      setTotalDoc(getAllRes?.totalDoc);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    }
  };

  //handle get notifications
  const handleGetAllNotifications = async () => {
    try {
      const res = await NotificationServices.getAllNotification();
      const nextUnread = res?.totalUnreadDoc || 0;
      // console.log("notifcation api called", res);
      setData(res?.notifications);
      setTotalUnreadDoc(nextUnread);
      setTotalDoc(res?.totalDoc);

      // Show popup when new unread notifications arrive (e.g. new order)
      if (nextUnread > lastUnreadDoc) {
        // Find most recent unread order notification (has orderId)
        const latestOrderNotification = res?.notifications?.find(
          (n) =>
            n.orderId &&
            (n.status === "unread" ||
              n.read === false ||
              n.isRead === false ||
              n.seen === false)
        );

        if (latestOrderNotification) {
          // Deduplicate by ID to prevent repeated popups on page navigation/refresh
          const lastNotifiedId = localStorage.getItem("lastNotifiedOrderId");
          
          if (latestOrderNotification._id !== lastNotifiedId) {
              localStorage.setItem("lastNotifiedOrderId", latestOrderNotification._id);
            // Fetch order to get product image
            try {
              const orderData = await OrderServices.getOrderById(
                latestOrderNotification.orderId
              );
              
              // Get product image from order cart - handle both array and string formats
              let productImage = null;
              const cartItem = orderData?.cart?.[0];
              
              if (cartItem) {
                if (Array.isArray(cartItem.image)) {
                  productImage = cartItem.image[0] || cartItem.image;
                } else if (typeof cartItem.image === 'string') {
                  productImage = cartItem.image;
                }
                
                // Also check variant image if main image not found
                if (!productImage && cartItem.variants?.[0]?.image) {
                  if (Array.isArray(cartItem.variants[0].image)) {
                    productImage = cartItem.variants[0].image[0];
                  } else {
                    productImage = cartItem.variants[0].image;
                  }
                }
              }
              
              // Fallback chain
              productImage = productImage || 
                latestOrderNotification.image ||
                "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=100";
              
              console.log("Order popup image:", productImage, "Order data:", orderData);
              
              setOrderPopup({
                ...latestOrderNotification,
                image: productImage,
              });
            } catch (err) {
              console.error("Error fetching order for image:", err);
              // If order fetch fails, use notification image or placeholder
              setOrderPopup({
                ...latestOrderNotification,
                image:
                  latestOrderNotification.image ||
                  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=100",
              });
            }
            
            // play sound softly
            if (orderSound) {
              orderSound.currentTime = 0;
              orderSound.volume = 0.6;
              orderSound.play().catch(() => {});
            }
          }
          // notifySuccess(latestOrderNotification.message || "New order received");
        } else {
          // notifySuccess("New order received");
        }
      }
      setLastUnreadDoc(nextUnread);
      localStorage.setItem("lastUnreadCount", nextUnread);
      setUpdated(false);
    } catch (err) {
      setUpdated(false);
      notifyError(err?.response?.data?.message || err?.message);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!pRef?.current?.contains(e.target)) {
        setProfileOpen(false);
      }
      if (!nRef?.current?.contains(e.target)) {
        setNotificationOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
  }, [pRef, nRef]);

  // Initial notification fetch & periodic polling so new orders trigger popup
  useEffect(() => {
    handleGetAllNotifications();

    const interval = setInterval(() => {
      handleGetAllNotifications();
    }, 15000); // every 15s

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updated]);
  // const onChange = (event) => {
  //     i18next.changeLanguage(event.target.value);

  // }

  // console.log("notificaiotn", data);
  return (
    <>
      {/* New Order popup overlay */}
      {orderPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 dark:bg-gray-900/70 backdrop-blur-sm">
          <div className="order-popup-animate max-w-2xl w-full mx-4 rounded-3xl bg-white dark:bg-gray-800 shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="bg-white dark:bg-gray-800 p-8 md:p-10">
              <div className="flex items-start justify-between mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-store-500 text-white">
                  <span className="text-2xl font-bold">✓</span>
                </div>
                <button
                  type="button"
                  onClick={() => setOrderPopup(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none text-2xl leading-none"
                >
                  <span className="sr-only">Close</span>
                  ×
                </button>
              </div>

              <div>
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-shrink-0">
                    <img
                      src={
                        (orderPopup && orderPopup.image) 
                          ? orderPopup.image 
                          : "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=100"
                      }
                      alt="Product"
                      className="w-24 h-24 md:w-32 md:h-32 rounded-xl object-cover border-2 border-gray-200 dark:border-gray-700 shadow-md bg-gray-100"
                      loading="eager"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const placeholder = "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=100";
                        if (e.target.src !== placeholder) {
                          e.target.onerror = null;
                          e.target.src = placeholder;
                        }
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-50 mb-3">
                      New order received
                    </h2>
                    <p className="text-base md:text-lg text-gray-700 dark:text-gray-300">
                      {orderPopup.message || "A customer just placed a new order."}
                    </p>
                  </div>
                </div>
                <p className="text-xs md:text-sm font-semibold text-store-600 dark:text-store-400 uppercase tracking-wider mb-2">
                  Quick Action
                </p>
                <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mb-8">
                  Open the order page to review items, payment and start
                  processing.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => setOrderPopup(null)}
                    className="px-5 py-3 text-sm font-medium rounded-lg border-2 border-store-200 dark:border-store-300 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Close
                  </button>
                  <Link
                    to={
                      orderPopup.orderId ? `/order/${orderPopup.orderId}` : "/orders"
                    }
                    onClick={() => setOrderPopup(null)}
                    className="px-6 py-3 text-sm font-bold rounded-lg bg-store-600 dark:bg-store-500 text-white hover:bg-store-700 dark:hover:bg-store-600 text-center shadow-md transition-colors"
                  >
                    View Order
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="z-30 py-4 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-50 dark:border-gray-700">
        <div className="container flex items-center justify-between h-full px-6 mx-auto text-store-500 dark:text-gray-300">
          <button
            type="button"
            onClick={() => setNavBar(!navBar)}
            className="hidden lg:block outline-0 focus:outline-none"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 18 18"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              ></path>
            </svg>
          </button>

          {/* <!-- Mobile hamburger --> */}
          <button
            className="p-1 mr-5 -ml-1 rounded-md lg:hidden focus:outline-none"
            onClick={toggleSidebar}
            aria-label="Menu"
          >
            <FiMenu className="w-6 h-6" aria-hidden="true" />
          </button>
          <span></span>

          <ul className="flex justify-end items-center flex-shrink-0 space-x-6">
            <li className="changeLanguage">
              <div className="dropdown">
                <button className="dropbtn focus:outline-none flex">
                  <div
                    className={`text-sm flag ${currLang?.flag?.toLowerCase()}`}
                  ></div>{" "}
                  <span className="md:inline-block hidden text-gray-900 dark:text-gray-300">
                    {/* {currentLanguageCode === "de" ? "GERMAN" : "ENGLISH"} */}
                    {currLang?.name}
                  </span>
                  <span className="md:hidden uppercase">
                    {/* {currentLanguageCode === "de" ? "DE" : "EN"} */}
                    {currLang?.iso_code}
                  </span>
                </button>

                <SelectLanguage handleLanguageChange={handleLanguageChange} />
              </div>
            </li>

            {/* <!-- Theme toggler --> */}

            <li className="flex">
              <button
                className="rounded-md focus:outline-none"
                onClick={toggleMode}
                aria-label="Toggle color mode"
              >
                {mode === "dark" ? (
                  <FiSun className="w-5 h-5" aria-hidden="true" />
                ) : (
                  <FiMoon className="w-5 h-5" aria-hidden="true" />
                )}
              </button>
            </li>

            {/* <!-- Notifications menu --> */}
            <li className="relative inline-block text-left" ref={nRef}>
              <button
                className="relative align-middle rounded-md focus:outline-none"
                onClick={handleNotificationOpen}
              >
                <FiBell className="w-5 h-5 text-store-500" aria-hidden="true" />

                <span className="absolute z-10 top-0 right-0 inline-flex items-center justify-center p-1 h-5 w-5 text-xs font-medium leading-none text-red-100 transform -translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
                  {totalUnreadDoc}
                </span>
              </button>

              {notificationOpen && (
                <div className="origin-top-right absolute md:right-0 -right-3 top-2 rounded-md shadow-lg bg-white dark:bg-gray-800  focus:outline-none">
                  <div
                    className={`${
                      data?.length === 0
                        ? "h-40"
                        : data?.length <= 2
                        ? "h-40"
                        : data?.length <= 3
                        ? "h-56"
                        : "h-330"
                    } md:w-400 w-300`}
                  >
                    <Scrollbars>
                      {data?.length === 0 ? (
                        <NotFoundTwo title="No new notification" />
                      ) : (
                        <ul className="block text-sm border-t border-gray-100 dark:border-gray-700 rounded-md">
                          {data?.map((value, index) => {
                            return (
                              <li
                                key={index + 1}
                                className={`flex justify-between items-center font-serif font-normal text-sm py-3 border-b border-gray-100 dark:border-gray-700 px-3 transition-colors duration-150 hover:bg-gray-100 ${
                                  value.status === "unread" && "bg-gray-50"
                                } hover:text-gray-800 dark:text-gray-400 ${
                                  value.status === "unread" &&
                                  "dark:bg-gray-800"
                                } dark:hover:bg-gray-900  dark:hover:text-gray-100 cursor-pointer`}
                              >
                                <Link
                                  to={
                                    value.productId
                                      ? `/product/${value.productId}`
                                      : value.orderId
                                      ? `/order/${value.orderId}`
                                      : "/our-staff"
                                  }
                                  className="flex items-center"
                                  onClick={() =>
                                    handleNotificationStatusChange(value._id)
                                  }
                                >
                                  <Avatar
                                    className="mr-2 md:block bg-gray-50 border border-gray-200"
                                    src={resolveCloudinaryUrl(value.image) || "/favicon-transparent.png"}
                                    alt="image"
                                  />

                                  <div className="notification-content">
                                    <h6 className="font-medium text-gray-500">
                                      {/* {`${cusName} ${priceText}`} */}
                                      {value?.message}
                                    </h6>

                                    <p className="flex items-center text-xs text-gray-400">
                                      {value.productId ? (
                                        <Badge type="danger">Stock Out</Badge>
                                      ) : (
                                        <Badge type="success">New Order</Badge>
                                      )}
                                      <span className="ml-2">
                                        {showDateTimeFormat(value.createdAt)}
                                      </span>
                                    </p>
                                  </div>

                                  {value.status === "unread" && (
                                    <span className="px-2 focus:outline-none">
                                      <img
                                        src={ellipse}
                                        width={12}
                                        height={12}
                                        alt="ellipse"
                                        className="w-3 h-3 text-store-600"
                                      />
                                    </span>
                                  )}
                                </Link>

                                <div className="group inline-block relative">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleNotificationDelete(value._id)
                                    }
                                    className="px-2 group-hover:text-store-500 text-red-500 focus:outline-none"
                                  >
                                    <FiTrash2 />
                                  </button>

                                  <div className="absolute hidden group-hover:inline-block bg-gray-50 dark:text-red-400 mr-6 mb-1 right-0 z-50 px-3 py-2 text-sm font-medium text-red-600 rounded-lg shadow-sm tooltip dark:bg-gray-700">
                                    Delete
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}

                      {totalDoc > 5 && (
                        <div className="text-center py-2">
                          <Link
                            onClick={() => setNotificationOpen(false)}
                            to={"/notifications"}
                            className="focus:outline-none hover:underline transition ease-out duration-200"
                          >
                            Show all notifications
                          </Link>
                        </div>
                      )}
                    </Scrollbars>
                  </div>
                </div>
              )}
            </li>

            {/* <!-- Profile menu --> */}
            <li className="relative inline-block text-left" ref={pRef}>
              <button
                className="rounded-full dark:bg-gray-500 bg-store-500 text-white h-8 w-8 font-medium mx-auto focus:outline-none"
                onClick={handleProfileOpen}
              >
                {resolveCloudinaryUrl(adminInfo.image) ? (
                  <Avatar
                    className="align-middle"
                    src={resolveCloudinaryUrl(adminInfo.image)}
                    aria-hidden="true"
                  />
                ) : (
                  <span>{adminInfo.email[0].toUpperCase()}</span>
                )}
              </button>

              {profileOpen && (
                <ul className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 focus:outline-none">
                  <li className="justify-between font-serif font-medium py-2 pl-4 transition-colors duration-150 hover:bg-gray-100 text-gray-500 hover:text-store-500 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200">
                    <Link to="/dashboard">
                      <span className="flex items-center text-sm">
                        <FiGrid className="w-4 h-4 mr-3" aria-hidden="true" />
                        <span>{t("Dashboard")}</span>
                      </span>
                    </Link>
                  </li>

                  <li className="justify-between font-serif font-medium py-2 pl-4 transition-colors duration-150 hover:bg-gray-100 text-gray-500 hover:text-store-500 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200">
                    <Link to="/edit-profile">
                      <span className="flex items-center text-sm">
                        <FiSettings
                          className="w-4 h-4 mr-3"
                          aria-hidden="true"
                        />
                        <span>{t("EditProfile")}</span>
                      </span>
                    </Link>
                  </li>

                  <li
                    onClick={handleLogOut}
                    className="cursor-pointer justify-between font-serif font-medium py-2 pl-4 transition-colors duration-150 hover:bg-gray-100 text-gray-500 hover:text-store-500 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                  >
                    <span className="flex items-center text-sm">
                      <FiLogOut className="w-4 h-4 mr-3" aria-hidden="true" />
                      <span>{t("LogOut")}</span>
                    </span>
                  </li>
                </ul>
              )}
            </li>
          </ul>
        </div>
      </header>
    </>
  );
};

export default Header;
