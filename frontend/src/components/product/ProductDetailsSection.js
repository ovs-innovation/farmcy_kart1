import { useMemo, useState } from "react";

const placeholderImage = "https://res.cloudinary.com/ahossain/image/upload/v1655097002/placeholder_kvepfp.png";

const ProductDetailsSection = ({ dynamicSections = [], mediaSections = [], selectedAttributes = {}, isVariantSpecific = false }) => {
  const [expandedSections, setExpandedSections] = useState({});

  const visibleDynamicSections = useMemo(() => {
    // Basic filtering - remove invalid sections
    // For variant-specific sections, ignore isVisible flag (variants should always show their sections)
    const validSections = (dynamicSections || []).filter(
      (section) => {
        if (!section) return false;

        // For variant-specific sections, ignore isVisible flag
        // For product-level sections, respect isVisible flag
        if (!isVariantSpecific && section?.isVisible === false) return false;

        if (!Array.isArray(section?.subsections)) return false;

        // Check if section has at least one valid subsection
        const hasValidSubsections = section.subsections.some((sub) => {
          if (!sub) return false;

          // For variant-specific sections, ignore subsection isVisible flag
          // For product-level sections, respect isVisible flag
          if (!isVariantSpecific && sub?.isVisible === false) return false;

          // For keyValue type, check if it has key or value
          if (sub?.type !== "paragraph") {
            return Boolean(
              (sub?.key && sub.key.trim()) ||
              (sub?.value && sub.value.trim()) ||
              (sub?.title && sub.title.trim())
            );
          }

          // For paragraph type, check if it has content
          return Boolean(
            (sub?.content && sub.content.trim()) ||
            (sub?.value && sub.value.trim()) ||
            (sub?.description && sub.description.trim())
          );
        });
        return hasValidSubsections;
      }
    );

    // If these are variant-specific sections, show them all (no attribute filtering)
    // Variant sections are already filtered by variant selection
    if (isVariantSpecific) {
      return validSections;
    }

    // For product-level sections, only filter if section explicitly has attribute requirements
    // AND attributes are selected
    const selectedAttrKeys = Object.keys(selectedAttributes || {});
    const hasSelectedAttributes = selectedAttrKeys.length > 0;

    return validSections.filter((section) => {
      // If section has explicit attribute requirements
      if (section?.attributes && typeof section.attributes === 'object' && Object.keys(section.attributes).length > 0) {
        const sectionAttrs = section.attributes;

        // If attributes are selected, check if they match
        if (hasSelectedAttributes) {
          const matchesAttributes = Object.keys(sectionAttrs).every(
            (attrKey) => {
              const requiredValue = sectionAttrs[attrKey];
              const selectedValue = selectedAttributes[attrKey];

              // If section requires a specific value, it must match selected value
              if (requiredValue) {
                return selectedValue === requiredValue;
              }
              return true;
            }
          );
          return matchesAttributes;
        }

        // If section requires attributes but none are selected, hide it
        return false;
      }

      // If section doesn't have attribute requirements, always show it
      return true;
    });
  },
    [dynamicSections, selectedAttributes, isVariantSpecific]
  );

  const visibleMediaSections = useMemo(
    () =>
      (mediaSections || []).filter(
        (section) => {
          if (!section) return false;

          // For variant-specific sections, ignore isVisible flag
          // For product-level sections, respect isVisible flag
          if (!isVariantSpecific && section?.isVisible === false) return false;

          if (!Array.isArray(section?.items)) return false;

          // Check if section has at least one valid item with image or details
          const hasValidItems = section.items.some((item) => {
            if (!item) return false;

            // For variant-specific sections, ignore item isVisible flag
            // For product-level sections, respect isVisible flag
            if (!isVariantSpecific && item?.isVisible === false) return false;

            return Boolean(
              (item?.image && item.image.trim()) ||
              (item?.details && item.details.trim())
            );
          });

          return hasValidItems;
        }
      ),
    [mediaSections, isVariantSpecific]
  );

  if (!visibleDynamicSections.length && !visibleMediaSections.length) {
    return null;
  }

  const handleToggleSection = (sectionKey) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const renderKeyValueRow = (subsection, idx) => {
    const label =
      subsection?.key || subsection?.title || `Detail ${idx + 1}` || "";
    const value =
      subsection?.value ||
      subsection?.content ||
      subsection?.description ||
      "—";

    return (
      <div
        key={`${label}-${idx}`}
        className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-gray-100 last:border-none"
      >
        <span className="text-sm text-gray-500 font-medium">{label}</span>
        <span className="text-sm text-gray-900 font-semibold mt-1 sm:mt-0 sm:text-right">
          {value}
        </span>
      </div>
    );
  };

  return (
    <div className="mt-10 space-y-8">
      <div>
        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 mb-6 px-1">
          In-Depth Features
        </h2>
      </div>
      {visibleDynamicSections.map((section, sectionIndex) => {
        const sectionKey = `${section?.name || "section"}-${sectionIndex}`;
        // Filter keyValue subsections
        const keyValueSubsections = (section?.subsections || []).filter(
          (sub) => {
            if (!sub || sub?.isVisible === false) return false;
            return sub?.type !== "paragraph";
          }
        );
        const paragraphSubsections = (section?.subsections || []).filter(
          (sub) => sub?.type === "paragraph" && sub?.isVisible !== false
        );
        const isExpanded = expandedSections[sectionKey];
        const visibleRows = isExpanded ? keyValueSubsections : keyValueSubsections.slice(0, 6);

        return (
          <div
            key={sectionKey}
            className="bg-white border border-gray-100 rounded-[2rem] shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] overflow-hidden transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]"
          >
            <div className="px-8 py-6 bg-gray-50/50 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-800">
                {section?.name || "Product Specification"}
              </h3>
              {section?.description && (
                <p className="text-sm text-gray-500 mt-2">
                  {section.description}
                </p>)} </div>

            {keyValueSubsections.length > 0 && (
              <div className="px-5 md:px-6">
                {visibleRows.map((sub, idx) => {
                  const label = sub?.key || sub?.title || `Detail ${idx + 1}` || "";
                  const value = sub?.value || sub?.content || sub?.description || "—";

                  // Skip rendering if both label and value are empty
                  if (!label && !value) return null;

                  return (
                    <div key={`${sectionKey}-row-${idx}`}
                      className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-3 border-b border-gray-100 last:border-none"
                    >
                      <span className="text-sm text-gray-500 font-medium">
                        {label}
                      </span>
                      <span className="text-sm text-gray-900 font-semibold sm:col-span-2">
                        {value}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {keyValueSubsections.length > 6 && (
              <div className="px-5 md:px-6 pb-4">
                <button
                  type="button"
                  onClick={() => handleToggleSection(sectionKey)}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  {isExpanded ? "Show Less" : "Read More"}
                </button>
              </div>
            )}

            {paragraphSubsections.length > 0 && (
              <div className="px-5 md:px-6 pb-4 space-y-3">
                {paragraphSubsections.map((paragraph, idx) => (
                  <p
                    key={`${sectionKey}-paragraph-${idx}`}
                    className="text-sm leading-relaxed text-gray-600 text-justify"
                  >
                    {paragraph?.content ||
                      paragraph?.value ||
                      paragraph?.description ||
                      ""}
                  </p>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {visibleMediaSections.map((section, sectionIndex) => (
        <div
          key={`${section?.name || "media"}-${sectionIndex}`}
          className="bg-white border border-gray-100 rounded-2xl shadow-sm"
        >
          <div className="px-5 md:px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">
              {section?.name || "Highlights"}
            </h3>
            {section?.description && (
              <p className="text-sm text-gray-500 mt-1 text-justify">
                {section.description}
              </p>
            )}
          </div>

          <div className=" flex flex-col gap-10 p-5 md:p-6">
            {(section?.items || [])
              .filter((item) => item && item?.details)
              .map((item, idx) => (
                <div
                  key={`${section?.name || "media"}-item-${idx}`}
                  className="flex flex-col sm:flex-row sm:even:flex-row-reverse items-center sm:items-stretch gap-5 p-4 border border-gray-100 rounded-xl"
                >
                  <div className="w-44 sm:w-64 flex-shrink-0 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                    <img
                      src={item?.image || placeholderImage}
                      alt={item?.details || section?.name || "Product highlight"}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        if (e.target.src !== placeholderImage) {
                          e.target.src = placeholderImage;
                        }
                      }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed text-justify">
                    {item?.details}
                  </p>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>);
};
export default ProductDetailsSection;