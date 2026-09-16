import React, { useMemo, useContext } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";
import { IoChevronBack, IoChevronForward, IoFlash } from "react-icons/io5";
import Cookies from "js-cookie";

// Swiper styles
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/autoplay";

// Internal imports
import useUtilsFunction from "@hooks/useUtilsFunction";
import SectionHeader from "@components/common/SectionHeader";
import { UserContext } from "@context/UserContext";
import ProductCard from "@components/product/ProductCard"; // Reference the working component

const DealsYouLove = ({ products, attributes }) => {
  const { getNumber } = useUtilsFunction();

  // Determine wholesaler status from Context or Cookies
  const { state } = useContext(UserContext) || {};
  const isWholesaler = useMemo(() => {
    let role = state?.userInfo?.role;
    if (!role && typeof window !== "undefined") {
      try {
        const cookieUser = Cookies.get("userInfo");
        if (cookieUser) role = JSON.parse(cookieUser)?.role;
      } catch (e) { }
    }
    return role && role.toString().toLowerCase() === "wholesaler";
  }, [state]);

  // Filter products that have at least a 20% discount and match wholesaler criteria
  const dealProducts = useMemo(() => {
    if (!products) return [];

    return products
      .map(p => {
        const retailPrice = getNumber(p?.prices?.price);
        const originalPrice = getNumber(p?.prices?.originalPrice);
        let discountPercent = 0;
        if (originalPrice > retailPrice) {
          discountPercent = Math.round(((originalPrice - retailPrice) / originalPrice) * 100);
        }
        return { ...p, discountPercent };
      })
      .filter(p => p.discountPercent >= 20)
      .filter(p => {
        if (!isWholesaler) return true;
        // If wholesaler, only show products with wholesale pricing or marked as wholesaler
        return (p.wholePrice && Number(p.wholePrice) > 0) || p.isWholesaler;
      });
  }, [products, isWholesaler, getNumber]);

  if (!dealProducts || dealProducts.length === 0) return null;

  return (
    <div id="hot-deals" className="relative lg:py-20 py-10 overflow-hidden bg-[#FFF1F2]">
      {/* Dynamic Mesh Background Accents */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-orange-100/50 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 -right-24 w-80 h-80 bg-emerald-100/40 rounded-full blur-[80px]" />
      </div>

      <div className="mx-auto max-w-screen-2xl px-4 sm:px-10 relative z-10">
        <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-orange-600 to-red-500 text-white text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-orange-100">
              <IoFlash className="animate-pulse" /> Hot Deals
            </div>
            <SectionHeader
              title="Deals You'll Love"
              subtitle="Grab these limited-time offers before they're gone!"
              align="left"
            />
          </div>
        </div>

        <div className="relative group/slider">
          <Swiper
            modules={[Navigation, Autoplay]}
            spaceBetween={16}
            slidesPerView={2}
            navigation={{ prevEl: ".prev-deals", nextEl: ".next-deals" }}
            autoplay={{ delay: 3500, disableOnInteraction: false, pauseOnMouseEnter: true }}
            breakpoints={{
              640: { slidesPerView: 3 },
              768: { slidesPerView: 4 },
              1024: { slidesPerView: 5 },
              1280: { slidesPerView: 6 },
            }}
            className="mySwiper !pb-14 !pt-2 px-2"
          >
            {dealProducts.map((product) => (
              <SwiperSlide key={product._id} className="h-auto">
                {/* Use the ProductCard directly to fix Add to Cart and Image visibility */}
                <ProductCard product={product} attributes={attributes} />
              </SwiperSlide>
            ))}
          </Swiper>

          {/* Navigation Controls */}
          <button className="prev-deals absolute top-1/2 -left-4 z-20 bg-white shadow-2xl rounded-full p-3 hover:bg-emerald-600 hover:text-white transition-all transform -translate-y-1/2 opacity-0 group-hover/slider:opacity-100 hidden md:flex border border-gray-100 items-center justify-center">
            <IoChevronBack className="text-xl" />
          </button>
          <button className="next-deals absolute top-1/2 -right-4 z-20 bg-white shadow-2xl rounded-full p-3 hover:bg-emerald-600 hover:text-white transition-all transform -translate-y-1/2 opacity-0 group-hover/slider:opacity-100 hidden md:flex border border-gray-100 items-center justify-center">
            <IoChevronForward className="text-xl" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DealsYouLove;