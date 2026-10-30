import React from "react";
import useGetSetting from "@hooks/useGetSetting";
import { getPalette } from "@utils/themeColors";
import CMSkeleton from "@components/preloader/CMSkeleton";
import useUtilsFunction from "@hooks/useUtilsFunction";

const SectionHeader = ({ title, subtitle, loading = false, error = null, align = "left" }) => {
  const { storeCustomizationSetting } = useGetSetting();
  const { showingTranslateValue } = useUtilsFunction();
  const storeColor = storeCustomizationSetting?.theme?.color || "green";
  const palette = getPalette(storeColor);
  
  // Helper function to get display value (handles both strings and translation objects)
  const getDisplayValue = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "object") return showingTranslateValue(value);
    return String(value);
  };

  const alignmentClass = align === "center" ? "text-center" : "text-left";
  const containerClass = align === "center" ? "justify-center" : "justify-start";

  const displayTitle = getDisplayValue(title);
  const displaySubtitle = subtitle ? getDisplayValue(subtitle) : "";

  return (
    <div className={`${alignmentClass} mb-10`}>
      <h2 
        className="text-xl md:text-2xl lg:text-3xl font-bold mb-3" 
        style={{ color: palette[700] }}
      >
        {loading && !displayTitle ? (
          <CMSkeleton count={1} height={30} loading={loading} data="" />
        ) : (
          displayTitle
        )}
      </h2>
      {/* <div className={`flex ${containerClass} mb-3`}>
        <svg
          width="100"
          height="16"
          viewBox="0 0 120 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ color: palette[600] }}
        >
          <path
            d="M0 10 L30 10 L35 5 L40 15 L45 10 L75 10 L80 5 L85 15 L90 10 L120 10"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div> */}
      {displaySubtitle && (
        <p className={`text-gray-600 text-sm md:text-base ${align === "center" ? "max-w-2xl mx-auto" : ""}`}>
          {loading ? (
            <CMSkeleton count={4} height={10} error={error} loading={loading} data="" />
          ) : (
            displaySubtitle
          )}
        </p>
      )}
    </div>
  );
};

export default SectionHeader;

