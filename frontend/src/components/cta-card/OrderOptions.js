import React, { useState } from "react";
import { FaPhoneVolume, FaFilePrescription, FaWhatsapp } from "react-icons/fa";
import PrescriptionUploadModal from "@components/prescription/PrescriptionUploadModal";
import useGetSetting from "@hooks/useGetSetting";
import useUtilsFunction from "@hooks/useUtilsFunction";
import { getPalette } from "@utils/themeColors";

const OrderOptions = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const { storeCustomizationSetting, globalSetting } = useGetSetting();
  const { showingTranslateValue } = useUtilsFunction();

  // Get theme colors
  const storeColor = storeCustomizationSetting?.theme?.color || "green";
  const palette = getPalette(storeColor);

  // Get contact number from settings with fallbacks
  const contactNumber = 
    (typeof storeCustomizationSetting?.navbar?.phone === "string" ? storeCustomizationSetting.navbar.phone : showingTranslateValue(storeCustomizationSetting?.navbar?.phone)) || 
    showingTranslateValue(storeCustomizationSetting?.contact_us?.call_box_phone) ||
    (typeof globalSetting?.contact === "string" ? globalSetting.contact : showingTranslateValue(globalSetting?.contact)) ||
    "09240250346"; // Fallback to default

  return (
    <>
      <div className="w-full max-w-5xl mx-auto mt-6 px-4">
        <div className="flex items-center justify-center mb-6">
          <div className="h-px bg-gray-300 w-16 md:w-24"></div>
          <span className="px-4 text-gray-500 text-xs md:text-sm font-semibold tracking-wider uppercase">
            PLACE YOUR ORDER VIA
          </span>
          <div className="h-px bg-gray-300 w-16 md:w-24"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          {/* Phone Card */}
          <a
            href={`tel:${contactNumber.replace(/\s+/g, '')}`}
            aria-label="Call to place order"
            className="flex items-center p-3 md:p-4 rounded-xl transition-all cursor-pointer group border overflow-hidden relative shadow-sm bg-white border-green-200"
          >
            <div className="absolute inset-0 bg-green-50 opacity-100"></div>
            <div className="relative mr-4">
              <div className="relative bg-gradient-to-br from-green-500 to-emerald-600 p-3.5 rounded-full shadow-lg transition-all duration-300">
                <FaPhoneVolume className="text-white text-xl" />
              </div>
            </div>
            <div className="relative flex flex-col">
              <span className="text-xs text-green-700 font-semibold tracking-wide uppercase mb-0.5">Order via Call</span>
              <span className="text-gray-900 font-bold text-lg leading-tight group-hover:text-green-700 transition-colors">
                {contactNumber}
              </span>
            </div>
          </a>

          {/* WhatsApp Card */}
          {contactNumber && (
            <a
              href={`https://wa.me/${contactNumber.replace(/\D/g, "")}?text=${encodeURIComponent("Hello, I want to buy Medicine.")}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Contact via WhatsApp"
              className="flex items-center p-3 md:p-4 rounded-xl transition-all cursor-pointer group border overflow-hidden relative shadow-sm bg-white border-emerald-200"
            >
              <div className="absolute inset-0 bg-emerald-50 opacity-100"></div>
              <div className="relative mr-4">
                <div className="relative bg-gradient-to-br from-emerald-500 to-green-600 p-3.5 rounded-full shadow-lg transition-all duration-300 hover:scale-105">
                  <FaWhatsapp className="text-white text-xl" />
                </div>
              </div>
              <div className="relative flex flex-col">
                <span className="text-xs text-emerald-700 font-semibold tracking-wide uppercase mb-0.5">Order via WhatsApp</span>
                <span className="text-gray-900 font-bold text-lg leading-tight group-hover:text-emerald-700 transition-colors">
                  WhatsApp
                </span>
              </div>
            </a>
          )}

          {/* Prescription Upload */}
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center p-3 md:p-4 rounded-xl transition-all cursor-pointer group w-full text-left border overflow-hidden relative shadow-sm bg-white border-blue-200"
          >
            <div className="absolute inset-0 bg-blue-50 opacity-100"></div>

            <div className="relative mr-4">
               <div className="relative bg-gradient-to-br from-blue-500 to-cyan-600 p-3.5 rounded-full shadow-lg transition-all duration-300">
                  <FaFilePrescription className="text-white text-xl" />
               </div>
            </div>
            <div className="relative flex flex-col">
               <span className="text-xs text-blue-700 font-semibold tracking-wide uppercase mb-0.5">Quick Upload</span>
               <span className="text-gray-900 font-bold text-lg leading-tight group-hover:text-blue-700 transition-colors">
                 Upload Prescription
               </span>
            </div>
          </button>
        </div>
      </div>

      <PrescriptionUploadModal
        modalOpen={modalOpen}
        setModalOpen={setModalOpen}
      />
    </>
  );
};

export default OrderOptions;
