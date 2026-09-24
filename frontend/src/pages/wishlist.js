import React, { useEffect, useState, useContext } from "react";
import { UserContext } from "@context/UserContext";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { FiHeart, FiTrash2, FiShoppingCart } from "react-icons/fi";
import { useCart } from "react-use-cart";
import useTranslation from "next-translate/useTranslation";

//internal import
import Layout from "@layout/Layout";
import ProductCard from "@components/product/ProductCard";
import Loading from "@components/preloader/Loading";
import useGetSetting from "@hooks/useGetSetting";
import useUtilsFunction from "@hooks/useUtilsFunction";
import AttributeServices from "@services/AttributeServices";
import { notifySuccess, notifyError } from "@utils/toast";
import PageHeader from "@components/header/PageHeader";

import useCartDB from "@hooks/useCartDB";
import useWishlist from "@hooks/useWishlist";

const Wishlist = ({ attributes }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { addItemWithDB } = useCartDB();
  const { storeCustomizationSetting } = useGetSetting();
  const { showingTranslateValue } = useUtilsFunction();
  const { state } = useContext(UserContext) || {};
  const isWholesaler = state?.userInfo?.role && state.userInfo.role.toString().toLowerCase() === "wholesaler";

  const { items: wishlistItems, remove: removeWishlist } = useWishlist();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  const removeFromWishlist = (productId) => {
    const result = removeWishlist(productId);
    if (result?.ok) {
      notifySuccess("Product removed from wishlist");
    } else {
      notifyError("Failed to remove from wishlist");
    }
  };

  const addToCartFromWishlist = async (product) => {
    if (product.stock < 1) {
      notifyError("Insufficient stock!");
      return;
    }

    if (product?.variants?.length > 0) {
      router.push(`/product/${product.slug}`);
      return;
    }

    const { slug, variants, categories, description, ...updatedProduct } =
      product;
    const wholesalePriceValue = product?.wholePrice && Number(product.wholePrice) > 0 ? Number(product.wholePrice) : null;
    const priceToUse = isWholesaler && wholesalePriceValue ? wholesalePriceValue : (product.prices?.price || 0);

    const newItem = {
      ...updatedProduct,
      title: showingTranslateValue(product?.title),
      id: product._id,
      productId: product._id,
      variant: product.prices,
      price: priceToUse,
      originalPrice: product.prices?.originalPrice,
      image: product.image?.[0] || product.images?.[0],
    };

    const minQty = isWholesaler && product?.minQuantity ? Number(product.minQuantity) : 1;
    const res = await addItemWithDB(newItem, minQty);
    if (res?.success) {
      notifySuccess("Product added to cart");
    }
  };

  return (
    <Layout title="Wishlist" description="Your wishlist items">
      {/* <PageHeader
        title="My Wishlist"
        headerBg={storeCustomizationSetting?.offers?.header_bg}
      /> */}
      <div className="mx-auto max-w-screen-2xl px-4 py-10   sm:px-10">
        {loading ? (
          <Loading loading={loading} />
        ) : wishlistItems?.length === 0 ? (
          <div className="mx-auto p-5 my-5 text-center">
            <Image
              className="my-4 mx-auto"
              src="/no-result.svg"
              alt="no-result"
              width={400}
              height={380}
            />
            <h2 className="text-lg md:text-xl lg:text-2xl xl:text-2xl text-center mt-2 font-medium font-serif text-gray-600">
              Your wishlist is empty
            </h2>
            <p className="text-gray-500 mt-2 mb-4">
              Start adding products to your wishlist!
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-store-500 text-white rounded-md hover:bg-store-600 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold font-serif">
                My Wishlist ({wishlistItems.length} items)
              </h1>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-6 gap-2 md:gap-3 lg:gap-3">
              {(isWholesaler ? wishlistItems.filter(p => (p.wholePrice && Number(p.wholePrice) > 0) || p.isWholesaler) : wishlistItems).map((product, i) => (
                <div key={i} className="relative group">
                  <ProductCard product={product} attributes={attributes} />
                  <button
                    onClick={() => removeFromWishlist(product._id)}
                    className="absolute top-2 right-2 z-20 p-2 bg-white rounded-full shadow-md hover:bg-store-500 hover:text-white transition-colors"
                    aria-label="Remove from wishlist"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>

                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default Wishlist;

export const getServerSideProps = async () => {
  const attributes = await AttributeServices.getShowingAttributes({});

  return {
    props: {
      attributes,
    },
  };
};

