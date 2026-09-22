import Link from "next/link";
// import dayjs from "dayjs";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import dynamic from "next/dynamic";
import { IoLockOpenOutline } from "react-icons/io5";
import { FiPhoneCall, FiUser, FiMapPin } from "react-icons/fi";
import { signOut } from "next-auth/react";
import { jwtDecode } from "jwt-decode";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import useCustomerAuth from "@hooks/useCustomerAuth";
import useGetSetting from "@hooks/useGetSetting";
import useUtilsFunction from "@hooks/useUtilsFunction";
import CustomerServices from "@services/CustomerServices";
import LocationPickerDropdown from "@components/location/LocationPickerDropdown";

const NavBarTop = () => {
  const { userInfo, isLoggedIn, logout } = useCustomerAuth();
  const router = useRouter();
  const [location, setLocation] = useState(null);

  const { storeCustomizationSetting } = useGetSetting();
  const { showingTranslateValue } = useUtilsFunction();
  const storeColor = storeCustomizationSetting?.theme?.color || "green";

  // Load location from cookies on mount
  useEffect(() => {
    const savedLocation = Cookies.get("userLocation");
    if (savedLocation) {
      try {
        setLocation(JSON.parse(savedLocation));
      } catch (error) {
        console.error("Error parsing saved location:", error);
      }
    }

    // Listen for location updates
    const handleLocationUpdate = (event) => {
      setLocation(event.detail);
    };

    window.addEventListener('locationUpdated', handleLocationUpdate);
    return () => {
      window.removeEventListener('locationUpdated', handleLocationUpdate);
    };
  }, []);

  // Fetch shipping address if user is logged in
  const { data: shippingAddressData } = useQuery({
    queryKey: ["shippingAddress", { id: userInfo?.id }],
    queryFn: async () =>
      await CustomerServices.getShippingAddress({
        userId: userInfo?.id,
      }),
    select: (data) => data?.shippingAddress,
    enabled: !!userInfo?.id && isLoggedIn,
  });

  // Get address to display (prefer shipping address, then location, then user address)
  const getDisplayAddress = () => {
    // First priority: Shipping address (if user is logged in)
    if (isLoggedIn && userInfo && shippingAddressData && Object.keys(shippingAddressData).length > 0) {
      const addr = shippingAddressData;
      const parts = [
        addr.address,
        addr.area,
        addr.city,
        addr.zipCode,
      ].filter(Boolean);
      return parts.join(", ") || null;
    }

    // Second priority: Geolocation address (from cookies)
    if (location?.address) {
      return location.address;
    }
    if (location?.pinCode) {
      return `PIN: ${location.pinCode}`;
    }

    // Third priority: User's basic address
    if (isLoggedIn && userInfo?.address) {
      return userInfo.address;
    }

    return null;
  };

  const displayAddress = getDisplayAddress();

  const handleLogOut = async () => {
    if (logout) {
      await logout();
    }
    router.push("/");
  };

  useEffect(() => {
    if (isLoggedIn && userInfo && typeof userInfo.token === "string") {
      try {
        const decoded = jwtDecode(userInfo.token);
        const expireTime = new Date(decoded?.exp * 1000);
        const currentTime = new Date();

        if (currentTime >= expireTime) {
          console.log("Token expired, logging out...");
          handleLogOut();
        }
      } catch (err) {
        console.warn("Error decoding token:", err);
      }
    }
  }, [userInfo, isLoggedIn]);

  return (
    <>
      <div className="bg-gray-100 relative z-[51]">
        <div className="max-w-screen-2xl mx-auto px-3 sm:px-10">
          <div className="text-gray-700 py-2 font-sans text-xs font-medium border-b flex justify-between items-center">
            <span className="flex items-center gap-2">

              {displayAddress ? (
                <span className="flex items-center text-gray-600">
                  <span
                    className="text-xs truncate max-w-xs"
                    title={displayAddress}
                  >
                    {displayAddress}
                  </span>
                </span>
              ) : (
                <LocationPickerDropdown className="!p-0 !bg-transparent !border-none text-xs font-sans text-gray-700 hover:text-store-500 z-40 h-auto" />
              )}
            </span>

            <div className="lg:text-right flex items-center navBar">


              <Link
                href={isLoggedIn ? "/user/my-account" : "/auth/login"}
                className={`font-medium hover:text-store-600`}
              >
                {showingTranslateValue(
                  storeCustomizationSetting?.navbar?.my_account
                )}
              </Link>
              <span className="mx-2">|</span>
              {isLoggedIn ? (
                <button
                  onClick={handleLogOut}
                  className={`flex items-center font-medium hover:text-store-600`}
                >
                  <span className="mr-1">
                    <IoLockOpenOutline />
                  </span>
                  {showingTranslateValue(
                    storeCustomizationSetting?.navbar?.logout
                  )}
                </button>
              ) : (
                <Link
                  href="/auth/login"
                  className={`flex items-center font-medium hover:text-store-600`}
                >
                  <span className="mr-1">
                    <FiUser />
                  </span>

                  {showingTranslateValue(
                    storeCustomizationSetting?.navbar?.login
                  )}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default dynamic(() => Promise.resolve(NavBarTop), { ssr: false });
