import Head from "next/head";
import { ToastContainer } from "react-toastify";

//internal import

import Navbar from "@layout/navbar/Navbar";
import Footer from "@layout/footer/Footer";
import NavBarTop from "./navbar/NavBarTop";
import FooterTop from "@layout/footer/FooterTop";
import MobileFooter from "@layout/footer/MobileFooter";
import MobileBottomNavigation from "@layout/footer/MobileBottomNavigation";
import FeatureCard from "@components/feature-card/FeatureCard";
import useGetSetting from "@hooks/useGetSetting";
import { getPalette } from "@utils/themeColors";
import useCartSync from "@hooks/useCartSync";
import FloatingWhatsApp from "@components/common/FloatingWhatsApp";
import { pickBrandLogo } from "@utils/brandAssets";

const Layout = ({ title, description, children, hideMobileHeader }) => {
  const { storeCustomizationSetting, globalSetting } = useGetSetting();
  const rawColor = storeCustomizationSetting?.theme?.color;
  const storeColor =
    !rawColor || rawColor === "pink" || rawColor === "#EC4899" || rawColor === "#ec4899"
      ? "green"
      : rawColor;
  const palette = getPalette(storeColor);

  // Sync prescription medicines to cart
  useCartSync();

  // Get dynamic title and favicon from settings
  const siteTitle = storeCustomizationSetting?.seo?.meta_title || globalSetting?.shop_name || "Farmacykart";
  const favicon = pickBrandLogo(
    storeCustomizationSetting?.seo?.favicon,
    globalSetting?.logo,
    storeCustomizationSetting?.navbar?.logo
  );
  const defaultDescription = storeCustomizationSetting?.seo?.meta_description || description || "Discover personalized merchandise, branded giveaways, and advertising essentials. Ideal for businesses, events, and promotions";

  return (
    <>
      <div className="font-sans">
        <Head>
          <style>
            {`
              :root {
                --store-color-50: ${palette[50]};
                --store-color-100: ${palette[100]};
                --store-color-200: ${palette[200]};
                --store-color-300: ${palette[300]};
                --store-color-400: ${palette[400]};
                --store-color-500: ${palette[500]};
                --store-color-600: ${palette[600]};
                --store-color-700: ${palette[700]};
                --store-color-800: ${palette[800]};
                --store-color-900: ${palette[900]};
              }
            `}
          </style>
          <title>
            {title ? `${siteTitle} | ${title}` : siteTitle}
          </title>
          <meta name="description" content={description || defaultDescription} />
          <link rel="icon" href={favicon} />
          <link rel="shortcut icon" href={favicon} />
          <link rel="apple-touch-icon" href={favicon} />
        </Head>
        {/* Mobile header bar (fixed) */}
        {!hideMobileHeader && <MobileFooter />}

        {/* Mobile Bottom Navigation */}
        {!hideMobileHeader && <MobileBottomNavigation />}

        <div className={`${hideMobileHeader ? "pt-0" : "pt-16"} lg:pt-0 lg:mt-0 pb-16 lg:pb-0`}>
          {/* Desktop: one sticky header — top bar + navbar + categories shift on scroll */}
          <div className="hidden lg:block sticky top-0 z-[70] bg-white shadow-sm">
            <NavBarTop />
            <Navbar />
          </div>
          {children}
        </div>
        <div className="  w-full">
          {/* <FooterTop  /> */}
          <div className="w-full">
            <Footer />
          </div>
        </div>
        <FloatingWhatsApp />
      </div>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </>
  );
};

export default Layout;
