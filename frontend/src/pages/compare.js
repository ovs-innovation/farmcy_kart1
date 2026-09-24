import React, { useEffect, useState, useContext } from "react";
import { UserContext } from "@context/UserContext";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { FiX, FiShoppingCart, FiTrash2 } from "react-icons/fi";
import useTranslation from "next-translate/useTranslation";

//internal import
import Layout from "@layout/Layout";
import useCartDB from "@hooks/useCartDB";
import useGetSetting from "@hooks/useGetSetting";
import useUtilsFunction from "@hooks/useUtilsFunction";
import AttributeServices from "@services/AttributeServices";
import { notifySuccess, notifyError } from "@utils/toast";
import PageHeader from "@components/header/PageHeader";
import Price from "@components/common/Price";
import Stock from "@components/common/Stock";

const Compare = ({ attributes }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { addItemWithDB } = useCartDB();
  const { storeCustomizationSetting, globalSetting } = useGetSetting();
  const { showingTranslateValue } = useUtilsFunction();
  const { state } = useContext(UserContext) || {};
  const isWholesaler = state?.userInfo?.role && state.userInfo.role.toString().toLowerCase() === "wholesaler"; 
  const [compareItems, setCompareItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const displayedCompareItems = isWholesaler ? (compareItems || []).filter(p => (p.wholePrice && Number(p.wholePrice) > 0) || p.isWholesaler) : compareItems;

  const storeColor = storeCustomizationSetting?.theme?.color || "green";
  const currency = globalSetting?.default_currency || "₹";

  useEffect(() => {
    // Load compare list from localStorage
    if (typeof window !== "undefined") {
      const storedCompare = localStorage.getItem("compare");
      if (storedCompare) {
        try {
          setCompareItems(JSON.parse(storedCompare));
        } catch (error) {
          console.error("Error parsing compare list:", error);
          setCompareItems([]);
        }
      }
      setLoading(false);
    }
  }, []);

  const removeFromCompare = (productId) => {
    const updatedCompare = compareItems.filter(
      (item) => item._id !== productId
    );
    setCompareItems(updatedCompare);
    if (typeof window !== "undefined") {
      localStorage.setItem("compare", JSON.stringify(updatedCompare));
    }
    notifySuccess("Product removed from compare");
  };

  const clearAll = () => {
    setCompareItems([]);
    if (typeof window !== "undefined") {
      localStorage.setItem("compare", JSON.stringify([]));
    }
    notifySuccess("Compare list cleared");
  };

  const addToCart = async (product) => {
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

  if (loading) {
    return (
      <Layout title="Compare" description="Compare products">
        <div className="mx-auto max-w-screen-2xl px-4 py-10 lg:py-20 sm:px-10">
          <div className="text-center">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Compare Products" description="Compare your selected products">
      {/* <PageHeader
        title="Compare Products"
        headerBg={storeCustomizationSetting?.offers?.header_bg}
      /> */}
      <div className="mx-auto max-w-screen-2xl px-4 py-10   sm:px-10">
        {compareItems?.length === 0 ? (
          <div className="mx-auto p-5 my-5 text-center">
            <Image
              className="my-4 mx-auto"
              src="/no-result.svg"
              alt="no-result"
              width={400}
              height={380}
            />
            <h2 className="text-lg md:text-xl lg:text-2xl xl:text-2xl text-center mt-2 font-medium font-serif text-gray-600">
              No products to compare
            </h2>
            <p className="text-gray-500 mt-2 mb-4">
              Add products to compare their features and prices
            </p>
            <Link
              href="/"
              className={`inline-block px-6 py-3 bg-store-500 text-white rounded-md hover:bg-store-600 transition-colors`}
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold font-serif">
                Compare Products ({compareItems.length} items)
              </h1>
              {compareItems.length > 0 && (
                <button
                  onClick={clearAll}
                  className={`px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm`}
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-full">
                <table className="w-full border-collapse bg-white shadow-md rounded-lg overflow-hidden">
                  <thead>
                    <tr className={`bg-store-500 text-white`}>
                      <th className="p-4 text-left font-semibold">Product</th>
                      {displayedCompareItems.map((product) => (
                        <th
                          key={product._id}
                          className="p-4 text-center font-semibold relative min-w-[200px]"
                        >
                          <button
                            onClick={() => removeFromCompare(product._id)}
                            className="absolute top-4 right-3 text-white hover:text-red-200"
                            aria-label="Remove"
                          >
                            <FiX className="w-5 h-5" />
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-4 font-semibold">Image</td>
                      {displayedCompareItems.map((product) => (
                        <td key={product._id} className="p-4 text-center">
                          <div className="relative w-full h-48 mb-2">
                            <Image
                              src={product.image?.[0] || "/placeholder.png"}
                              alt={showingTranslateValue(product.title)}
                              fill
                              className="object-contain rounded"
                              onClick={() =>
                                router.push(`/product/${product.slug}`)
                              }
                              style={{ cursor: "pointer" }}
                            />
                          </div>
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b bg-gray-50">
                      <td className="p-4 font-semibold">Name</td>
                      {displayedCompareItems.map((product) => (
                        <td key={product._id} className="p-4 text-center">
                          <Link
                            href={`/product/${product.slug}`}
                            className={`text-store-500 hover:underline font-medium`}
                          >
                            {showingTranslateValue(product.title)}
                          </Link>
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="p-4 font-semibold">Price</td>
                      {displayedCompareItems.map((product) => (
                        <td key={product._id} className="p-4 text-center">
                          <Price
                            product={product}
                            price={isWholesaler && product?.wholePrice && Number(product.wholePrice) > 0 ? Number(product.wholePrice) : product?.prices?.price}
                            originalPrice={product?.prices?.originalPrice}
                            currency={currency}
                            storeColor={storeColor}
                            hideDiscountAndMRP={isWholesaler}
                          />
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b bg-gray-50">
                      <td className="p-4 font-semibold">Stock</td>
                      {displayedCompareItems.map((product) => (
                        <td key={product._id} className="p-4 text-center">
                          <Stock stock={product.stock} />
                        </td>
                      ))}
                    </tr>
                     
                    <tr className="border-b">
                      <td className="p-4 font-semibold">Action</td>
                      {displayedCompareItems.map((product) => (
                        <td key={product._id} className="p-4 text-center">
                          <button
                            onClick={() => addToCart(product)}
                            className={`px-4 py-2 bg-store-500 text-white rounded-md hover:bg-store-600 transition-colors text-sm flex items-center gap-2 mx-auto`}
                          >
                            <FiShoppingCart className="w-4 h-4" />
                            Add to Cart
                          </button>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default Compare;

export const getServerSideProps = async () => {
  const attributes = await AttributeServices.getShowingAttributes({});

  return {
    props: {
      attributes,
    },
  };
};


