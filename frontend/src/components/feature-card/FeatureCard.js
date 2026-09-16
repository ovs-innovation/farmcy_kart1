import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { FiCreditCard, FiGift, FiPhoneCall, FiTruck } from "react-icons/fi";

//internal import
import useGetSetting from "@hooks/useGetSetting";
import useUtilsFunction from "@hooks/useUtilsFunction";

const FeatureCard = () => {
  const router = useRouter();
  const { storeCustomizationSetting } = useGetSetting();
  const { showingTranslateValue } = useUtilsFunction();
  const storeColor = storeCustomizationSetting?.theme?.color || "green";

  const handleLinkClick = (e, href) => {
    if (href && href.startsWith("/#")) {
      const targetId = href.replace("/#", "");
      if (router.pathname === "/") {
        e.preventDefault();
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }
    }
  };

  const featurePromo = [
    {
      id: 1,
      title: showingTranslateValue(
        storeCustomizationSetting?.footer?.shipping_card
      ) || "Free Shipping",
      icon: FiTruck,
      href: "/#feature-category",
    },
    {
      id: 2,
      title: showingTranslateValue(
        storeCustomizationSetting?.footer?.support_card
      ) || "24/7 Support",
      icon: FiPhoneCall,
      href: "/contact-us",
    },
    {
      id: 3,
      title: showingTranslateValue(
        storeCustomizationSetting?.footer?.payment_card
      ) || "Secure Payment",
      icon: FiCreditCard,
      href: "/terms-and-conditions",
    },
    {
      id: 4,
      title: showingTranslateValue(
        storeCustomizationSetting?.footer?.offer_card
      ) || "Offers & deals",
      icon: FiGift,
      href: "/#hot-deals",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 mx-auto">
      {featurePromo.map((promo) => (
        <Link
          key={promo.id}
          href={promo.href || "#"}
          onClick={(e) => handleLinkClick(e, promo.href)}
          className="border-r last:border-r-0 border-store-400 py-1 flex items-center justify-center bg-transparent hover:text-store-600 transition-colors"
        >
          <div className="mr-3">
            <promo.icon
              className="flex-shrink-0 h-4 w-4"
              aria-hidden="true"
            />
          </div>
          <div>
            <span className="block font-serif text-sm font-medium leading-5">
              {promo?.title}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default FeatureCard;

