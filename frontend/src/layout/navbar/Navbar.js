import { useContext, useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { useCart } from "react-use-cart";
import { IoSearchOutline, IoHome } from "react-icons/io5";
import { FiShoppingCart, FiHeart } from "react-icons/fi";
import { FaPrescriptionBottleAlt } from "react-icons/fa";
import { useQuery } from "@tanstack/react-query";

import { getUserSession } from "@lib/auth";
import useWishlist from "@hooks/useWishlist";
import useGetSetting from "@hooks/useGetSetting";
import useUtilsFunction from "@hooks/useUtilsFunction";
import CartDrawer from "@components/drawer/CartDrawer";
import { SidebarContext } from "@context/SidebarContext";
import CategoryServices from "@services/CategoryServices";
import SearchSuggestions from "@components/search/SearchSuggestions";
import LowerCategoryNavbar from "./LowerCategoryNavbar";
import CustomerNotificationBell from "@components/notification/CustomerNotificationBell";

// Imported local logo asset
import logo from "../../../public/logo/logo.png";

const NavbarLogo = () => {
  const { globalSetting } = useGetSetting();
  const [imgError, setImgError] = useState(false);
  const siteName = globalSetting?.shop_name || "Farmacykart";

  if (imgError) {
    return (
      <Link href="/" className="flex items-center gap-2 shrink-0" aria-label={siteName}>
        <span className="flex h-10 w-10 sm:h-14 sm:w-14 items-center justify-center rounded-xl bg-store-600 text-white">
          <FaPrescriptionBottleAlt className="text-lg sm:text-xl" />
        </span>
        <span className="font-extrabold text-store-800 text-base hidden xl:block">{siteName}</span>
      </Link>
    );
  }

  return (
    <Link href="/" className="block shrink-0" aria-label={siteName}>
      <Image
        src={logo}
        alt={siteName}
        onError={() => setImgError(true)}
        className="h-10 w-auto max-w-[140px] object-contain object-left sm:h-16 sm:max-w-[220px]"
        priority
      />
    </Link>
  );
};

/** Home icon — between logo & categories, or left of top search bar after scroll */
const NavbarHomeIcon = ({ besideSearch = false }) => (
  <Link
    href="/"
    className={`flex h-10 w-10 items-center justify-center rounded-lg text-green-800 hover:text-green-900 hover:bg-green-50 transition-colors shrink-0 ${besideSearch ? "mr-1" : "ml-4 md:ml-14"
      }`}
    aria-label="Home"
    title="Home"
  >
    <IoHome className="text-2xl" />
  </Link>
);

const Navbar = () => {
  const { showingTranslateValue } = useUtilsFunction();
  const router = useRouter();
  const { data: categoriesData } = useQuery({
    queryKey: ["category"],
    queryFn: async () => await CategoryServices.getShowingCategory(),
  });

  const getLevel1Categories = (categories) => {
    if (!categories || !Array.isArray(categories) || categories.length === 0) return [];

    const homeRoot = categories.find(
      (cat) =>
        cat.id === "Root" ||
        showingTranslateValue(cat?.name)?.toLowerCase() === "home"
    );

    let topLevel = homeRoot?.children?.length ? homeRoot.children : categories;
    const finalCategories = [];
    topLevel.forEach((cat) => {
      const name = showingTranslateValue(cat?.name)?.toLowerCase();
      if ((name === "medicine" || name === "medicines") && cat.children?.length > 0) {
        finalCategories.push(...cat.children);
      } else {
        finalCategories.push(cat);
      }
    });
    return finalCategories;
  };

  const categories = getLevel1Categories(categoriesData);

  const { toggleCartDrawer } = useContext(SidebarContext);
  const { totalUniqueItems } = useCart();
  const { count: wishlistCount } = useWishlist();
  const userInfo = getUserSession();

  const initialShowSearch = router.pathname !== "/" || router.pathname === "/search";
  const [showSearchInNavbar, setShowSearchInNavbar] = useState(initialShowSearch);
  const [searchText, setSearchText] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef(null);

  const isHome = router.pathname === "/";
  const showNavbarSearch = !isHome || showSearchInNavbar || router.pathname === "/search";

  useEffect(() => {
    if (!isHome) {
      setShowSearchInNavbar(true);
      return;
    }

    const heroEl = document.getElementById("hero-search-anchor");
    if (!heroEl) {
      const onScroll = () => setShowSearchInNavbar(window.scrollY > 280);
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    }

    const observer = new IntersectionObserver(
      ([entry]) => setShowSearchInNavbar(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-100px 0px 0px 0px" }
    );
    observer.observe(heroEl);
    return () => observer.disconnect();
  }, [isHome, router.asPath]);

  useEffect(() => {
    const qParam = router.query.query || router.query.q;
    if (router.pathname === "/search" && qParam) {
      setSearchText(qParam);
    }
  }, [router.pathname, router.query.query, router.query.q]);

  const handleSearchChange = (value) => {
    setSearchText(value);
    setShowSuggestions(value.length > 0);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const trimmed = searchText.trim();
    setShowSuggestions(false);
    searchInputRef.current?.blur();
    if (trimmed) {
      router
        .push(
          { pathname: "/search", query: { query: trimmed } },
          `/search?query=${encodeURIComponent(trimmed)}`,
          { shallow: false }
        )
        .then(() => setSearchText(""))
        .catch(() => {
          window.location.href = `/search?query=${encodeURIComponent(trimmed)}`;
        });
    }
  };

  return (
    <>
      <CartDrawer />
      {/* REMOVED hidden lg:block SO THIS NAVBAR STAYS VISIBLE ON MOBILE */}
      <header className="w-full bg-white border-b border-gray-100">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-8">
          <div className={`flex items-center justify-between gap-2 sm:gap-4 transition-all duration-300 ${showNavbarSearch ? "py-2.5" : "py-2"}`}>

            <NavbarLogo />

            {!showNavbarSearch && isHome && <NavbarHomeIcon />}

            {/* Hidden search bar wrapper on small mobile screens to prevent design breaks */}
            <div className="hidden md:flex flex-1 min-w-0 items-center justify-center gap-2">
              {showNavbarSearch && <NavbarHomeIcon besideSearch />}

              {showNavbarSearch ? (
                <form
                  onSubmit={handleSearchSubmit}
                  className="navbar-search-form flex items-center w-full max-w-3xl rounded-full border border-gray-200 bg-white p-1 hover:border-store-300 focus-within:border-store-400 focus-within:ring-2 focus-within:ring-store-100 transition-all"
                >
                  <div className="flex-1 relative min-w-0 flex items-center min-h-[42px]">
                    <IoSearchOutline className="absolute left-3 text-gray-700 text-lg pointer-events-none z-10" />
                    <input
                      ref={searchInputRef}
                      type="search"
                      placeholder="Search for medicine, healthcare & more..."
                      className="navbar-search-input w-full h-full py-2 pl-10 pr-2 text-sm !bg-transparent !border-0 !border-none !shadow-none !ring-0 !outline-none focus:!ring-0 focus:!border-0 focus:!outline-none placeholder-gray-500"
                      value={searchText}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      onFocus={() => searchText.length > 0 && setShowSuggestions(true)}
                      onBlur={(e) => {
                        const relatedTarget = e.relatedTarget;
                        const box = document.querySelector(".search-suggestions-container");
                        if (!relatedTarget || (box && !box.contains(relatedTarget))) {
                          setTimeout(() => {
                            const active = document.activeElement;
                            if (!box || !box.contains(active)) setShowSuggestions(false);
                          }, 200);
                        }
                      }}
                    />
                    <SearchSuggestions
                      searchText={searchText}
                      showSuggestions={showSuggestions}
                      onSelect={() => {
                        setSearchText("");
                        setShowSuggestions(false);
                      }}
                      onClose={() => setShowSuggestions(false)}
                    />
                  </div>
                  <button
                    type="submit"
                    className="shrink-0 rounded-full bg-store-600 hover:bg-store-700 text-white text-sm font-bold px-5 py-2.5 border-0 outline-none shadow-none transition-colors"
                  >
                    Search
                  </button>
                </form>
              ) : isHome ? (
                <LowerCategoryNavbar
                  variant="inline"
                  categories={categories}
                  showingTranslateValue={showingTranslateValue}
                />
              ) : null}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <CustomerNotificationBell />
              <Link
                href="/wishlist"
                className="relative p-1.5 sm:p-2 text-gray-600 hover:text-store-600 rounded-lg hover:bg-store-50"
                aria-label="Wishlist"
              >
                <FiHeart className="text-xl" />
                {wishlistCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 text-[10px] font-bold text-white bg-store-500 rounded-full flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </Link>
              <button
                type="button"
                onClick={toggleCartDrawer}
                className="relative p-1.5 sm:p-2 text-gray-600 hover:text-store-600 rounded-lg hover:bg-store-50"
                aria-label="Cart"
              >
                <FiShoppingCart className="text-xl" />
                {totalUniqueItems > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 text-[10px] font-bold text-white bg-store-500 rounded-full flex items-center justify-center">
                    {totalUniqueItems}
                  </span>
                )}
              </button>
              <div className="w-px h-8 bg-gray-200 mx-1 hidden sm:block" />
              {userInfo?.image ? (
                <Link href="/user/dashboard">
                  <Image
                    width={36}
                    height={36}
                    src={userInfo.image}
                    alt="Account"
                    className="rounded-full w-8 h-8 sm:w-9 sm:h-9 border-2 border-store-100 object-cover"
                  />
                </Link>
              ) : userInfo?.name ? (
                <Link
                  href="/user/dashboard"
                  className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border-2 border-store-500 text-store-600 font-bold text-sm"
                >
                  {userInfo.name[0]}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push("/auth/login")}
                  className="text-xs sm:text-sm font-bold text-white bg-store-600 hover:bg-store-700 px-3 py-1.5 sm:px-5 sm:py-2 rounded-full shadow-sm"
                >
                  Login
                </button>
              )}
            </div>
          </div>
        </div>

        {showNavbarSearch && (
          <div className="hidden md:block">
            <LowerCategoryNavbar
              variant="row"
              categories={categories}
              showingTranslateValue={showingTranslateValue}
            />
          </div>
        )}
      </header>
      <style jsx global>{`
        .navbar-search-form .navbar-search-input {
          border: none !important;
          box-shadow: none !important;
          outline: none !important;
          --tw-ring-shadow: 0 0 #0000 !important;
        }
        .navbar-search-form .navbar-search-input:focus {
          border: none !important;
          box-shadow: none !important;
          outline: none !important;
        }
      `}</style>
    </>
  );
};

export default dynamic(() => Promise.resolve(Navbar), { ssr: false });