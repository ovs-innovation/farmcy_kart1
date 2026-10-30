"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { IoChevronDown } from "react-icons/io5";
import useUtilsFunction from "@hooks/useUtilsFunction";

export default function LowerCategoryNavbar({
  categories = [],
  showingTranslateValue,
  variant = "row",
}) {
  const { showingTranslateValue: hookTranslate } = useUtilsFunction();
  const translate = showingTranslateValue || hookTranslate;
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef(null);
  const closeTimerRef = useRef(null);
  const isInline = variant === "inline";

  useEffect(() => {
    setMounted(true);
  }, []);

  const getId = (cat) => String(cat?._id ?? "");

  const createSlug = (name) => {
    if (!name) return "";
    return name
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const getName = (cat) => {
    if (!cat) return "";
    const raw = typeof cat === "object" && cat !== null && "name" in cat ? cat.name : cat;
    const val = translate ? translate(raw) : (raw?.en || raw);
    if (typeof val === "string") return val;
    if (typeof val === "number" || typeof val === "boolean") return String(val);
    if (typeof val === "object" && val !== null) {
      if (typeof val.en === "string") return val.en;
      const firstStr = Object.values(val).find(v => typeof v === "string" && v.trim() !== "");
      return firstStr || "";
    }
    return "";
  };

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => setActiveCategoryId(null), 250);
  };

  const openMenu = useCallback((category, anchorEl) => {
    clearCloseTimer();
    const id = getId(category);
    if (!anchorEl) return;

    const rect = anchorEl.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 6,
      left: rect.left + rect.width / 2,
    });
    setActiveCategoryId(id);
  }, []);

  useEffect(() => {
    if (!activeCategoryId) return;

    const updatePos = () => {
      const btn = dropdownRef.current?.querySelector(
        `[data-category-id="${activeCategoryId}"]`
      );
      if (btn) {
        const rect = btn.getBoundingClientRect();
        setMenuPos({ top: rect.bottom + 6, left: rect.left + rect.width / 2 });
      }
    };

    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [activeCategoryId]);

  useEffect(() => {
    const onDocDown = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        const portal = document.getElementById("category-nav-dropdown-portal");
        if (portal && portal.contains(e.target)) return;
        setActiveCategoryId(null);
      }
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  if (!categories || categories.length === 0) return null;

  const activeCategory = categories.find((c) => getId(c) === activeCategoryId);
  const hasChildren = activeCategory?.children?.length > 0;

  const dropdownMenu =
    mounted && activeCategory && (
      <div
        id="category-nav-dropdown-portal"
        className="fixed z-[9999] w-72 -translate-x-1/2"
        style={{ top: menuPos.top, left: menuPos.left }}
        onMouseEnter={clearCloseTimer}
        onMouseLeave={scheduleClose}
      >
        <div className="bg-white shadow-[0_12px_48px_rgba(0,0,0,0.15)] rounded-xl border border-gray-200 py-2 overflow-hidden">
          <Link
            href={`/search?category=${activeCategory.slug || createSlug(getName(activeCategory))}&_id=${activeCategory._id}`}
            className="px-5 py-3 text-sm font-bold text-store-600 uppercase tracking-wide block border-b border-gray-100 hover:bg-store-50"
            onClick={() => setActiveCategoryId(null)}
          >
            View All {getName(activeCategory)}
          </Link>
          {hasChildren ? (
            <div className="max-h-[60vh] overflow-y-auto">
              {activeCategory.children.map((sub) => (
                <Link
                  key={sub._id}
                  href={`/search?category=${sub.slug || createSlug(getName(sub))}&_id=${sub._id}`}
                  onClick={() => setActiveCategoryId(null)}
                  className="block px-5 py-2.5 text-sm text-gray-700 hover:bg-store-50 hover:text-store-700"
                >
                  {getName(sub)}
                </Link>
              ))}
            </div>
          ) : (
            <p className="px-5 py-2 text-xs text-gray-500">Browse all products in this category</p>
          )}
        </div>
      </div>
    );

  const wrapperClass = isInline
    ? "w-full min-w-0 relative"
    : "w-full border-t border-gray-100 bg-white relative";

  return (
    <div className={wrapperClass} ref={dropdownRef}>
      <div className={isInline ? "" : "max-w-screen-2xl mx-auto px-4 sm:px-8"}>
        <nav className="flex items-center justify-center gap-1 md:gap-3 lg:gap-6 py-1 overflow-x-auto no-scrollbar">
          {categories.map((category) => {
            const id = getId(category);
            const isActive = activeCategoryId === id;
            const showChevron = category?.children?.length > 0;

            return (
              <div
                key={id}
                className="relative shrink-0"
                onMouseEnter={(e) => {
                  if (window.innerWidth >= 1024) {
                    openMenu(category, e.currentTarget);
                  }
                }}
                onMouseLeave={() => {
                  if (window.innerWidth >= 1024) scheduleClose();
                }}
              >
                <button
                  type="button"
                  data-category-id={id}
                  onClick={(e) => {
                    if (window.innerWidth < 1024) {
                      if (isActive) setActiveCategoryId(null);
                      else openMenu(category, e.currentTarget);
                      return;
                    }
                    if (showChevron) {
                      if (isActive) setActiveCategoryId(null);
                      else openMenu(category, e.currentTarget);
                    } else {
                      window.location.href = `/search?category=${category.slug || createSlug(getName(category))}&_id=${category._id}`;
                    }
                  }}
                  className={`flex items-center gap-1.5 font-semibold whitespace-nowrap rounded-lg transition-colors
                    ${isInline ? "px-2.5 py-2 text-sm" : "px-4 py-2.5 text-sm"}
                    ${isActive ? "text-gray-900 bg-gray-100" : "text-gray-800 hover:text-gray-900 hover:bg-gray-100"}`}
                >
                  {getName(category)}
                  <IoChevronDown
                    className={`text-xs transition-transform ${isActive ? "rotate-180 text-gray-900" : "text-gray-600"}`}
                  />
                </button>
              </div>
            );
          })}
        </nav>
      </div>

      {mounted && dropdownMenu && createPortal(dropdownMenu, document.body)}

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
