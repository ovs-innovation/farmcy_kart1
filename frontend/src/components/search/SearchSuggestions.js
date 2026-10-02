import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { IoSearchOutline } from "react-icons/io5";
import { FiTag, FiGrid, FiPackage } from "react-icons/fi";
import ProductServices from "@services/ProductServices";

const SearchSuggestions = ({ searchText, onSelect, showSuggestions, onClose }) => {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const suggestionsRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Debounce search input
  const [debouncedSearchText, setDebouncedSearchText] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText || "");
    }, 250); // 250ms debounce

    return () => clearTimeout(timer);
  }, [searchText]);

  // Fetch suggestions from dedicated fast server endpoint with request cancellation
  useEffect(() => {
    const trimmed = debouncedSearchText.trim();

    if (!showSuggestions || trimmed.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    // Cancel any previous in-flight autocomplete request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);

    ProductServices.getAutocompleteSuggestions(trimmed, controller.signal)
      .then((res) => {
        if (!controller.signal.aborted) {
          setSuggestions(res?.suggestions || []);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (err?.name !== "CanceledError" && err?.code !== "ERR_CANCELED") {
          console.warn("Autocomplete fetch error:", err.message);
          setSuggestions([]);
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [debouncedSearchText, showSuggestions]);

  const handleSuggestionClick = async (e, suggestion) => {
    if (onClose) onClose();

    let targetPath = "";
    let targetQuery = {};

    if (suggestion.type === "product") {
      // Direct navigation to product details page
      if (suggestion.slug) {
        targetPath = `/product/${suggestion.slug}`;
      } else if (suggestion.id) {
        targetPath = `/product/${suggestion.id}`;
      }
    } else if (suggestion.type === "brand") {
      targetPath = "/search";
      targetQuery = { brand: suggestion.id || suggestion.slug };
    } else if (suggestion.type === "category") {
      targetPath = "/search";
      targetQuery = { _id: suggestion.id, category: suggestion.slug };
    }

    if (targetPath) {
      try {
        if (Object.keys(targetQuery).length > 0) {
          await router.push(
            {
              pathname: targetPath,
              query: targetQuery,
            },
            undefined,
            { shallow: false }
          );
        } else {
          await router.push(targetPath, undefined, { shallow: false });
        }
      } catch (error) {
        console.error("Navigation error:", error);
        const url =
          Object.keys(targetQuery).length > 0
            ? `${targetPath}?${new URLSearchParams(targetQuery).toString()}`
            : targetPath;
        window.location.href = url;
      }
    }

    if (onSelect) onSelect();
  };

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        const searchInput = event.target.closest('input[type="text"]');
        if (!searchInput && onClose) {
          onClose();
        }
      }
    };

    if (showSuggestions) {
      setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 100);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSuggestions, onClose]);

  if (!showSuggestions || !searchText || searchText.trim().length < 1) {
    return null;
  }

  return (
    <div
      ref={suggestionsRef}
      className="search-suggestions-container absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-[100] max-h-96 overflow-y-auto"
      style={{ position: "absolute", zIndex: 100 }}
    >
      {isLoading ? (
        <div className="p-4 text-center text-gray-500 text-sm">Searching...</div>
      ) : suggestions.length > 0 ? (
        <div className="py-2">
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.type}-${suggestion.id || index}`}
              type="button"
              onClick={(e) => handleSuggestionClick(e, suggestion)}
              onMouseDown={(e) => e.preventDefault()}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left cursor-pointer"
            >
              {suggestion.image ? (
                <span className="flex-shrink-0 w-8 h-8 rounded bg-gray-100 flex items-center justify-center overflow-hidden">
                  <img
                    src={suggestion.image}
                    alt={suggestion.title}
                    className="object-contain w-8 h-8"
                  />
                </span>
              ) : (
                <span className="text-gray-400 flex-shrink-0">
                  {suggestion.type === "brand" ? (
                    <FiTag className="w-5 h-5" />
                  ) : suggestion.type === "category" ? (
                    <FiGrid className="w-5 h-5" />
                  ) : (
                    <FiPackage className="w-5 h-5" />
                  )}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800 truncate">
                  {suggestion.title}
                </div>
                <div className="text-xs text-gray-500 capitalize flex items-center gap-2">
                  <span>{suggestion.type}</span>
                  {suggestion.price ? (
                    <span className="text-store-600 font-semibold">
                      ₹{suggestion.price}
                    </span>
                  ) : null}
                </div>
              </div>
              <IoSearchOutline className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </button>
          ))}
        </div>
      ) : debouncedSearchText.trim().length >= 2 ? (
        <div className="p-4 text-center text-gray-500 text-sm">
          No suggestions found for &quot;{debouncedSearchText}&quot;
        </div>
      ) : null}
    </div>
  );
};

export default SearchSuggestions;
