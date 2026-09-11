import Image from "next/image";
import { useMemo, useState, useEffect } from "react";
import useUtilsFunction from "@hooks/useUtilsFunction";

const VariantSpecification = ({
  variants,
  variantTitle,
  attributes,
  onVariantSelect,
  selectedVariant
}) => {
  const { showingTranslateValue, getNumber, getNumberTwo, currency } = useUtilsFunction();

  // Get variant display name
  const getVariantName = (variant) => {
    if (!variantTitle || variantTitle.length === 0) {
      return "Default Variant";
    }

    const variantNames = variantTitle
      ?.map((att) => {
        const attributeData = att?.variants?.filter(
          (val) => val?.name !== "All"
        );
        const attributeName = attributeData?.find(
          (v) => v._id === variant[att?._id]
        )?.name;

        if (attributeName === undefined) {
          return attributeName?.en;
        } else {
          return showingTranslateValue(attributeName);
        }
      })
      ?.filter(Boolean)
      .join(" ");

    return variantNames || "Default Variant";
  };

  // Get variant images - handle both variant.image (string) and variant.images (array)
  const getVariantImages = (variant) => {
    if (Array.isArray(variant?.images) && variant.images.length > 0) {
      return variant.images;
    }
    if (variant?.image) {
      return typeof variant.image === 'string' ? [variant.image] : [];
    }
    return [];
  };

  // Filter variants based on selected filters - show all variants but highlight selected
  const filteredVariants = useMemo(() => {
    if (!variants || variants.length === 0) return [];
    return variants;
  }, [variants]);

  // Check if variant matches selected filters
  const isVariantSelected = (variant) => {
    if (!selectedVariant || !variantTitle || variantTitle.length === 0) {
      return false;
    }

    return variantTitle.every((att) => {
      const selectedValue = selectedVariant[att._id];
      if (!selectedValue) return true; // If no selection for this attribute, consider it matching
      return variant[att._id] === selectedValue;
    });
  };

  if (!variants || variants.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 pt-8 border-t border-gray-200">
      <h3 className="text-xl font-semibold mb-4 font-serif text-gray-800">
        All Variants
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredVariants.map((variant, index) => {
          const variantImages = getVariantImages(variant);
          const variantName = getVariantName(variant);
          const isSelected = isVariantSelected(variant);

          return (
            <VariantCard
              key={index}
              variant={variant}
              variantImages={variantImages}
              variantName={variantName}
              isSelected={isSelected}
              onVariantSelect={onVariantSelect}
              currency={currency}
              getNumberTwo={getNumberTwo}
            />
          );
        })}
      </div>
    </div>
  );
};

// Separate component for variant card with image carousel
const VariantCard = ({
  variant,
  variantImages,
  variantName,
  isSelected,
  onVariantSelect,
  currency,
  getNumberTwo
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const { showingTranslateValue } = useUtilsFunction();

  // Reset active image index when variant images change
  useEffect(() => {
    setActiveImageIndex(0);
  }, [variantImages]);

  const handleImageChange = (img) => {
    const index = variantImages.findIndex(vImg => vImg === img);
    if (index !== -1) {
      setActiveImageIndex(index);
    }
  };

  // Filter valid images
  const validImages = variantImages?.filter(img => img && typeof img === 'string') || [];
  const currentImage = validImages[activeImageIndex] || validImages[0];

  return (
    <div
      onClick={() => onVariantSelect && onVariantSelect(variant)}
      className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${isSelected
          ? "border-store-500 shadow-md bg-store-50"
          : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
        }`}
    >
      {/* Variant Image - Main Image or Carousel */}
      <div className="mb-3">
        {/* Main Image Display */}
        <div className="relative w-full aspect-square bg-white border border-gray-100 rounded-lg overflow-hidden mb-2">
          {currentImage ? (
            <Image
              src={currentImage}
              alt={variantName}
              fill
              sizes="(max-width: 768px) 100vw, 25vw"
              className="object-contain"
              unoptimized
              onError={(e) => {
                e.target.src = "https://res.cloudinary.com/ahossain/image/upload/v1655097002/placeholder_kvepfp.png";
              }}
            />
          ) : (
            <Image
              src="https://res.cloudinary.com/ahossain/image/upload/v1655097002/placeholder_kvepfp.png"
              alt="placeholder"
              fill
              sizes="(max-width: 768px) 100vw, 25vw"
              className="object-contain"
              unoptimized
            />
          )}
        </div>

        {/* Image Thumbnails for Multiple Images */}
        {validImages.length > 1 && (
          <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
            {validImages.map((img, idx) => (
              <button
                key={`thumb-${idx}-${img}`}
                onClick={(e) => {
                  e.stopPropagation(); // Prevent variant selection when clicking thumbnail
                  handleImageChange(img);
                }}
                className={`flex-shrink-0 relative w-12 h-12 border-2 rounded overflow-hidden transition-all ${idx === activeImageIndex
                    ? "border-store-500 ring-2 ring-store-200"
                    : "border-gray-200 hover:border-gray-400"
                  }`}
              >
                <Image
                  src={img}
                  alt={`${variantName} - Image ${idx + 1}`}
                  fill
                  sizes="48px"
                  className="object-cover"
                  unoptimized
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Variant Name */}
      <h4 className="font-semibold text-sm mb-2 text-gray-800 line-clamp-2">
        {variantName}
      </h4>

      {/* Variant Details */}
      <div className="space-y-1 text-xs text-gray-600">
        {variant.sku && (
          <p>
            <span className="font-medium">SKU:</span> {variant.sku}
          </p>
        )}
        {variant.barcode && (
          <p>
            <span className="font-medium">Barcode:</span> {variant.barcode}
          </p>
        )}
        <div className="flex items-center justify-between mt-2">
          <div>
            {variant.originalPrice > variant.price && (
              <p className="text-xs text-gray-400 line-through">
                {currency}
                {getNumberTwo(variant.originalPrice)}
              </p>
            )}
            <p className="font-semibold text-store-600">
              {currency}
              {getNumberTwo(variant.price)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">
              <span className="font-medium">Stock:</span> {variant.quantity || 0}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VariantSpecification;

