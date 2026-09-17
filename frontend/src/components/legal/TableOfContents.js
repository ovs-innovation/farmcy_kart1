import React, { useState } from "react";
import { FiFileText, FiChevronDown } from "react-icons/fi";

const TableOfContents = ({ sections, activeSection, scrollToSection, ariaLabel = "Legal Document Table of Contents" }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const activeSectionTitle = sections.find((s) => s.id === activeSection)?.title || "Select Section";

  const handleMobileScroll = (e, id) => {
    setMobileMenuOpen(false);
    scrollToSection(e, id);
  };

  return (
    <>
      {/* Mobile TOC Dropdown (Sticky on Mobile) */}
      <div className="lg:hidden mb-6 no-print sticky top-16 z-30 bg-white border border-gray-200 rounded-xl shadow-sm p-3">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="w-full flex items-center justify-between px-3 py-2 text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-store-500 rounded-lg"
          aria-expanded={mobileMenuOpen}
          aria-label="Table of Contents Menu"
        >
          <span className="flex items-center gap-2 truncate">
            <FiFileText className="text-store-600 flex-shrink-0" />
            <span className="truncate">Jump to: {activeSectionTitle}</span>
          </span>
          <FiChevronDown
            className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform ${
              mobileMenuOpen ? "rotate-180" : ""
            }`}
          />
        </button>
        {mobileMenuOpen && (
          <nav aria-label={`Mobile ${ariaLabel}`} className="mt-2 pt-2 border-t border-gray-100 max-h-64 overflow-y-auto space-y-1">
            {sections.map((sec) => (
              <a
                key={sec.id}
                href={`#${sec.id}`}
                onClick={(e) => handleMobileScroll(e, sec.id)}
                aria-current={activeSection === sec.id ? "location" : undefined}
                className={`block px-3 py-2 rounded-lg text-xs font-medium transition-colors focus:ring-2 focus:ring-store-500 focus:outline-none ${
                  activeSection === sec.id
                    ? "bg-store-500 text-white font-bold"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {sec.title}
              </a>
            ))}
          </nav>
        )}
      </div>

      {/* Desktop TOC Sidebar */}
      <aside className="hidden lg:block w-72 flex-shrink-0 no-print sticky top-28">
        <nav
          aria-label={ariaLabel}
          className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-1 max-h-[calc(100vh-9rem)] overflow-y-auto"
        >
          <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-3 px-3">
            Table of Contents
          </h3>
          {sections.map((sec) => {
            const isActive = activeSection === sec.id;
            return (
              <a
                key={sec.id}
                href={`#${sec.id}`}
                onClick={(e) => scrollToSection(e, sec.id)}
                aria-current={isActive ? "location" : undefined}
                className={`group flex items-center px-3 py-2 text-xs font-semibold rounded-xl transition-all duration-200 focus:ring-2 focus:ring-store-500 focus:outline-none ${
                  isActive
                    ? "bg-store-500 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-50 hover:text-store-600"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full mr-2.5 flex-shrink-0 transition-colors ${
                    isActive ? "bg-white" : "bg-gray-300 group-hover:bg-store-500"
                  }`}
                />
                <span className="truncate">{sec.title}</span>
              </a>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

export default TableOfContents;
