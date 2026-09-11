import React from "react";
import Image from "next/image";
import Link from "next/link";
import useUtilsFunction from "@hooks/useUtilsFunction";
import useGetSetting from "@hooks/useGetSetting";
import { getPalette } from "@utils/themeColors";

const TrustedBrandsSection = ({ brands = [] }) => {
  const { showingTranslateValue, showingImage } = useUtilsFunction();
  const { storeCustomizationSetting } = useGetSetting();
  const storeColor = storeCustomizationSetting?.theme?.color || "green";
  const palette = getPalette(storeColor);

  // Filter brands that have logos
  const brandsWithLogos = brands.filter(brand => brand?.logo && brand.logo.trim() !== '');

  if (!brandsWithLogos.length) return null;

  return (
    <div className="bg-white ">
      <div className="w-full px-4 sm:px-6 lg:px-10">
        <div className=" ">
          {/* Left Side - Title and Description */}
          <div className="order-1 lg:order-1">
            <h2 className="text-2xl md:text-3xl lg:text-3xl font-bold text-gray-900 mt-10 mb-4">
              {storeCustomizationSetting?.home?.brand_title || "Top Brands You Can Trust"}
            </h2>


          </div>

          {/* Right Side - Full-width horizontal marquee */}
          <div className="  w-full">
            <div className="relative overflow-hidden w-full">
              <div className="flex gap-6 items-center marquee-track"  >
                {/* First set of brands */}
                {brandsWithLogos.map((brand) => {
                  const logoUrl = showingImage(brand.logo) || "https://res.cloudinary.com/ahossain/image/upload/v1655097002/placeholder_kvepfp.png";
                  return (
                    <Link
                      key={`brand-marquee-1-${brand._id}`}
                      href={`/search?brand=${brand._id}`}
                      className="flex-shrink-0 group"
                    >
                      <div className="bg-white rounded-xl p-3 md:p-4 shadow-sm hover:shadow-md transition-all duration-300 w-20 h-20 md:w-28 md:h-28 flex items-center justify-center border border-gray-100 relative overflow-hidden">
                        <Image
                          src={logoUrl}
                          alt={showingTranslateValue(brand.name) || "Brand"}
                          fill
                          sizes="(max-width: 768px) 80px, 112px"
                          className="object-contain p-2 group-hover:scale-110 transition-transform duration-300"
                          unoptimized
                        />
                      </div>
                    </Link>
                  );
                })}
                {/* Duplicate set for seamless looping */}
                {brandsWithLogos.map((brand) => {
                  const logoUrl = showingImage(brand.logo) || "https://res.cloudinary.com/ahossain/image/upload/v1655097002/placeholder_kvepfp.png";
                  return (
                    <Link
                      key={`brand-marquee-2-${brand._id}`}
                      href={`/search?brand=${brand._id}`}
                      className="flex-shrink-0 group"
                    >
                      <div className="bg-white rounded-xl p-3 md:p-4 shadow-sm hover:shadow-md transition-all duration-300 w-20 h-20 md:w-28 md:h-28 flex items-center justify-center border border-gray-100 relative overflow-hidden">
                        <Image
                          src={logoUrl}
                          alt={showingTranslateValue(brand.name) || "Brand"}
                          fill
                          sizes="(max-width: 768px) 80px, 112px"
                          className="object-contain p-2 group-hover:scale-110 transition-transform duration-300"
                          unoptimized
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CSS Animation for Vertical Scrolling */}
      <style dangerouslySetInnerHTML={{
        __html: `
          /* Horizontal marquee animation */
          @keyframes marqueeLeft {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .marquee-track {
            display: inline-flex;
            gap: 1.5rem;
            width: max-content;
            will-change: transform;
            animation: marqueeLeft 6s linear infinite;
          }
          /* Pause on hover */
          .marquee-track:hover {
            animation-play-state: paused;
          }

          /* Ensure images don't stretch when container shrinks */
          .marquee-track .group {
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }

          /* Reduce movement speed on small screens */
          @media (max-width: 640px) {
            .marquee-track {
              animation-duration: 10s;
            }
          }
        `
      }} />
    </div>
  );
};

export default TrustedBrandsSection;

