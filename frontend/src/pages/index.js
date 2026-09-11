import { useContext, useEffect } from "react";
import { UserContext } from "@context/UserContext";
import { useRouter } from "next/router";
import Image from "next/image";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";
import { IoChevronBack, IoChevronForward, IoSparkles } from "react-icons/io5";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/autoplay";
import dynamic from "next/dynamic";

const SuggestedProducts = dynamic(() => import("@components/product/SuggestedProducts"), {
  ssr: false,
});

//internal import
import { SidebarContext } from "@context/SidebarContext";
import Layout from "@layout/Layout";
import Banner from "@components/banner/Banner";
import useGetSetting from "@hooks/useGetSetting";
import OfferCard from "@components/offer/OfferCard";
import Loading from "@components/preloader/Loading";
import ProductServices from "@services/ProductServices";
import ProductCard from "@components/product/ProductCard";
import HeroBanner from "@components/banner/HeroBanner";
import OrderOptions from "@components/cta-card/OrderOptions";
import FeatureCategory from "@components/category/FeatureCategory";
import HealthCheckupBanner from "@components/banner/HealthCheckupBanner";
import CategoryCards from "@components/category/CategoryCards";
import AttributeServices from "@services/AttributeServices";
import CMSkeleton from "@components/preloader/CMSkeleton";
import BrandSection from "@components/brand/BrandSection";
import TrustedBrandsSection from "@components/brand/TrustedBrandsSection";
import BrandServices from "@services/BrandServices";
import SectionHeader from "@components/common/SectionHeader";
import SliderCarousel from "@components/carousel/SliderCarousel";
import TestimonialsSection from "@components/testimonial/TestimonialsSection";
import DealsYouLove from "@components/carousel/DealsYouLove";

const Home = ({ popularProducts, discountProducts, bestSellingProducts, attributes, brands }) => {
  const router = useRouter();
  const { isLoading, setIsLoading } = useContext(SidebarContext);
  const { state } = useContext(UserContext) || {};
  const isWholesaler = state?.userInfo?.role && state.userInfo.role.toString().toLowerCase() === "wholesaler";
  const { loading, error, storeCustomizationSetting } = useGetSetting();

  // console.log("storeCustomizationSetting", storeCustomizationSetting);

  useEffect(() => {
    if (router.asPath === "/") {
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, [router]);

  return (
    <>
      {isLoading ? (
        <Loading loading={isLoading} />
      ) : (
        <Layout>
          <div className="min-h-screen">
            <div className="bg-white">
              <div className="mx-auto py-3 max-w-screen-2xl">
                <div className="flex w-full flex-col">
                  <div className="w-full">
                    <HeroBanner />
                  </div>
                  {/* Slider Carousel */}
                  <div className="md:hidden">
                    <SliderCarousel />
                  </div>
                  <div className="w-full">
                    <OrderOptions />
                  </div>
                  {/* Slider Carousel */}
                  <div className="hidden md:block">
                    <SliderCarousel />
                  </div>
                </div>

              </div>
            </div>

            {/* feature category's */}
            {storeCustomizationSetting?.home?.featured_status && (
              <div id="feature-category" className="bg-white lg:py-12 pt-6 pb-10">
                <div className="mx-auto max-w-screen-2xl px-3 sm:px-10">
                  <div className="flex flex-row justify-between items-end mb-4">
                    <div className="flex-1">
                      <SectionHeader
                        title={storeCustomizationSetting?.home?.feature_title || "Featured Categories"}
                        subtitle={storeCustomizationSetting?.home?.feature_description || "Explore our handpicked selection of featured categories"}
                        loading={loading}
                        error={error}
                        align="left"
                      />
                    </div>
                    <Link
                      href="/categories"
                      className="border border-emerald-700 text-emerald-700 font-bold rounded-full px-4 md:px-6 py-1.5 md:py-2 flex items-center justify-center hover:bg-emerald-50 transition text-xs md:text-sm whitespace-nowrap flex-shrink-0 mb-1 ml-2"
                    >
                      View All <span className="ml-1 text-base">&gt;</span>
                    </Link>
                  </div>
                  <FeatureCategory attributes={attributes} />
                </div>
              </div>
            )}


            {/* Suggested For You Section */}
            <div className="bg-white lg:py-16 py-10">
              <div className="mx-auto max-w-screen-2xl px-3 sm:px-10">
                <div className="mt-4">
                  {/* Renders personalized suggestions for user/guest */}
                  {/* If you want to move this, just change the position */}
                  <SuggestedProducts />
                </div>
              </div>
            </div>
            {/* Deals You'll Love Section */}
            {/* Do not render deals section for wholesalers */}
            {!isWholesaler && discountProducts?.length > 0 && (
              <DealsYouLove products={discountProducts} />
            )}

            {/* popular products */}
            {storeCustomizationSetting?.home?.popular_products_status && (
              <div className="lg:py-16 py-10 mx-auto max-w-screen-2xl px-3 sm:px-10">
                <SectionHeader
                  title={storeCustomizationSetting?.home?.popular_title || "Popular Products"}
                  subtitle={storeCustomizationSetting?.home?.popular_description || "Discover our most loved and trending products"}
                  loading={loading}
                  error={error}
                  align="left"
                />
                <div className="bg-purple-50 flex w-full relative group px-4 py-4">
                  <div className="w-full">
                    {loading ? (
                      <CMSkeleton
                        count={20}
                        height={20}
                        error={error}
                        loading={loading}
                      />
                    ) : (
                      <>
                        <Swiper
                          modules={[Navigation, Autoplay]}
                          spaceBetween={10}
                          slidesPerView={2}
                          loop={(popularProducts?.length || 0) >= 5}
                          navigation={{
                            prevEl: ".prev-popular",
                            nextEl: ".next-popular",
                          }}
                          autoplay={{
                            delay: 2500,
                            disableOnInteraction: false,
                            pauseOnMouseEnter: true
                          }}
                          breakpoints={{
                            640: { slidesPerView: 2, spaceBetween: 10 },
                            768: { slidesPerView: 3, spaceBetween: 20 },
                            1024: { slidesPerView: 4, spaceBetween: 20 },
                            1280: { slidesPerView: 5, spaceBetween: 20 },
                          }}
                          className="mySwiper px-2 py-2"
                        >
                          {(isWholesaler ? popularProducts.filter(p => (p.wholePrice && Number(p.wholePrice) > 0) || p.isWholesaler) : popularProducts)
                            ?.slice(
                              0,
                              storeCustomizationSetting?.home
                                ?.popular_product_limit
                            )
                            .map((product) => (
                              <SwiperSlide key={product._id}>
                                <ProductCard
                                  product={product}
                                  attributes={attributes}
                                />
                              </SwiperSlide>
                            ))}
                        </Swiper>
                        <button className="prev-popular absolute top-1/2 -left-2 md:-left-4 z-10 bg-white shadow-lg border border-gray-100 rounded-full p-2 hover:bg-store-50 transition-colors transform -translate-y-1/2 disabled:opacity-50 disabled:cursor-not-allowed">
                          <IoChevronBack className="text-xl text-gray-600" />
                        </button>
                        <button className="next-popular absolute top-1/2 -right-2 md:-right-4 z-10 bg-white shadow-lg border border-gray-100 rounded-full p-2 hover:bg-store-50 transition-colors transform -translate-y-1/2 disabled:opacity-50 disabled:cursor-not-allowed">
                          <IoChevronForward className="text-xl text-gray-600" />
                        </button>

                        <div className="flex justify-end mt-4 px-2">
                          <Link href="/search?sort=newest" className="inline-flex items-center gap-1 text-sm font-semibold text-store-500 border border-store-500 rounded-full px-4 py-1 hover:bg-store-500 hover:text-white transition-colors">
                            View All <IoChevronForward />
                          </Link>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}



            {/* <div className="w-full px-3 sm:px-10">
                    <HealthCheckupBanner />
                  </div> */}
            {/* best selling products */}
            {bestSellingProducts?.length > 0 && (
              <div className="relative lg:py-24 py-12 overflow-hidden bg-[#8fbdae33]">
                {/* Background Decorative Blobs - Creates the "Mesh" look */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
                  <div className="absolute -top-24 -left-24 w-[500px] h-[500px] bg-emerald-100/40 rounded-full blur-[120px]" />
                  <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-blue-50/50 rounded-full blur-[100px]" />
                </div>

                <div className="mx-auto max-w-screen-2xl px-4 sm:px-12 relative z-10">
                  {/* Header Section */}
                  <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
                    <div className="space-y-3">
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 text-white text-[11px] font-extrabold uppercase tracking-widest shadow-lg shadow-emerald-100">
                        <IoSparkles className="animate-pulse text-yellow-300" />
                        <span>Popular Choice</span>
                      </div>
                      <SectionHeader
                        title={storeCustomizationSetting?.home?.best_selling_title || "Best Selling Products"}
                        subtitle={storeCustomizationSetting?.home?.best_selling_description || "Explore our top-rated essentials, loved by thousands of customers."}
                        align="left"
                      />
                    </div>

                    <Link
                      href="/search?sort=best-selling"
                      className="group flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-800 transition-all"
                    >
                      Explore All
                      <div className="p-2 rounded-full bg-white shadow-sm border border-gray-100 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                        <IoChevronForward />
                      </div>
                    </Link>
                  </div>

                  {/* Slider Area */}
                  <div className="relative group/slider">
                    {loading ? (
                      <CMSkeleton count={20} height={20} error={error} loading={loading} />
                    ) : (
                      <div className="relative px-2">
                        {/* Custom Floating Navigation */}
                        <button className="prev-best-selling absolute top-1/2 -left-4 lg:-left-12 z-30 bg-white/90 backdrop-blur-md shadow-xl border border-white rounded-2xl p-4 hover:bg-emerald-600 hover:text-white transition-all transform -translate-y-1/2 opacity-0 group-hover/slider:opacity-100 translate-x-4 group-hover/slider:translate-x-0 hidden md:flex items-center justify-center">
                          <IoChevronBack className="text-xl" />
                        </button>

                        <button className="next-best-selling absolute top-1/2 -right-4 lg:-right-12 z-30 bg-white/90 backdrop-blur-md shadow-xl border border-white rounded-2xl p-4 hover:bg-emerald-600 hover:text-white transition-all transform -translate-y-1/2 opacity-0 group-hover/slider:opacity-100 -translate-x-4 group-hover/slider:translate-x-0 hidden md:flex items-center justify-center">
                          <IoChevronForward className="text-xl" />
                        </button>

                        {/* Slider with subtle Glassmorphism container */}
                        <div className="rounded-[2rem] p-2 bg-white/30 backdrop-blur-[2px] border border-white/50 shadow-sm">
                          <Swiper
                            modules={[Navigation, Autoplay]}
                            spaceBetween={15}
                            slidesPerView={2}
                            loop={(bestSellingProducts?.length || 0) >= 5}
                            navigation={{
                              prevEl: ".prev-best-selling",
                              nextEl: ".next-best-selling",
                            }}
                            autoplay={{
                              delay: 4000,
                              disableOnInteraction: false,
                              pauseOnMouseEnter: true
                            }}
                            breakpoints={{
                              640: { slidesPerView: 2, spaceBetween: 15 },
                              768: { slidesPerView: 3, spaceBetween: 20 },
                              1024: { slidesPerView: 4, spaceBetween: 25 },
                              1280: { slidesPerView: 5, spaceBetween: 25 },
                            }}
                            className="mySwiper !pb-10 !pt-4"
                          >
                            {(isWholesaler
                              ? bestSellingProducts.filter(p => (p.wholePrice && Number(p.wholePrice) > 0) || p.isWholesaler)
                              : bestSellingProducts
                            )
                              ?.slice(0, 10)
                              .map((product) => (
                                <SwiperSlide key={product._id}>
                                  <div className="h-full transform hover:-translate-y-2 transition-transform duration-500">
                                    <ProductCard
                                      product={product}
                                      attributes={attributes}
                                    />
                                  </div>
                                </SwiperSlide>
                              ))}
                          </Swiper>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* //  promotional banner card */}
            {storeCustomizationSetting?.home?.delivery_status &&
              (storeCustomizationSetting?.home?.promotional_banner_image1 ||
                storeCustomizationSetting?.home?.promotional_banner_image2 ||
                storeCustomizationSetting?.home?.promotional_banner_image3) && (
                <div className="mx-auto max-w-screen-2xl px-4 sm:px-10">
                  <div className="shadow-sm border rounded-lg p-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {storeCustomizationSetting?.home?.promotional_banner_image1 && (
                        <div className="md:col-span-2">
                          <Link href={
                            storeCustomizationSetting?.home?.promotional_banner_productSlug1 
                              ? `/product/${storeCustomizationSetting.home.promotional_banner_productSlug1}` 
                              : storeCustomizationSetting?.home?.promotional_banner_categorySlug1 
                                ? `/search?category=${storeCustomizationSetting.home.promotional_banner_categorySlug1}${storeCustomizationSetting.home.promotional_banner_categoryId1 ? `&_id=${storeCustomizationSetting.home.promotional_banner_categoryId1}` : ""}` 
                                : (storeCustomizationSetting?.home?.promotional_banner_link1 || "#")
                          }>
                            <Image
                              width={500}
                              height={48}
                              alt="Offer Banner 1"
                              className="w-full h-[240px] sm:h-[320px] md:h-[550px] rounded object-cover"
                              src={storeCustomizationSetting?.home?.promotional_banner_image1}
                              priority={false}
                            />
                          </Link>
                        </div>
                      )}

                      <div className="md:col-span-1 flex flex-col gap-2">
                        {storeCustomizationSetting?.home?.promotional_banner_image2 && (
                          <Link href={
                            storeCustomizationSetting?.home?.promotional_banner_productSlug2 
                              ? `/product/${storeCustomizationSetting.home.promotional_banner_productSlug2}` 
                              : storeCustomizationSetting?.home?.promotional_banner_categorySlug2 
                                ? `/search?category=${storeCustomizationSetting.home.promotional_banner_categorySlug2}${storeCustomizationSetting.home.promotional_banner_categoryId2 ? `&_id=${storeCustomizationSetting.home.promotional_banner_categoryId2}` : ""}` 
                                : (storeCustomizationSetting?.home?.promotional_banner_link2 || "#")
                          }>
                            <Image
                              width={500}
                              height={100}
                              alt="Offer Banner 2"
                              className="w-full h-[160px] sm:h-[200px] md:h-[271px] rounded object-cover"
                              src={storeCustomizationSetting?.home?.promotional_banner_image2}
                              priority={false}
                            />
                          </Link>
                        )}
                        {storeCustomizationSetting?.home?.promotional_banner_image3 && (
                          <Link href={
                            storeCustomizationSetting?.home?.promotional_banner_productSlug3 
                              ? `/product/${storeCustomizationSetting.home.promotional_banner_productSlug3}` 
                              : storeCustomizationSetting?.home?.promotional_banner_categorySlug3 
                                ? `/search?category=${storeCustomizationSetting.home.promotional_banner_categorySlug3}${storeCustomizationSetting.home.promotional_banner_categoryId3 ? `&_id=${storeCustomizationSetting.home.promotional_banner_categoryId3}` : ""}` 
                                : (storeCustomizationSetting?.home?.promotional_banner_link3 || "#")
                          }>
                            <Image
                              width={600}
                              height={600}
                              alt="Offer Banner 3"
                              className="w-full h-[160px] sm:h-[200px] md:h-[271px] rounded object-cover"
                              src={storeCustomizationSetting?.home?.promotional_banner_image3}
                              priority={false}
                            />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}



            {/* discounted products */}
            {storeCustomizationSetting?.home?.discount_product_status &&
              discountProducts?.length > 0 && (
                <div
                  id="discount"
                  className="lg:py-16 py-10 mx-auto max-w-screen-2xl px-3 sm:px-10"
                >
                  <SectionHeader
                    title={storeCustomizationSetting?.home?.latest_discount_title || "Discounted Products"}
                    subtitle={storeCustomizationSetting?.home?.latest_discount_description || "Grab amazing deals on our discounted products"}
                    loading={loading}
                    error={error}
                    align="left"
                  />
                  <div className="bg-rose-50 py-4 px-4 flex w-full relative group">
                    <div className="w-full">
                      {loading ? (
                        <CMSkeleton
                          count={20}
                          height={20}
                          error={error}
                          loading={loading}
                        />
                      ) : (
                        <>
                          <Swiper
                            modules={[Navigation, Autoplay]}
                            spaceBetween={10}
                            slidesPerView={2}
                            loop={(discountProducts?.length || 0) >= 5}
                            navigation={{
                              prevEl: ".prev-discount",
                              nextEl: ".next-discount",
                            }}
                            autoplay={{
                              delay: 2500,
                              disableOnInteraction: false,
                              pauseOnMouseEnter: true
                            }}
                            breakpoints={{
                              640: { slidesPerView: 2, spaceBetween: 10 },
                              768: { slidesPerView: 3, spaceBetween: 20 },
                              1024: { slidesPerView: 4, spaceBetween: 20 },
                              1280: { slidesPerView: 5, spaceBetween: 20 },
                            }}
                            className="mySwiper px-2 py-2"
                          >
                            {(isWholesaler ? discountProducts.filter(p => (p.wholePrice && Number(p.wholePrice) > 0) || p.isWholesaler) : discountProducts)
                              ?.slice(
                                0,
                                storeCustomizationSetting?.home
                                  ?.latest_discount_product_limit
                              )
                              .map((product) => (
                                <SwiperSlide key={product._id}>
                                  <ProductCard
                                    product={product}
                                    attributes={attributes}
                                  />
                                </SwiperSlide>
                              ))}
                          </Swiper>
                          <button className="prev-discount absolute top-1/2 -left-2 md:-left-4 z-10 bg-white shadow-lg border border-gray-100 rounded-full p-2 hover:bg-store-50 transition-colors transform -translate-y-1/2 disabled:opacity-50 disabled:cursor-not-allowed">
                            <IoChevronBack className="text-xl text-gray-600" />
                          </button>
                          <button className="next-discount absolute top-1/2 -right-2 md:-right-4 z-10 bg-white shadow-lg border border-gray-100 rounded-full p-2 hover:bg-store-50 transition-colors transform -translate-y-1/2 disabled:opacity-50 disabled:cursor-not-allowed">
                            <IoChevronForward className="text-xl text-gray-600" />
                          </button>

                          <div className="flex justify-end mt-4 px-2">
                            <Link href={`/search?category=${storeCustomizationSetting?.home?.discount_categorySlug}${storeCustomizationSetting?.home?.discount_categoryId ? `&_id=${storeCustomizationSetting?.home?.discount_categoryId}` : ""}`} className="inline-flex items-center gap-1 text-sm font-semibold text-store-500 border border-store-500 rounded-full px-4 py-1 hover:bg-store-500 hover:text-white transition-colors">
                              View All <IoChevronForward />
                            </Link>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

            {/* Category Cards Section */}
            <CategoryCards />

            {/* Testimonials Section */}
            <TestimonialsSection />

            {/* Trusted Brands Section */}
            <TrustedBrandsSection brands={brands} />
          </div>
        </Layout>
      )}
    </>
  );
};

export const getServerSideProps = async (context) => {
  const { cookies } = context.req;
  const { query, _id } = context.query;

  const [dataResult, attributesResult, brandsResult] = await Promise.allSettled([
    ProductServices.getShowingStoreProducts({
      category: _id ? _id : "",
      title: query ? query : "",
    }),
    AttributeServices.getShowingAttributes(),
    BrandServices.getShowingBrands(),
  ]);

  const data = dataResult.status === "fulfilled" ? dataResult.value : null;
  const attributes =
    attributesResult.status === "fulfilled" ? attributesResult.value : [];
  const brands = brandsResult.status === "fulfilled" ? brandsResult.value : [];

  if (dataResult.status === "rejected") {
    console.warn(
      "getServerSideProps: products fetch failed.",
      dataResult.reason?.message || dataResult.reason
    );
  }

  return {
    props: {
      attributes: attributes || [],
      cookies: cookies,
      popularProducts: data?.popularProducts || [],
      discountProducts: data?.discountedProducts || [],
      bestSellingProducts: data?.bestSellingProducts || [],
      brands: brands || [],
    },
  };
};

export default Home;

