import { Avatar, TableBody, TableCell, TableRow, Button } from "@windmill/react-ui";
import { FiEdit } from "react-icons/fi";
import { useState } from "react";
import useUtilsFunction from "@/hooks/useUtilsFunction";
import VariantEditDrawer from "./VariantEditDrawer";

const AttributeList = ({ variants, variantTitle, lang, onUpdateVariant }) => {
  const { showingTranslateValue, currency, getNumberTwo } = useUtilsFunction();
  const [editingVariant, setEditingVariant] = useState(null);

  const handleEditVariant = (variant, index) => {
    setEditingVariant({ variant, index });
  };

  const handleSaveVariant = (updatedVariant) => {
    if (onUpdateVariant && editingVariant) {
      onUpdateVariant(updatedVariant, editingVariant.index);
    }
    setEditingVariant(null);
  };

  const handleCloseEdit = () => {
    setEditingVariant(null);
  };

  // Helper function to get variant details including hex color
  const getVariantDetails = (attributeId, variantId) => {
    const attribute = variantTitle?.find(attr => attr._id === attributeId);
    if (!attribute) return null;

    const variant = attribute.variants?.find(v => v._id === variantId);
    return variant;
  };

  // Check if this is a color attribute
  const isColorAttribute = (attributeId) => {
    const attribute = variantTitle?.find(attr => attr._id === attributeId);
    return attribute?.title?.en?.toLowerCase() === "color" ||
      attribute?.name?.en?.toLowerCase() === "color";
  };

  return (
    <>
      {editingVariant && (
        <VariantEditDrawer
          variant={editingVariant.variant}
          onSave={handleSaveVariant}
          onClose={handleCloseEdit}
          language={lang}
          errors={{}}
          variantTitle={variantTitle}
        />
      )}
      <TableBody>
        {variants?.map((variant, i) => (
          <TableRow key={i + 1}>
            <TableCell className="font-semibold uppercase text-xs">
              {i + 1}
            </TableCell>
            <TableCell>
              <div className="flex items-center">
                {variant.image && variant.image.length > 0 ? (
                  <Avatar
                    className="hidden p-1 mr-2 md:block bg-gray-50 shadow-none"
                    src={variant.image[0]}
                    alt="product"
                  />
                ) : (
                  <Avatar
                    src="https://res.cloudinary.com/ahossain/image/upload/v1655097002/placeholder_kvepfp.png"
                    alt="product"
                    className="hidden p-1 mr-2 md:block bg-gray-50 shadow-none"
                  />
                )}
              </div>
            </TableCell>
            <TableCell>
              <div className="flex flex-col text-sm">
                {/* Variant Title - Primary Display */}
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {variant.title?.[lang] ||
                    variantTitle
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
                      .join(" ") ||
                    `Variant ${i + 1}`}
                </span>

                {/* Color variants with full hex color circles */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {variantTitle?.map((att) => {
                    const variantId = variant[att._id];
                    if (!variantId) return null;

                    const variantDetails = getVariantDetails(att._id, variantId);
                    if (!variantDetails) return null;

                    const isColor = isColorAttribute(att._id);

                    return (
                      <div key={att._id} className="relative group">
                        <div className="flex items-center space-x-2 bg-gray-50 rounded-full px-3 py-1 text-xs border border-gray-200 hover:border-gray-300 transition-all duration-200">
                          {/* Full hex color circle for color attributes */}
                          {isColor && variantDetails.hexColor ? (
                            <div
                              className="w-4 h-4 rounded-full shadow-md transition-all duration-200 hover:ring-2 hover:ring-gray-300"
                              style={{
                                backgroundColor: variantDetails.hexColor,
                                boxShadow: `0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)`
                              }}
                              title={`${showingTranslateValue(variantDetails.name)} (${variantDetails.hexColor})`}
                            />
                          ) : (
                            <span className="text-gray-600">
                              {showingTranslateValue(att.name)}:
                            </span>
                          )}

                          <span className="text-gray-700 font-medium">
                            {showingTranslateValue(variantDetails.name)}
                          </span>

                          {/* Hex color display for color attributes */}
                          {isColor && variantDetails.hexColor && (
                            <span className="text-xs font-mono text-gray-500">
                              {variantDetails.hexColor}
                            </span>
                          )}
                        </div>

                        {/* Hover tooltip for color attributes */}
                        {isColor && variantDetails.hexColor && (
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap z-10 shadow-xl">
                            <div className="flex items-center space-x-2">
                              <div
                                className="w-4 h-4 rounded-full border-2 border-white shadow-lg"
                                style={{ backgroundColor: variantDetails.hexColor }}
                              />
                              <div className="flex flex-col">
                                <span className="font-semibold text-white">
                                  {showingTranslateValue(variantDetails.name)}
                                </span>
                                <span className="font-mono text-gray-300">
                                  {variantDetails.hexColor}
                                </span>
                              </div>
                            </div>
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-3 border-r-3 border-t-3 border-transparent border-t-gray-900"></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Slug Display */}
                {variant.slug && (
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    Slug: {variant.slug}
                  </span>
                )}

                {variant.productId && (
                  <span className="text-xs text-gray-500">
                    ({variant.productId})
                  </span>
                )}
              </div>
            </TableCell>

            <TableCell className="font-semibold uppercase text-xs">
              {variant.sku}
            </TableCell>
            <TableCell className="font-semibold uppercase text-xs">
              {variant.barcode}
            </TableCell>

            <TableCell className="font-semibold uppercase text-xs">
              {currency}
              {getNumberTwo(variant.originalPrice)}
            </TableCell>
            <TableCell className="font-semibold uppercase text-xs">
              {currency}
              {getNumberTwo(variant.price)}
            </TableCell>

            <TableCell className="font-semibold uppercase text-xs">
              {variant.quantity}
            </TableCell>
            <TableCell>
              <Button
                size="small"
                layout="outline"
                onClick={() => handleEditVariant(variant, i)}
                className="text-blue-600 hover:text-blue-800"
              >
                <FiEdit className="w-4 h-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </>
  );
};

export default AttributeList;
