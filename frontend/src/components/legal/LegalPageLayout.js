import React, { useState, useEffect } from "react";
import Head from "next/head";
import { FiShield, FiLock, FiClock, FiGlobe, FiAlertCircle } from "react-icons/fi";
import Layout from "@layout/Layout";
import TableOfContents from "./TableOfContents";

const LegalPageLayout = ({
  pageTitle,
  pageDescription,
  lastUpdated,
  appliesTo,
  summaryItems = [],
  sections = [],
  noIndex = false,
  children,
}) => {
  const [activeSection, setActiveSection] = useState(sections[0]?.id || "");

  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: "-20% 0px -60% 0px",
      threshold: 0,
    };

    const handleIntersect = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersect, observerOptions);

    sections.forEach((sec) => {
      const el = document.getElementById(sec.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections]);

  const scrollToSection = (e, id) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      element.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
      });
      window.history.pushState(null, "", `#${id}`);
    }
  };

  return (
    <Layout title={pageTitle} description={pageDescription}>
      <Head>
        {noIndex ? (
          <meta name="robots" content="noindex, follow" />
        ) : (
          <meta name="robots" content="index, follow" />
        )}
      </Head>

      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            .no-print { display: none !important; }
            .print-full-width { width: 100% !important; max-width: 100% !important; }
            body { background: white !important; color: black !important; }
          }
        `
      }} />

      {/* Header Banner */}
      <div className="bg-white border-b border-gray-200 py-10 lg:py-14">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-store-600 font-bold text-xs uppercase tracking-wider mb-2">
                <FiShield className="w-4 h-4" />
                <span>Legal & Compliance</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight font-serif">
                {pageTitle}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                <span className="inline-flex items-center gap-1.5 bg-gray-100 px-3 py-1 rounded-full text-xs font-medium text-gray-700">
                  <FiClock className="w-3.5 h-3.5 text-gray-500" />
                  Last updated: {lastUpdated}
                </span>
                <span className="inline-flex items-center gap-1.5 bg-gray-100 px-3 py-1 rounded-full text-xs font-medium text-gray-700">
                  <FiGlobe className="w-3.5 h-3.5 text-gray-500" />
                  Applies to: {appliesTo}
                </span>
              </div>
            </div>
            <div className="hidden lg:flex items-center gap-3 p-4 bg-store-50 rounded-2xl border border-store-100">
              <div className="w-12 h-12 bg-store-500 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-sm">
                <FiLock className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">Official Document</h4>
                <p className="text-xs text-gray-500">Governed under the laws of India</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-gray-50/50 min-h-screen py-8 lg:py-12">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-10">
          {/* Quick Summary Callout */}
          {summaryItems.length > 0 && (
            <div className="mb-8 bg-blue-50/80 border border-blue-200 rounded-2xl p-5 sm:p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-500 text-white rounded-xl flex-shrink-0 mt-0.5">
                  <FiAlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 mb-2">
                    Quick Summary
                  </h3>
                  <ul className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs sm:text-sm text-gray-700">
                    {summaryItems.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0 mt-2" />
                        <span><strong>{item.title}:</strong> {item.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
            <TableOfContents
              sections={sections}
              activeSection={activeSection}
              scrollToSection={scrollToSection}
              ariaLabel={`${pageTitle} Table of Contents`}
            />

            <main className="flex-1 w-full print-full-width min-w-0">
              <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-10 lg:p-12 shadow-sm space-y-10">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default LegalPageLayout;
