import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useRouter } from "next/router";
import useTranslation from "next-translate/useTranslation";
import { IoArrowForward } from "react-icons/io5";
import {
  FacebookIcon,
  LinkedinIcon,
  PinterestIcon,
  TwitterIcon,
  WhatsappIcon,
} from "react-share";
import { FaInstagram } from "react-icons/fa";
import {
  FiMail,
  FiPhone,
  FiMapPin,
  FiChevronRight,
  FiChevronDown,
  FiFileText,
  FiShield,
  FiRefreshCw,
  FiTruck,
  FiUser,
  FiShoppingBag,
  FiPackage,
  FiSettings,
  FiMessageSquare,
} from "react-icons/fi";

//internal import
import { getUserSession } from "@lib/auth";
import useGetSetting from "@hooks/useGetSetting";
import { pickBrandLogo } from "@utils/brandAssets";
import CMSkeleton from "@components/preloader/CMSkeleton";
import useUtilsFunction from "@hooks/useUtilsFunction";
import FeatureCard from "@components/feature-card/FeatureCard";
import NewsletterServices from "@services/NewsletterServices";
import { notifySuccess, notifyError } from "@utils/toast";

const Footer = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const userInfo = getUserSession();

  const { showingTranslateValue } = useUtilsFunction();
  const { loading, storeCustomizationSetting, globalSetting } = useGetSetting();
  const storeColor = storeCustomizationSetting?.theme?.color || "green";
  const [email, setEmail] = useState("");
  const [loadingSubscribe, setLoadingSubscribe] = useState(false);

  // State for collapsible sections on mobile (only first 3 blocks)
  const [openSections, setOpenSections] = useState({
    block1: false,
    block2: false,
    block3: false,
  });

  const toggleSection = (section) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleAnchorClick = (e, href) => {
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

  const getCategoryLink = (linkProp, defaultLink, titleData) => {
    const titleText = (typeof titleData === "string" ? titleData : showingTranslateValue(titleData)) || "";
    if (titleText.toLowerCase().includes("offer") || titleText.toLowerCase().includes("deal")) {
      return "/#hot-deals";
    }
    if (linkProp && (linkProp.includes("hot-deals") || linkProp.toLowerCase().includes("offer") || linkProp.toLowerCase().includes("deal"))) {
      return "/#hot-deals";
    }
    if (!linkProp || linkProp === "undefined" || linkProp === "null" || linkProp === "#") {
      if (defaultLink && (defaultLink.toLowerCase().includes("offer") || defaultLink.toLowerCase().includes("deal"))) {
        return "/#hot-deals";
      }
      return defaultLink;
    }
    if (linkProp.includes("fish-meat") || linkProp.includes("breakfast") || linkProp.includes("medicines")) return "/search?sort=newest";
    if (linkProp.includes("drinks") || linkProp.includes("soft-drink") || linkProp.includes("medical-devices")) return "/search?sort=newest";
    if (!linkProp.includes("sort=") && !linkProp.startsWith("/#")) {
      return linkProp.includes("?") ? `${linkProp}&sort=newest` : `${linkProp}?sort=newest`;
    }
    return linkProp;
  };

  // SafeLink: render a Next <Link> only when href is provided, otherwise render a span
  // This prevents Next Link prop-type errors when CMS settings don't include a URL
  const SafeLink = ({ href, children, onClick, ...props }) => {
    if (!href) {
      // remove props that are only valid on anchor elements
      const { target, rel, ...safeProps } = props;
      return <span {...safeProps}>{children}</span>;
    }

    const handleClick = (e) => {
      if (onClick) onClick(e);
      handleAnchorClick(e, href);
    };

    return (
      <Link href={href} onClick={handleClick} {...props}>
        {children}
      </Link>
    );
  };

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      notifyError("Please enter your email address!");
      return;
    }
    setLoadingSubscribe(true);
    try {
      await NewsletterServices.addNewsletter({ email });
      notifySuccess("Subscribed Successfully!");
      setEmail("");
    } catch (err) {
      notifyError(err ? err.response.data.message : err.message);
    }
    setLoadingSubscribe(false);
  };

  return (
    <div className="pb-16 lg:pb-0 xl:pb-0 bg-blue-50 text-gray-800 relative overflow-hidden">
      {/* Decorative Top Section */}
      <div className="relative bg-gradient-to-b from-store-500/10 via-store-400/5 to-transparent">
        {/* Decorative Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              backgroundSize: "60px 60px",
            }}
          ></div>
        </div>

        {/* Decorative Wave - Animated */}
        <div className="relative overflow-hidden">
          <style
            dangerouslySetInnerHTML={{
              __html: `
              @keyframes waveMove {
                0% {
                  transform: translateX(0);
                }
                100% {
                  transform: translateX(-50%);
                }
              }
              .footer-wave {
                animation: waveMove 25s linear infinite;
              }
            `,
            }}
          />
          <div
            className="footer-wave"
            style={{ width: "200%", display: "flex" }}
          >
            <svg
              className="h-12 md:h-16 lg:h-20 flex-shrink-0"
              viewBox="0 0 1440 120"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="none"
              style={{ width: "50%", height: "100%" }}
            >
              <path
                d="M0,80 C240,20 480,140 720,80 C960,20 1200,140 1440,80 L1440,0 L0,0 Z"
                fill={`var(--store-color-500)`}
                opacity="0.4"
              />
            </svg>
            <svg
              className="h-12 md:h-16 lg:h-20 flex-shrink-0"
              viewBox="0 0 1440 120"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="none"
              style={{ width: "50%", height: "100%" }}
            >
              <path
                d="M0,80 C240,20 480,140 720,80 C960,20 1200,140 1440,80 L1440,0 L0,0 Z"
                fill={`var(--store-color-500)`}
                opacity="0.4"
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-screen-2xl px-4 sm:px-10 lg:px-16 xl:px-20 relative z-10">
        <div className="py-4 hidden md:block border-b border-gray-200">
          <FeatureCard />
        </div>

        {/* Logo at Top Left - Only visible on small screens */}
        <div className="py-4 border-b border-gray-200 block md:hidden">
          <Link href="/" className="inline-block" rel="noreferrer">
            <div className="relative w-32 sm:w-40 transition-transform duration-300 hover:scale-105">
              <Image
                src={pickBrandLogo(
                  storeCustomizationSetting?.footer?.block4_logo,
                  storeCustomizationSetting?.navbar?.logo,
                  storeCustomizationSetting?.seo?.favicon
                )}
                alt="logo"
                fill
                className="object-contain"
                sizes="(max-width: 768px) 150px, 200px"
                priority
              />
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-2 md:gap-x-4 lg:gap-x-8 gap-y-4 md:gap-y-6 lg:gap-y-8 py-6 md:py-8 lg:py-12">
          {storeCustomizationSetting?.footer?.block1_status && (
            <div className="pb-3.5 sm:pb-0 border-b border-gray-200 md:border-0 md:border-r md:border-b-0 md:pr-6 lg:pr-8">
              <button
                onClick={() => toggleSection("block1")}
                className="w-full flex items-center justify-between py-2 md:py-0 md:pointer-events-none"
              >
                <h3 className="text-base md:text-lg font-bold text-gray-800 md:mb-3 relative inline-block">
                  <span className="absolute -left-4 md:-left-6 top-1/2 -translate-y-1/2 w-1 h-6 bg-store-500 rounded-full opacity-0 md:opacity-100"></span>
                  <CMSkeleton
                    count={1}
                    height={24}
                    loading={loading}
                    data={storeCustomizationSetting?.footer?.block1_title}
                  />
                </h3>
                <FiChevronDown
                  className={`w-5 h-5 text-gray-600 md:hidden transition-transform duration-300 ${openSections.block1 ? "rotate-180" : ""
                    }`}
                />
              </button>
              <ul
                className={`text-sm flex flex-col space-y-2 overflow-hidden transition-all duration-300 ${openSections.block1
                  ? "max-h-[500px] opacity-100"
                  : "max-h-0 opacity-0"
                  } md:max-h-none md:opacity-100 md:mb-2`}
              >
                <li className="group">
                  <SafeLink
                    href={getCategoryLink(storeCustomizationSetting?.footer?.block1_sub_link1, "/about-us", storeCustomizationSetting?.footer?.block1_sub_title1)}
                    className="text-gray-600 inline-flex items-center w-full hover:text-store-600 transition-all duration-300"
                  >
                    <FiChevronRight className="w-4 h-4 mr-2 text-gray-500 group-hover:text-store-600 transition-colors" />
                    <CMSkeleton
                      count={1}
                      height={16}
                      loading={loading}
                      data={
                        storeCustomizationSetting?.footer?.block1_sub_title1
                      }
                    />
                  </SafeLink>
                </li>
                <li className="group">
                  <SafeLink
                    href={getCategoryLink(storeCustomizationSetting?.footer?.block1_sub_link2, "/contact-us", storeCustomizationSetting?.footer?.block1_sub_title2)}
                    className="text-gray-600 inline-flex items-center w-full hover:text-store-600 transition-all duration-300"
                  >
                    <FiChevronRight className="w-4 h-4 mr-2 text-gray-500 group-hover:text-store-600 transition-colors" />
                    <CMSkeleton
                      count={1}
                      height={16}
                      loading={loading}
                      data={
                        storeCustomizationSetting?.footer?.block1_sub_title2
                      }
                    />
                  </SafeLink>
                </li>
                <li className="group">
                  <SafeLink
                    href={getCategoryLink(storeCustomizationSetting?.footer?.block1_sub_link3, "#", storeCustomizationSetting?.footer?.block1_sub_title3)}
                    className="text-gray-600 inline-flex items-center w-full hover:text-store-600 transition-all duration-300"
                  >
                    <FiChevronRight className="w-4 h-4 mr-2 text-gray-500 group-hover:text-store-600 transition-colors" />
                    {showingTranslateValue(
                      storeCustomizationSetting?.footer_block_one_link_three_title,
                    )}
                    <CMSkeleton
                      count={1}
                      height={16}
                      loading={loading}
                      data={
                        storeCustomizationSetting?.footer?.block1_sub_title3
                      }
                    />
                  </SafeLink>
                </li>
                <li className="group">
                  <SafeLink
                    href={getCategoryLink(storeCustomizationSetting?.footer?.block1_sub_link4, "#", storeCustomizationSetting?.footer?.block1_sub_title4)}
                    className="text-gray-600 inline-flex items-center w-full hover:text-store-600 transition-all duration-300"
                  >
                    {/* <FiChevronRight className="w-4 h-4 mr-2 text-gray-500 group-hover:text-store-600 transition-colors" /> */}
                    <CMSkeleton
                      count={1}
                      height={16}
                      loading={loading}
                      data={
                        storeCustomizationSetting?.footer?.block1_sub_title4
                      }
                    />
                  </SafeLink>
                </li>
              </ul>
            </div>
          )}
          {storeCustomizationSetting?.footer?.block2_status && (
            <div className="pb-3.5 sm:pb-0 border-b border-gray-200 md:border-0 md:border-r md:border-b-0 md:pr-6 lg:pr-8">
              <button
                onClick={() => toggleSection("block2")}
                className="w-full flex items-center justify-between py-2 md:py-0 md:pointer-events-none"
              >
                <h3 className="text-base md:text-lg font-bold text-gray-800 md:mb-3 relative inline-block">
                  <span className="absolute -left-4 md:-left-6 top-1/2 -translate-y-1/2 w-1 h-6 bg-store-500 rounded-full opacity-0 md:opacity-100"></span>
                  <CMSkeleton
                    count={1}
                    height={24}
                    loading={loading}
                    data={storeCustomizationSetting?.footer?.block2_title}
                  />
                </h3>
                <FiChevronDown
                  className={`w-5 h-5 text-gray-600 md:hidden transition-transform duration-300 ${openSections.block2 ? "rotate-180" : ""
                    }`}
                />
              </button>
              <ul
                className={`text-sm lg:text-15px flex flex-col space-y-2 overflow-hidden transition-all duration-300 ${openSections.block2
                  ? "max-h-[500px] opacity-100"
                  : "max-h-0 opacity-0"
                  } md:max-h-none md:opacity-100 md:mb-2`}
              >
                <li className="group">
                  <Link
                    href={getCategoryLink(storeCustomizationSetting?.footer?.block2_sub_link1, "/search?sort=newest", storeCustomizationSetting?.footer?.block2_sub_title1 || "All Medicines")}
                    onClick={(e) => handleAnchorClick(e, getCategoryLink(storeCustomizationSetting?.footer?.block2_sub_link1, "/search?sort=newest", storeCustomizationSetting?.footer?.block2_sub_title1 || "All Medicines"))}
                    className="text-gray-600 inline-flex items-center w-full hover:text-store-600 transition-all duration-300"
                  >
                    <FiFileText className="w-4 h-4 mr-2 text-gray-500 group-hover:text-store-600 transition-colors" />
                    <CMSkeleton
                      count={1}
                      height={16}
                      loading={loading}
                      data={
                        storeCustomizationSetting?.footer?.block2_sub_title1 || "All Medicines"
                      }
                    />
                  </Link>
                </li>

                <li className="group">
                  <Link
                    href={getCategoryLink(storeCustomizationSetting?.footer?.block2_sub_link2, "/search?sort=newest", storeCustomizationSetting?.footer?.block2_sub_title2 || "Medical Devices")}
                    onClick={(e) => handleAnchorClick(e, getCategoryLink(storeCustomizationSetting?.footer?.block2_sub_link2, "/search?sort=newest", storeCustomizationSetting?.footer?.block2_sub_title2 || "Medical Devices"))}
                    className="text-gray-600 inline-flex items-center w-full hover:text-store-600 transition-all duration-300"
                  >
                    <FiShield className="w-4 h-4 mr-2 text-gray-500 group-hover:text-store-600 transition-colors" />
                    <CMSkeleton
                      count={1}
                      height={16}
                      loading={loading}
                      data={
                        storeCustomizationSetting?.footer?.block2_sub_title2 || "Medical Devices"
                      }
                    />
                  </Link>
                </li>
                <li className="group">
                  <Link
                    href={getCategoryLink(storeCustomizationSetting?.footer?.block2_sub_link3, "/search?category=personal-care&sort=newest", storeCustomizationSetting?.footer?.block2_sub_title3 || "Offers & Deals")}
                    onClick={(e) => handleAnchorClick(e, getCategoryLink(storeCustomizationSetting?.footer?.block2_sub_link3, "/search?category=personal-care&sort=newest", storeCustomizationSetting?.footer?.block2_sub_title3 || "Offers & Deals"))}
                    className="text-gray-600 inline-flex items-center w-full hover:text-store-600 transition-all duration-300"
                  >
                    <FiRefreshCw className="w-4 h-4 mr-2 text-gray-500 group-hover:text-store-600 transition-colors" />
                    <CMSkeleton
                      count={1}
                      height={16}
                      loading={loading}
                      data={
                        storeCustomizationSetting?.footer?.block2_sub_title3 || "Personal Care"
                      }
                    />
                  </Link>
                </li>
                <li className="group">
                  <Link
                    href={getCategoryLink(storeCustomizationSetting?.footer?.block2_sub_link4, "/search?category=vitamins-supplements&sort=newest", storeCustomizationSetting?.footer?.block2_sub_title4 || "Vitamins & Supplements")}
                    onClick={(e) => handleAnchorClick(e, getCategoryLink(storeCustomizationSetting?.footer?.block2_sub_link4, "/search?category=vitamins-supplements&sort=newest", storeCustomizationSetting?.footer?.block2_sub_title4 || "Vitamins & Supplements"))}
                    className="text-gray-600 inline-flex items-center w-full hover:text-store-600 transition-all duration-300"
                  >
                    <FiTruck className="w-4 h-4 mr-2 text-gray-500 group-hover:text-store-600 transition-colors" />
                    <CMSkeleton
                      count={1}
                      height={16}
                      loading={loading}
                      data={
                        storeCustomizationSetting?.footer?.block2_sub_title4 || "Vitamins & Supplements"
                      }
                    />
                  </Link>
                </li>
                <li className="group">
                  <Link
                    href="/faq"
                    className="text-gray-600 inline-flex items-center w-full hover:text-store-600 transition-all duration-300"
                  >
                    <FiMessageSquare className="w-4 h-4 mr-2 text-gray-500 group-hover:text-store-600 transition-colors" />
                    <span>FAQ</span>
                  </Link>
                </li>
              </ul>
            </div>
          )}
          {storeCustomizationSetting?.footer?.block3_status && (
            <div className="pb-3.5 sm:pb-0 border-b border-gray-200 md:border-0 md:border-r md:border-b-0 md:pr-6 lg:pr-8">
              <button
                onClick={() => toggleSection("block3")}
                className="w-full flex items-center justify-between py-2 md:py-0 md:pointer-events-none"
              >
                <h3 className="text-base md:text-lg font-bold text-gray-800 md:mb-3 relative inline-block">
                  <span className="absolute -left-4 md:-left-6 top-1/2 -translate-y-1/2 w-1 h-6 bg-store-500 rounded-full opacity-0 md:opacity-100"></span>
                  <CMSkeleton
                    count={1}
                    height={24}
                    loading={loading}
                    data={storeCustomizationSetting?.footer?.block3_title}
                  />
                </h3>
                <FiChevronDown
                  className={`w-5 h-5 text-gray-600 md:hidden transition-transform duration-300 ${openSections.block3 ? "rotate-180" : ""
                    }`}
                />
              </button>
              <ul
                className={`text-sm lg:text-15px flex flex-col space-y-2 overflow-hidden transition-all duration-300 ${openSections.block3
                  ? "max-h-[500px] opacity-100"
                  : "max-h-0 opacity-0"
                  } md:max-h-none md:opacity-100 md:mb-2`}
              >
                <li className="group">
                  <Link
                    href={getCategoryLink(storeCustomizationSetting?.footer?.block3_sub_link1, "/user/dashboard", storeCustomizationSetting?.footer?.block3_sub_title1)}
                    onClick={(e) => handleAnchorClick(e, getCategoryLink(storeCustomizationSetting?.footer?.block3_sub_link1, "/user/dashboard", storeCustomizationSetting?.footer?.block3_sub_title1))}
                    className="text-gray-600 inline-flex items-center w-full hover:text-store-600 transition-all duration-300"
                  >
                    <FiSettings className="w-4 h-4 mr-2 text-gray-500 group-hover:text-store-600 transition-colors" />
                    <CMSkeleton
                      count={1}
                      height={16}
                      loading={loading}
                      data={
                        storeCustomizationSetting?.footer?.block3_sub_title1
                      }
                    />
                  </Link>
                </li>
                <li className="group">
                  <Link
                    href={getCategoryLink(storeCustomizationSetting?.footer?.block3_sub_link2, "/user/my-orders", storeCustomizationSetting?.footer?.block3_sub_title2)}
                    onClick={(e) => handleAnchorClick(e, getCategoryLink(storeCustomizationSetting?.footer?.block3_sub_link2, "/user/my-orders", storeCustomizationSetting?.footer?.block3_sub_title2))}
                    className="text-gray-600 inline-flex items-center w-full hover:text-store-600 transition-all duration-300"
                  >
                    <FiPackage className="w-4 h-4 mr-2 text-gray-500 group-hover:text-store-600 transition-colors" />
                    <CMSkeleton
                      count={1}
                      height={16}
                      loading={loading}
                      data={
                        storeCustomizationSetting?.footer?.block3_sub_title2
                      }
                    />
                  </Link>
                </li>
                <li className="group">
                  <Link
                    href={getCategoryLink(storeCustomizationSetting?.footer?.block3_sub_link3, "/user/dashboard", storeCustomizationSetting?.footer?.block3_sub_title3)}
                    onClick={(e) => handleAnchorClick(e, getCategoryLink(storeCustomizationSetting?.footer?.block3_sub_link3, "/user/dashboard", storeCustomizationSetting?.footer?.block3_sub_title3))}
                    className="text-gray-600 inline-flex items-center w-full hover:text-store-600 transition-all duration-300"
                  >
                    <FiShoppingBag className="w-4 h-4 mr-2 text-gray-500 group-hover:text-store-600 transition-colors" />
                    <CMSkeleton
                      count={1}
                      height={16}
                      loading={loading}
                      data={
                        storeCustomizationSetting?.footer?.block3_sub_title3
                      }
                    />
                  </Link>
                </li>
                <li className="group">
                  <Link
                    href={getCategoryLink(storeCustomizationSetting?.footer?.block3_sub_link4, "/user/update-profile", storeCustomizationSetting?.footer?.block3_sub_title4)}
                    onClick={(e) => handleAnchorClick(e, getCategoryLink(storeCustomizationSetting?.footer?.block3_sub_link4, "/user/update-profile", storeCustomizationSetting?.footer?.block3_sub_title4))}
                    className="text-gray-600 inline-flex items-center w-full hover:text-store-600 transition-all duration-300"
                  >
                    <FiUser className="w-4 h-4 mr-2 text-gray-500 group-hover:text-store-600 transition-colors" />
                    <CMSkeleton
                      count={1}
                      height={16}
                      loading={loading}
                      data={
                        storeCustomizationSetting?.footer?.block3_sub_title4
                      }
                    />
                  </Link>
                </li>
              </ul>
            </div>
          )}

          {storeCustomizationSetting?.footer?.block4_status && (
            <div className="pb-3.5 sm:pb-0">
              {/* Address Section - Always Visible */}
              <div className="space-y-2  ">
                <h3 className="text-base font-bold text-gray-800">
                  Registered Office Address
                </h3>

                {/* Company Name */}
                {loading ? (
                  <div className="mb-2">
                    <CMSkeleton count={1} height={24} loading={true} />
                  </div>
                ) : globalSetting?.company_name ? (
                  <div className="mb-1">
                    <p className="text-base font-semibold text-gray-800">
                      {globalSetting.company_name}
                    </p>
                  </div>
                ) : null}

                <div className="flex items-start gap-3 text-gray-600">
                  <FiMapPin className="w-5 h-5 text-gray-500 flex-shrink-0 mt-1" />
                  <p className="leading-6 font-sans text-sm text-left">
                    <CMSkeleton
                      count={1}
                      height={40}
                      loading={loading}
                      data={storeCustomizationSetting?.footer?.block4_address}
                    />
                  </p>
                </div>
                <div className="flex items-center gap-3 text-gray-600 hover:text-store-600 transition-colors">
                  <FiPhone className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  <a
                    href={`tel:${storeCustomizationSetting?.footer?.block4_phone}`}
                    className="text-sm hover:underline"
                  >
                    {storeCustomizationSetting?.footer?.block4_phone}
                  </a>
                </div>
                <div className="flex items-center gap-3 text-gray-600 hover:text-store-600 transition-colors">
                  <FiMail className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  <a
                    href={`mailto:${storeCustomizationSetting?.footer?.block4_email}`}
                    className="text-sm hover:underline break-all"
                  >
                    {storeCustomizationSetting?.footer?.block4_email}
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Social Media Section */}
        <div className="py-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-8">
            {storeCustomizationSetting?.footer?.social_links_status && (
              <div>
                {(storeCustomizationSetting?.footer?.social_facebook ||
                  storeCustomizationSetting?.footer?.social_twitter ||
                  storeCustomizationSetting?.footer?.social_instagram ||
                  storeCustomizationSetting?.footer?.social_linkedin ||
                  storeCustomizationSetting?.footer?.social_whatsapp) && (
                    <h3 className="text-base font-bold mb-2 text-gray-800">
                      Social
                    </h3>
                  )}
                <ul className="text-sm flex flex-wrap gap-3">
                  {storeCustomizationSetting?.footer?.social_facebook && (
                    <li className="group">
                      <Link
                        href={`${storeCustomizationSetting?.footer?.social_facebook}`}
                        aria-label="Social Link"
                        rel="noreferrer"
                        target="_blank"
                        className="block text-center mx-auto transition-transform duration-300 hover:scale-110 hover:-translate-y-1"
                      >
                        <FacebookIcon
                          size={40}
                          round
                          className="rounded-full group-hover:shadow-lg transition-shadow"
                        />
                      </Link>
                    </li>
                  )}
                  {storeCustomizationSetting?.footer?.social_twitter && (
                    <li className="group">
                      <Link
                        href={`${storeCustomizationSetting?.footer?.social_twitter}`}
                        aria-label="Social Link"
                        rel="noreferrer"
                        target="_blank"
                        className="block text-center mx-auto transition-transform duration-300 hover:scale-110 hover:-translate-y-1"
                      >
                        <TwitterIcon
                          size={40}
                          round
                          className="rounded-full group-hover:shadow-lg transition-shadow"
                        />
                      </Link>
                    </li>
                  )}
                  {storeCustomizationSetting?.footer?.social_instagram && (
                    <li className="group">
                      <Link
                        href={`${storeCustomizationSetting?.footer?.social_instagram}`}
                        aria-label="Social Link"
                        rel="noreferrer"
                        target="_blank"
                        className="block text-center mx-auto transition-transform duration-300 hover:scale-110 hover:-translate-y-1"
                      >
                        <div className="rounded-full shadow-md group-hover:shadow-lg transition-shadow">
                          <FaInstagram
                            size={40}
                            style={{ color: "#E4405F" }}
                            className="rounded-full"
                          />
                        </div>
                      </Link>
                    </li>
                  )}
                  {storeCustomizationSetting?.footer?.social_linkedin && (
                    <li className="group">
                      <Link
                        href={`${storeCustomizationSetting?.footer?.social_linkedin}`}
                        aria-label="Social Link"
                        rel="noreferrer"
                        target="_blank"
                        className="block text-center mx-auto transition-transform duration-300 hover:scale-110 hover:-translate-y-1"
                      >
                        <LinkedinIcon
                          size={40}
                          round
                          className=" rounded-full group-hover:shadow-lg transition-shadow"
                        />
                      </Link>
                    </li>
                  )}
                  {storeCustomizationSetting?.footer?.social_whatsapp && (
                    <li className="group">
                      <Link
                        href={`${storeCustomizationSetting?.footer?.social_whatsapp}`}
                        aria-label="Social Link"
                        rel="noreferrer"
                        target="_blank"
                        className="block text-center mx-auto transition-transform duration-300 hover:scale-110 hover:-translate-y-1"
                      >
                        <WhatsappIcon
                          size={40}
                          round
                          className="rounded-full group-hover:shadow-lg transition-shadow"
                        />
                      </Link>
                    </li>
                  )}
                </ul>
              </div>
            )}
            {/* App Store & Google Play Store */}
            {(storeCustomizationSetting?.home?.daily_need_app_link ||
              storeCustomizationSetting?.home?.daily_need_google_link ||
              storeCustomizationSetting?.home?.button1_img ||
              storeCustomizationSetting?.home?.button2_img) && (
                <div>
                  <h3 className="text-base font-bold mb-2 text-gray-800">
                    Download Our App
                  </h3>
                  <div className="flex gap-3 items-center">
                    <Link
                      href={
                        storeCustomizationSetting?.home?.daily_need_app_link ||
                        "#"
                      }
                    >
                      <div className="w-[150px] h-[44px]">
                        <Image
                          width={150}
                          height={44}
                          className="w-full h-full object-fill rounded"
                          src={
                            storeCustomizationSetting?.home?.button1_img ||
                            "/app/app-store.svg"
                          }
                          alt="Download on the App Store"
                        />
                      </div>
                    </Link>

                    <Link
                      href={
                        storeCustomizationSetting?.home?.daily_need_google_link ||
                        "#"
                      }
                    >
                      <div className="w-[150px] h-[44px]">
                        <Image
                          width={150}
                          height={44}
                          className="w-full h-full object-fill rounded"
                          src={
                            storeCustomizationSetting?.home?.button2_img ||
                            "/app/play-store.svg"
                          }
                          alt="Get it on Google Play"
                        />
                      </div>
                    </Link>
                  </div>
                </div>
              )}
            {storeCustomizationSetting?.footer?.payment_method_status && (
              <div>
                <h3 className="text-base font-bold mb-2 text-gray-800">
                  Payment Methods
                </h3>
                <div className="mt-2 flex items-center">
                  <div className="w-[150px] h-[44px] flex items-center justify-center">
                    <Image
                      width={150}
                      height={44}
                      className="w-full h-full object-fill rounded"
                      src={
                        storeCustomizationSetting?.footer?.payment_method_img ||
                        "/payment-method/razorpay_logo.svg"
                      }
                      alt="payment method"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Copyright Section */}
        <div className="mx-auto max-w-screen-2xl px-3 sm:px-10 flex flex-col md:flex-row justify-between items-center py-2 border-t border-gray-200 gap-0 md:gap-2">
          <p className="text-sm text-gray-600 leading-6 text-center md:text-left mb-0">
            Copyright 2025 @{" "}
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-store-600 font-bold hover:text-store-700 transition-colors duration-300"
            >
              Farmacykart
            </Link>
            , All rights reserved.
          </p>
          <p className="text-sm text-gray-500 leading-6 text-center md:text-right flex items-center justify-center md:justify-end gap-1">
            Developed by{" "}
            <a
              href="https://vastoratech.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-store-600 font-semibold hover:underline"
            >
              Vastora Tech
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default dynamic(() => Promise.resolve(Footer), { ssr: false });
