import useTranslation from "next-translate/useTranslation";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useContext, useEffect, useState } from "react";
import { UserContext } from "@context/UserContext";
import { FiMinus, FiPlus } from "react-icons/fi";

//internal import
import Price from "@components/common/Price";
import Stock from "@components/common/Stock";
import Tags from "@components/common/Tags";
import { notifyError } from "@utils/toast";
import useAddToCart from "@hooks/useAddToCart";
import MainModal from "@components/modal/MainModal";
import Discount from "@components/common/Discount";
import VariantList from "@components/variants/VariantList";
import { SidebarContext } from "@context/SidebarContext";
import useUtilsFunction from "@hooks/useUtilsFunction";
import useGetSetting from "@hooks/useGetSetting";
import { handleLogEvent } from "src/lib/analytics";

const ProductModal = ({
  modalOpen,
  setModalOpen,
  product,
  attributes,
  currency,
}) => {
  const router = useRouter();
  const { setIsLoading, isLoading } = useContext(SidebarContext);
  const { t } = useTranslation("ns1");

  const { handleAddItem, setItem, item } = useAddToCart();
  const { lang, showingTranslateValue, getNumber, getNumberTwo } =
    useUtilsFunction();
  const { storeCustomizationSetting, globalSetting } = useGetSetting();

  const { state } = useContext(UserContext) || {};
  const isWholesaler = state?.userInfo?.role && state.userInfo.role.toString().toLowerCase() === 'wholesaler';
  // Minimum quantity to enforce when user is a wholesaler (defaults to 1)
  const minQty = isWholesaler && product?.minQuantity ? Number(product.minQuantity) : 1;

  // Ensure modal defaults quantity to wholesaler min when applicable
  useEffect(() => {
    // Only set when product changes or minQty changes
    setItem(minQty);
  }, [minQty, setItem]);

  // Get dynamic contact number
  const contactNumber =

    storeCustomizationSetting?.footer?.bottom_contact ||
    globalSetting?.contact ||
    "+0044235234";

  // react hook
  const [value, setValue] = useState("");
  const [price, setPrice] = useState(0);
  const [img, setImg] = useState("");
  const [originalPrice, setOriginalPrice] = useState(0);
  const [stock, setStock] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [selectVariant, setSelectVariant] = useState({});
  const [selectVa, setSelectVa] = useState({});
  const [variantTitle, setVariantTitle] = useState([]);
  const [variants, setVariants] = useState([]);

  useEffect(() => {
    // console.log('value', value, product);
    if (value) {
      const result = product?.variants?.filter((variant) =>
        Object.keys(selectVa).every((k) => selectVa[k] === variant[k])
      );

      const res = result?.map(
        ({
          originalPrice,
          price,
          discount,
          quantity,
          barcode,
          sku,
          productId,
          image,
          ...rest
        }) => ({
          ...rest,
        })
      );

      const filterKey = Object.keys(Object.assign({}, ...res));
      const selectVar = filterKey?.reduce(
        (obj, key) => ({ ...obj, [key]: selectVariant[key] }),
        {}
      );
      const newObj = Object.entries(selectVar).reduce(
        (a, [k, v]) => (v ? ((a[k] = v), a) : a),
        {}
      );

      const result2 = result?.find((v) =>
        Object.keys(newObj).every((k) => newObj[k] === v[k])
      );

      // console.log("result2", result2);

      if (result.length <= 0 || result2 === undefined) return setStock(0);

      setVariants(result);
      setSelectVariant(result2);
      setSelectVa(result2);
      setImg(result2?.image);
      setStock(result2?.quantity);
      const variantPrice = getNumber(result2?.price);
      const variantOriginalPrice = getNumber(result2?.originalPrice);
      // Prefer wholesaler price for wholesaler users when available
      const effectivePrice = isWholesaler && product?.wholePrice && Number(product.wholePrice) > 0 ? Number(product.wholePrice) : variantPrice;
      const discountPercentage = getNumber(((variantOriginalPrice - effectivePrice) / (variantOriginalPrice || effectivePrice)) * 100);
      setDiscount(getNumber(discountPercentage));
      setPrice(effectivePrice);
      setOriginalPrice(variantOriginalPrice);
    } else if (product?.variants?.length > 0) {
      const result = product?.variants?.filter((variant) =>
        Object.keys(selectVa).every((k) => selectVa[k] === variant[k])
      );

      setVariants(result);
      setStock(product.variants[0]?.quantity);
      setSelectVariant(product.variants[0]);
      setSelectVa(product.variants[0]);
      setImg(product.variants[0]?.image);
      const variantPrice0 = getNumber(product.variants[0]?.price);
      const variantOriginalPrice0 = getNumber(product.variants[0]?.originalPrice);
      const effectiveVariantPrice0 = isWholesaler && product?.wholePrice && Number(product.wholePrice) > 0 ? Number(product.wholePrice) : variantPrice0;
      const discountPercentage0 = getNumber(((variantOriginalPrice0 - effectiveVariantPrice0) / (variantOriginalPrice0 || effectiveVariantPrice0)) * 100);
      setDiscount(getNumber(discountPercentage0));
      setPrice(effectiveVariantPrice0);
      setOriginalPrice(variantOriginalPrice0);
    } else {
      setStock(product?.stock);
      setImg(product?.image?.[0] || product?.images?.[0]);
      const retailPrice = getNumber(product?.prices?.price);
      const retailOriginalPrice = getNumber(product?.prices?.originalPrice);
      const effectiveRetailPrice = isWholesaler && product?.wholePrice && Number(product.wholePrice) > 0 ? Number(product.wholePrice) : retailPrice;
      const discountPercentage = getNumber(((retailOriginalPrice - effectiveRetailPrice) / (retailOriginalPrice || effectiveRetailPrice)) * 100);
      setDiscount(getNumber(discountPercentage));
      setPrice(effectiveRetailPrice);
      setOriginalPrice(retailOriginalPrice);
    }
  }, [
    product?.prices?.discount,
    product?.prices?.originalPrice,
    product?.prices?.price,
    product?.stock,
    product.variants,
    selectVa,
    selectVariant,
    value,
  ]);
  // console.log("product", product);

  useEffect(() => {
    const res = Object.keys(Object.assign({}, ...product?.variants));

    const varTitle = attributes?.filter((att) => res.includes(att?._id));

    setVariantTitle(varTitle?.sort());
  }, [variants, attributes]);

  const handleAddToCart = (p) => {
    if (p.variants.length === 1 && p.variants[0].quantity < 1)
      return notifyError("Insufficient stock");

    if (stock <= 0) return notifyError("Insufficient stock");

    if (
      product?.variants.map(
        (variant) =>
          Object.entries(variant).sort().toString() ===
          Object.entries(selectVariant).sort().toString()
      )
    ) {
      const { variants, categories, description, ...updatedProduct } = product;
      const priceToUse = (isWholesaler && product?.wholePrice && Number(product.wholePrice) > 0)
        ? Number(product.wholePrice)
        : (p.variants.length === 0 ? getNumber(p.prices.price) : getNumber(price));

      const originalToUse = (isWholesaler && product?.wholePrice && Number(product.wholePrice) > 0)
        ? (getNumber(product.prices?.originalPrice) || priceToUse)
        : (p.variants.length === 0 ? getNumber(p.prices.originalPrice) : getNumber(originalPrice));

      const newItem = {
        ...updatedProduct,
        id: `${p?.variants.length <= 0
            ? p._id
            : p._id +
            "-" +
            variantTitle?.map((att) => selectVariant[att._id]).join("-")
          }`,
        title: `${p?.variants.length <= 0
            ? showingTranslateValue(p.title)
            : showingTranslateValue(p.title) +
            "-" +
            variantTitle
              ?.map((att) =>
                att.variants?.find((v) => v._id === selectVariant[att._id])
              )
              .map((el) => showingTranslateValue(el?.name))
          }`,
        image: img,
        variant: selectVariant || {},
        price: priceToUse,
        originalPrice: originalToUse,
      };

      // console.log("newItem", newItem);

      const minQty = isWholesaler && p?.minQuantity ? Number(p.minQuantity) : 1;
      handleAddItem(newItem, minQty);
    } else {
      return notifyError("Please select all variant first!");
    }
  };

  const handleMoreInfo = (slug) => {
    setModalOpen(false);

    router.push(`/product/${slug}`);
    setIsLoading(!isLoading);
    handleLogEvent("product", `opened ${slug} product details`);
  };

  const category_name = showingTranslateValue(product?.category?.name)
    ?.toLowerCase()
    ?.replace(/[^A-Z0-9]+/gi, "-");

  // console.log("product", product, "stock", stock);

  return (
    <>
      <MainModal modalOpen={modalOpen} setModalOpen={setModalOpen}>
        <div className="inline-block overflow-y-auto h-full align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          <div className="flex flex-col lg:flex-row md:flex-row w-full max-w-4xl overflow-hidden">
            <Link href={`/product/${product.slug}`} passHref>
              <div
                onClick={() => setModalOpen(false)}
                className="flex-shrink-0 flex items-center justify-center h-auto cursor-pointer"
              >
                {!isWholesaler && <Discount product={product} discount={discount} modal />}
                {product.image[0] ? (
                  <Image
                    src={img || product.image[0]}
                    width={420}
                    height={420}
                    alt="product"
                  />
                ) : (
                  <Image
                    src="https://res.cloudinary.com/ahossain/image/upload/v1655097002/placeholder_kvepfp.png"
                    width={420}
                    height={420}
                    alt="product Image"
                  />
                )}
              </div>
            </Link>

            <div className="w-full flex flex-col p-5 md:p-8 text-left">
              <div className="mb-2 md:mb-2.5 block -mt-1.5">
                <Link href={`/product/${product.slug}`} passHref>
                  <h1
                    onClick={() => setModalOpen(false)}
                    className="text-heading text-lg md:text-xl lg:text-2xl font-semibold font-serif hover:text-black cursor-pointer"
                  >
                    {showingTranslateValue(product?.title)}
                  </h1>
                </Link>
                <div
                  className={`${stock <= 0 ? "relative py-1 mb-2" : "relative"
                    }`}
                >
                  <Stock stock={stock} />
                </div>
              </div>
              <p className="text-sm leading-6 text-gray-500 md:leading-6">
                {showingTranslateValue(product?.description)}
              </p>
              <div className="flex items-center my-4">
                <Price
                  product={product}
                  price={price}
                  currency={currency}
                  originalPrice={originalPrice}
                  hideDiscountAndMRP={isWholesaler}
                />
              </div>


              {isWholesaler && product?.minQuantity && Number(product.minQuantity) > 0 && (
                <p className="text-xs text-gray-500 mt-1">Min order quantity: <span className="font-semibold">{product.minQuantity}</span></p>
              )}

              <div className="mb-6 space-y-4">
                {variantTitle?.map((a, i) => (
                  <span key={a._id}>
                    <h4 className="text-sm py-1 font-serif text-gray-700 font-bold">
                      {showingTranslateValue(a?.name)}:
                    </h4>
                    <div className="flex flex-row mb-3">
                      <VariantList
                        att={a._id}
                        lang={lang}
                        option={a.option}
                        setValue={setValue}
                        varTitle={variantTitle}
                        variants={product?.variants}
                        setSelectVa={setSelectVa}
                        selectVariant={selectVariant}
                        setSelectVariant={setSelectVariant}
                      />
                    </div>
                  </span>
                ))}
              </div>

              <div className="flex items-center mt-4">
                <div className="flex items-center justify-between space-s-3 sm:space-s-4 w-full">
                  <div className="group flex items-center justify-between rounded-md overflow-hidden flex-shrink-0 border h-11 md:h-12 border-gray-300">
                    <button
                      onClick={() => setItem(Math.max(item - 1, minQty))}
                      disabled={item <= minQty}
                      className="flex items-center justify-center flex-shrink-0 h-full transition ease-in-out duration-300 focus:outline-none w-8 md:w-12 text-heading border-e border-gray-300 hover:text-gray-500"
                    >
                      <span className="text-dark text-base">
                        <FiMinus />
                      </span>
                    </button>
                    <p className="font-semibold flex items-center justify-center h-full  transition-colors duration-250 ease-in-out cursor-default flex-shrink-0 text-base text-heading w-8  md:w-20 xl:w-24">
                      {item}
                    </p>
                    <button
                      onClick={() => setItem(Math.min(item + 1, stock || 0))}
                      disabled={item >= (stock || 0)}
                      className="flex items-center justify-center h-full flex-shrink-0 transition ease-in-out duration-300 focus:outline-none w-8 md:w-12 text-heading border-s border-gray-300 hover:text-gray-500"
                    >
                      <span className="text-dark text-base">
                        <FiPlus />
                      </span>
                    </button>
                  </div>
                  <button
                    onClick={() => handleAddToCart(product)}
                    disabled={product.quantity < 1}
                    className={`text-sm leading-4 inline-flex items-center cursor-pointer transition ease-in-out duration-300 font-semibold font-serif text-center justify-center border-0 border-transparent rounded-md focus-visible:outline-none focus:outline-none text-white px-4 ml-4 md:px-6 lg:px-8 py-4 md:py-3.5 lg:py-4 hover:text-white bg-${(require('@hooks/useGetSetting').default()?.storeCustomizationSetting?.theme?.color) || 'green'}-500 hover:bg-${(require('@hooks/useGetSetting').default()?.storeCustomizationSetting?.theme?.color) || 'green'}-600 w-full h-12`}
                  >
                    {t("common:addToCart")}
                  </button>
                </div>
              </div>
              <div className="flex items-center mt-4">
                <div className="flex items-center justify-between space-s-3 sm:space-s-4 w-full">
                  <div>
                    <span className="font-serif font-semibold py-1 text-sm d-block">
                      <span className="text-gray-700">
                        {t("common:category")}:
                      </span>{" "}
                      <Link
                        href={`/search?category=${category_name}&_id=${product?.category?._id}`}
                      >
                        <button
                          type="button"
                          className="text-gray-600 font-serif font-medium underline ml-2 hover:text-teal-600"
                          onClick={() => setIsLoading(!isLoading)}
                        >
                          {category_name}
                        </button>
                      </Link>
                    </span>

                    <Tags product={product} />
                  </div>

                  <div>
                    <button
                      onClick={() => handleMoreInfo(product.slug)}
                      className="font-sans font-medium text-sm text-orange-500"
                    >
                      {t("common:moreInfo")}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-2">
                <p className="text-xs sm:text-sm text-gray-600">
                  Call Us To Order By Mobile Number :{" "}
                  <a
                    href={`tel:${contactNumber.replace(/\s+/g, '')}`}
                    className="text-store-500 font-semibold hover:text-store-600 hover:underline"
                  >
                    {contactNumber}
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </MainModal>
    </>
  );
};

export default ProductModal;
