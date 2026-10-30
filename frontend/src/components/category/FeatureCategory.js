import { useRouter } from "next/router";
import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

// Internal imports
import CategoryServices from "@services/CategoryServices";
import CMSkeleton from "@components/preloader/CMSkeleton";
import useUtilsFunction from "@hooks/useUtilsFunction";

const FeatureCategory = ({ initialSelectedCategory }) => {
  const router = useRouter();
  const { showingTranslateValue } = useUtilsFunction();
  const [selectedLeft, setSelectedLeft] = useState(null);

  const getCategoryName = (category) => {
    if (!category) return "";
    const raw = typeof category === "object" && category !== null && "name" in category ? category.name : category;
    const val = showingTranslateValue ? showingTranslateValue(raw) : (raw?.en || raw);
    if (typeof val === "string") return val;
    if (typeof val === "number" || typeof val === "boolean") return String(val);
    if (typeof val === "object" && val !== null) {
      if (typeof val.en === "string") return val.en;
      const firstStr = Object.values(val).find(v => typeof v === "string" && v.trim() !== "");
      return firstStr || "";
    }
    return "";
  };

  const { data, error, isLoading: loading } = useQuery({
    queryKey: ["category"],
    queryFn: async () => await CategoryServices.getShowingCategory(),
  });

  const parentCategories = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];

    // Check if we have a single "Home" or "Root" category that acts as a container
    const homeRoot = data.find(cat =>
      cat.id === "" ||
      showingTranslateValue(cat?.name)?.toLowerCase() === "home"
    );

    let topLevel = [];
    if (homeRoot && homeRoot.children && homeRoot.children.length > 0) {
      topLevel = homeRoot.children;
    } else {
      topLevel = data;
    }

    // Flattening logic: Promote children of "Medicine"
    let finalCategories = [];
    topLevel.forEach(cat => {
      const name = showingTranslateValue(cat?.name)?.toLowerCase();
      if ((name === 'medicine' || name === 'medicines') && cat.children?.length > 0) {
        finalCategories = [...finalCategories, ...cat.children];
      } else {
        finalCategories.push(cat);
      }
    });

    return finalCategories;
  }, [data, showingTranslateValue]);

  const rightCategories = useMemo(() => {
    return selectedLeft?.children || [];
  }, [selectedLeft]);

  useEffect(() => {
    if (initialSelectedCategory) {
      setSelectedLeft(initialSelectedCategory);
    } else if (parentCategories.length > 0 && !selectedLeft) {
      setSelectedLeft(parentCategories[0]);
    }
  }, [parentCategories, initialSelectedCategory, selectedLeft]);

  const handleSubcategoryClick = (subcategory) => {
    const catName = getCategoryName(subcategory) || "";
    router.push(
      {
        pathname: "/search",
        query: { category: catName, _id: subcategory._id },
      },
      undefined,
      { shallow: false }
    );
  };

  if (loading && (!parentCategories || parentCategories.length === 0)) return <CMSkeleton count={10} height={20} error={error} loading={loading} />;

  return (
    <div className="w-full max-w-screen-2xl mx-auto px-3 sm:px-4 lg:px-6">
      {/* Header Section - Mobile Only */}
      <div className="lg:hidden mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">
          Browse Categories
        </h2>
        <p className="text-sm text-gray-500">Find what you're looking for</p>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-[18rem_1fr] xl:grid-cols-[20rem_1fr] lg:gap-6 lg:items-stretch">

        {/* Left Sidebar - Parent Categories */}
        <div className="w-full mb-4 lg:mb-0 flex flex-col min-h-0">
          {/* Desktop Sidebar */}
          <div className="hidden lg:flex lg:flex-col bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg border border-gray-100 overflow-hidden flex-1 min-h-0">
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-5 flex-shrink-0 min-h-[5.5rem] flex flex-col justify-center">
              <h2 className="text-xl font-bold text-white leading-tight">Categories</h2>
              <p className="text-emerald-100 text-sm mt-1">Explore our collection</p>
            </div>
            <div className="p-3 flex-1 overflow-y-auto custom-scrollbar min-h-0">
              <div className="space-y-2">
                {parentCategories.map((category) => {
                  const isActive = selectedLeft?._id === category._id;
                  return (
                    <button
                      key={category._id}
                      onClick={() => setSelectedLeft(category)}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group ${isActive
                        ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-200/50"
                        : "hover:bg-emerald-50 text-gray-700"
                        }`}
                    >
                      <div
                        className={`relative w-11 h-11 flex-shrink-0 rounded-xl flex items-center justify-center transition-all duration-300 ${isActive ? "bg-white/20" : "bg-emerald-50 group-hover:bg-emerald-100"
                          }`}
                      >
                        {category.icon ? (
                          <img
                            src={category.icon}
                            alt={getCategoryName(category)}
                            className="w-7 h-7 object-contain"
                          />
                        ) : (
                          <span
                            className={`text-base font-bold ${isActive ? "text-white" : "text-emerald-600"
                              }`}
                          >
                            {getCategoryName(category)?.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <span className="text-sm font-semibold block leading-tight">
                          {getCategoryName(category)}
                        </span>
                        {category.children?.length > 0 && (
                          <span
                            className={`text-xs mt-0.5 block ${isActive ? "text-emerald-100" : "text-gray-400"
                              }`}
                          >
                            {category.children.length} items
                          </span>
                        )}
                      </div>
                      <svg
                        className={`w-5 h-5 transition-transform duration-300 ${isActive ? "text-white translate-x-1" : "text-gray-400 group-hover:translate-x-1"
                          }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Mobile Horizontal Scroll */}
          <div className="lg:hidden">
            <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar snap-x snap-mandatory">
              {parentCategories.map((category) => {
                const isActive = selectedLeft?._id === category._id;
                return (
                  <button
                    key={category._id}
                    onClick={() => setSelectedLeft(category)}
                    className={`flex-shrink-0 snap-start flex flex-col items-center gap-2 px-4 py-3 rounded-2xl transition-all duration-300 min-w-[90px] sm:min-w-[100px] ${isActive
                      ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-200/60"
                      : "bg-white text-gray-700 border-2 border-gray-100 hover:border-emerald-200"
                      }`}
                  >
                    <div
                      className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center transition-all ${isActive ? "bg-white/20" : "bg-emerald-50"
                        }`}
                    >
                      {category.icon ? (
                        <img
                          src={category.icon}
                          alt={getCategoryName(category)}
                          className="w-8 h-8 object-contain"
                        />
                      ) : (
                        <span
                          className={`text-lg font-bold ${isActive ? "text-white" : "text-emerald-600"
                            }`}
                        >
                          {getCategoryName(category)?.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-center line-clamp-2 leading-tight">
                      {getCategoryName(category)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Content Area - Subcategories */}
        <div className="flex-1 min-w-0 w-full flex flex-col min-h-0">
          <div className="bg-[#E5F5EE] rounded-2xl shadow-lg border border-gray-100 overflow-hidden flex flex-col flex-1 min-h-0 lg:min-h-full">
            {/* Header — same height band as left "Categories" header */}
            <div className="bg-[#E5F5EE] px-6 py-5 border-b border-gray-100 flex-shrink-0 min-h-[5.5rem] flex items-center">
              <div className="flex items-center justify-between gap-4 w-full min-w-0">
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2 leading-tight">
                    <span className="truncate">{getCategoryName(selectedLeft)}</span>
                    {rightCategories.length > 0 && (
                      <span className="inline-flex flex-shrink-0 items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        {rightCategories.length}
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Choose from our selection
                  </p>
                </div>
                <div className="hidden sm:flex flex-shrink-0">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-md shadow-emerald-200/50">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Subcategories Grid */}
            <div className="p-3 sm:p-4 lg:p-6 xl:p-8 flex-1 min-h-0">
              {rightCategories.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
                  {rightCategories.map((child) => (
                    <button
                      key={child._id}
                      onClick={() => handleSubcategoryClick(child)}
                      className="group relative bg-white rounded-2xl border-2 border-gray-100 hover:border-emerald-400 p-3 sm:p-4 lg:p-5 transition-all duration-500 hover:shadow-2xl hover:shadow-emerald-100/50 hover:-translate-y-1 overflow-hidden"
                    >
                      {/* Hover Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>

                      {/* Content */}
                      <div className="relative z-10">
                        {/* Icon Container */}
                        <div className="relative w-full aspect-square mb-3 sm:mb-4 overflow-hidden rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 p-2 sm:p-3 group-hover:from-emerald-50 group-hover:to-emerald-100 transition-all duration-500">
                          <img
                            src={child.icon || "/placeholder.png"}
                            alt={getCategoryName(child)}
                            className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-110 group-hover:rotate-3"
                          />
                          {/* Corner Accent */}
                          <div className="absolute top-0 right-0 w-6 h-6 bg-emerald-500 rounded-bl-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <svg className="w-4 h-4 text-white m-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>

                        {/* Category Name */}
                        <h4 className="text-xs sm:text-sm font-bold text-gray-800 group-hover:text-emerald-700 text-center line-clamp-2 leading-tight min-h-[2.5rem] sm:min-h-[2.8rem] flex items-center justify-center transition-colors duration-300">
                          {getCategoryName(child)}
                        </h4>

                        {/* Explore Label */}
                        <div className="mt-2 sm:mt-3 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                          <span className="text-[10px] sm:text-xs font-bold text-emerald-600 uppercase tracking-wider">
                            Explore
                          </span>
                          <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>

                      {/* Shine Effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-700 transform -skew-x-12 group-hover:translate-x-full"></div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-16 sm:py-20 lg:py-24 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-100 mb-4">
                    <svg className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  </div>
                  <p className="text-gray-400 text-sm sm:text-base font-medium">
                    No subcategories available
                  </p>
                  <p className="text-gray-300 text-xs sm:text-sm mt-1">
                    Check back later for updates
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Custom Styles */}
      <style jsx>{`
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #10b981;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #059669;
        }
      `}</style>
    </div>
  );
};

export default FeatureCategory;