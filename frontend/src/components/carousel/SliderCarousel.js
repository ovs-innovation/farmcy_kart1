import Link from "next/link";
import React, { useRef } from "react";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";
import useGetSetting from "@hooks/useGetSetting";
import useUtilsFunction from "@hooks/useUtilsFunction";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

const SliderCarousel = () => {
  const { storeCustomizationSetting } = useGetSetting();
  const { showingImage } = useUtilsFunction();
  const prevRef = useRef(null);
  const nextRef = useRef(null);

  const { left_right_arrow, bottom_dots, both_slider } = storeCustomizationSetting?.slider || {};
  const showArrows = left_right_arrow || both_slider;
  const showDots = bottom_dots || both_slider;

  // Get all slider images and links from CMS
  const backendSliderData = [
    {
      img: storeCustomizationSetting?.slider?.first_img,
      slug: storeCustomizationSetting?.slider?.first_productSlug,
      catSlug: storeCustomizationSetting?.slider?.first_categorySlug,
      catId: storeCustomizationSetting?.slider?.first_categoryId
    },
    {
      img: storeCustomizationSetting?.slider?.second_img,
      slug: storeCustomizationSetting?.slider?.second_productSlug,
      catSlug: storeCustomizationSetting?.slider?.second_categorySlug,
      catId: storeCustomizationSetting?.slider?.second_categoryId
    },
    {
      img: storeCustomizationSetting?.slider?.third_img,
      slug: storeCustomizationSetting?.slider?.third_productSlug,
      catSlug: storeCustomizationSetting?.slider?.third_categorySlug,
      catId: storeCustomizationSetting?.slider?.third_categoryId
    },
    {
      img: storeCustomizationSetting?.slider?.four_img,
      slug: storeCustomizationSetting?.slider?.four_productSlug,
      catSlug: storeCustomizationSetting?.slider?.four_categorySlug,
      catId: storeCustomizationSetting?.slider?.four_categoryId
    },
    {
      img: storeCustomizationSetting?.slider?.five_img,
      slug: storeCustomizationSetting?.slider?.five_productSlug,
      catSlug: storeCustomizationSetting?.slider?.five_categorySlug,
      catId: storeCustomizationSetting?.slider?.five_categoryId
    },
  ].filter(item => item.img).map(item => ({
    ...item,
    img: showingImage(item.img)
  }));

  const defaultSliderData = [
    { img: "/slider/dss11.webp" },
    { img: "/slider/dss22.webp" },
  ];

  const sliderData = backendSliderData.length > 0 ? backendSliderData : defaultSliderData;

  // Don't render if no images
  if (!sliderData || sliderData.length === 0) {
    return null;
  }

  return (
    <div className="w-full bg-white  ">
      <div className="mx-auto max-w-screen-2xl px-3 sm:px-10">
        <div className="relative">
          <Swiper
            onInit={(swiper) => {
              if (showArrows) {
                swiper.params.navigation.prevEl = prevRef.current;
                swiper.params.navigation.nextEl = nextRef.current;
                swiper.navigation.init();
                swiper.navigation.update();
              }
            }}
            modules={[Autoplay, Navigation, Pagination]}
            spaceBetween={30}
            slidesPerView={1}
            pagination={showDots ? { clickable: true } : false}
            navigation={showArrows ? {
              prevEl: prevRef.current,
              nextEl: nextRef.current,
            } : false}
            breakpoints={{
              640: {
                slidesPerView: 2,
                spaceBetween: 20,
              },
              1024: {
                slidesPerView: 2,
                spaceBetween: 30,
              },
            }}
            autoplay={{
              delay: 2000,
              disableOnInteraction: false,
              pauseOnMouseEnter: false,
            }}
            loop={false}
            className="slider-carousel-swiper"
          >
            {sliderData.map((item, index) => (
              <SwiperSlide key={index}>
                <div className="relative w-full h-[200px] sm:h-[250px] md:h-[300px] lg:h-[400px] rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                  {item.slug ? (
                    <Link href={`/product/${item.slug}`} className="relative w-full h-full block">
                      <Image
                        src={item.img || "/placeholder.png"}
                        alt={`Slider ${index + 1}`}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-contain cursor-pointer hover:scale-105 transition-transform duration-500"
                        priority={index === 0}
                      />
                    </Link>
                  ) : item.catSlug ? (
                    <Link href={`/search?category=${item.catSlug}${item.catId ? `&_id=${item.catId}` : ""}`} className="relative w-full h-full block">
                      <Image
                        src={item.img || "/placeholder.png"}
                        alt={`Slider ${index + 1}`}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-contain cursor-pointer hover:scale-105 transition-transform duration-500"
                        priority={index === 0}
                      />
                    </Link>
                  ) : (
                    <Image
                      src={item.img || "/placeholder.png"}
                      alt={`Slider ${index + 1}`}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-contain"
                      priority={index === 0}
                    />
                  )}
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          {/* Navigation Buttons */}
          {showArrows && (
            <>
              <button
                ref={prevRef}
                className="prev-slider absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg border border-gray-100 rounded-full p-2 hover:bg-store-50 transition-colors transform -translate-x-4"
              >
                <IoChevronBack className="text-xl text-gray-600" />
              </button>
              <button
                ref={nextRef}
                className="next-slider absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg border border-gray-100 rounded-full p-2 hover:bg-store-50 transition-colors transform translate-x-4"
              >
                <IoChevronForward className="text-xl text-gray-600" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SliderCarousel;

