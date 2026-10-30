import React from "react";
import { useRouter } from "next/router";
import { FiShoppingBag, FiBriefcase, FiPlus } from "react-icons/fi";
import useGetSetting from "@hooks/useGetSetting";
import useUtilsFunction from "@hooks/useUtilsFunction";
import { getPalette } from "@utils/themeColors";

const HealthCheckupBanner = () => {
  const router = useRouter();
  const { storeCustomizationSetting } = useGetSetting();
  const { showingTranslateValue } = useUtilsFunction();
  const storeColor = storeCustomizationSetting?.theme?.color || "green";
  const palette = getPalette(storeColor);

  const handleBuyNow = () => {
    router.push("/search");
  };

  return (
    <div className="relative w-full overflow-hidden rounded-2xl mt-6">
      {/* Blurred Background with Overlay */}
      <div 
        className="relative w-full py-16 md:py-20 px-6 md:px-12"
        style={{
          backgroundImage: `linear-gradient(135deg, ${palette[500]}f0 0%, ${palette[600]}f0 100%), url('data:image/svg+xml,%3Csvg width="100" height="100" xmlns="http://www.w3.org/2000/svg"%3E%3Cdefs%3E%3Cpattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse"%3E%3Cpath d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1"/%3E%3C/pattern%3E%3C/defs%3E%3Crect width="100" height="100" fill="url(%23grid)" /%3E%3C/svg%3E')`,
          backgroundSize: 'cover, 200px 200px',
          backgroundPosition: 'center, center',
          backgroundBlendMode: 'overlay',
          backdropFilter: 'blur(2px)',
        }}
      >
        {/* Content Container */}
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {/* Medical Bag Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-white bg-opacity-20 rounded-full blur-xl"></div>
              <div className="relative bg-white bg-opacity-10 backdrop-blur-sm p-6 rounded-2xl border-2 border-white border-opacity-30">
                <div className="relative flex items-center justify-center">
                  <FiBriefcase className="text-5xl md:text-6xl text-white" />
                  {/* Medical Cross Badge */}
                  <div className="absolute top-0 right-0 bg-white rounded-full p-2 transform translate-x-2 -translate-y-2 shadow-lg">
                    <div className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: palette[600] }}>
                      <FiPlus className="text-white text-lg font-bold" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Headline */}
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white uppercase tracking-wide mb-4 drop-shadow-lg">
            {showingTranslateValue(storeCustomizationSetting?.home?.health_banner_title) || "HEALTHY WEEKEND CHECK UP"}
          </h2>

          {/* Sub-headline */}
          <p className="text-base md:text-lg lg:text-xl text-white text-opacity-95 mb-8 max-w-2xl mx-auto leading-relaxed drop-shadow-md">
            {showingTranslateValue(storeCustomizationSetting?.home?.health_banner_description) || "Book your comprehensive health checkup with trusted local labs today!"}
          </p>

          {/* Buy Now Button */}
          <button
            onClick={handleBuyNow}
            className="inline-flex items-center justify-center px-8 py-4 text-white font-semibold uppercase tracking-wider rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-lg border-2 border-white border-opacity-30 backdrop-blur-sm"
            style={{ 
              backgroundColor: palette[600],
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = palette[700];
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = palette[600];
            }}
          >
            <FiShoppingBag className="mr-2 text-xl" />
            Buy Now
          </button>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white bg-opacity-10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-white bg-opacity-10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-white bg-opacity-5 rounded-full blur-2xl"></div>
        </div>
      </div>
    </div>
  );
};

export default HealthCheckupBanner;

