import React, { useState, useRef } from "react";
import { useRouter } from "next/router";
import { IoSearchOutline } from "react-icons/io5";
import { motion } from "framer-motion";
import useTranslation from "next-translate/useTranslation";
import LocationPickerDropdown from "@components/location/LocationPickerDropdown";
import SearchSuggestions from "@components/search/SearchSuggestions";
import PrescriptionUploadModal from "@components/prescription/PrescriptionUploadModal";
import useGetSetting from "@hooks/useGetSetting";
import useUtilsFunction from "@hooks/useUtilsFunction";
import {
  FaHeartbeat,
  FaCapsules,
  FaShoppingCart,
  FaFileUpload,
  FaLeaf,
  FaPrescriptionBottleAlt,
  FaFileMedical,
} from "react-icons/fa";

const HeroBanner = () => {
  const [searchText, setSearchText] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [prescriptionModalOpen, setPrescriptionModalOpen] = useState(false);
  const router = useRouter();
  const { t } = useTranslation("common");
  const searchInputRef = useRef(null);
  const { storeCustomizationSetting } = useGetSetting();
  const { showingTranslateValue } = useUtilsFunction();

  const handleSearchChange = (value) => {
    setSearchText(value);
    setShowSuggestions(value.trim().length > 0);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const trimmedSearchText = searchText.trim();
    
    setShowSuggestions(false);
    searchInputRef.current?.blur();
    
    if (trimmedSearchText) {
      router.push(
        {
          pathname: "/search",
          query: { query: trimmedSearchText },
        },
        `/search?query=${encodeURIComponent(trimmedSearchText)}`,
        { shallow: false }
      ).then(() => {
        setSearchText("");
      }).catch((err) => {
        console.error("Navigation error:", err);
        window.location.href = `/search?query=${encodeURIComponent(trimmedSearchText)}`;
      });
    }
  };

   

  // Animation variants for left side (top to bottom)
  const leftAnimationVariants = {
    initial: { y: -100, opacity: 0 },
    animate: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 1,
        ease: "easeOut",
      },
    },
    float: {
      y: [0, -20, 0],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  // Animation variants for right side (bottom to top)
  const rightAnimationVariants = {
    initial: { y: 100, opacity: 0 },
    animate: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 1,
        ease: "easeOut",
      },
    },
    float: {
      y: [0, 20, 0],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  // Content animation
  const contentVariants = {
    initial: { opacity: 0, y: 20 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        delay: 0.3,
        ease: "easeOut",
      },
    },
  };

  return (
    <div className="w-full relative bg-white" style={{ minHeight: '300px', height: 'auto' }}>
      {/* Bubble/Water Animation Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-blue-50/80 via-emerald-50/50 to-white"
        />
        {[...Array(15)].map((_, i) => {
          const size = (i % 5) * 8 + 15; // Increased size range 15px - 47px
          const left = (i * 15) % 95; 
          const duration = (i % 3) * 2 + 5; // Faster duration 5-9s
          const delay = i * 0.5; // Reduced delay
          
          return (
            <motion.div
              key={i}
              className="absolute rounded-full bg-blue-400/20 border border-blue-400/30 shadow-sm backdrop-blur-[2px]"
              style={{
                width: size,
                height: size,
                left: `${left}%`,
                top: -60,
              }}
              animate={{
                y: ["0vh", "100vh"],
                x: [0, (i % 2 === 0 ? 50 : -50)],
                rotate: [0, 360],
              }}
              transition={{
                duration: duration,
                repeat: Infinity,
                delay: delay,
                ease: "linear",
              }}
            />
          );
        })}
      </div>
      
      {/* Background Pattern Overlay */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, #064e3b 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      {/* Animated Visual Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Left Side Natural/Cream Images - Top to Bottom */}
        <div className="absolute hidden left-0 top-0 w-full md:w-1/5 h-full md:flex flex-col items-center justify-center pt-8 px-4 gap-8">
          {/* Cream Jar */}
          <motion.div
            variants={leftAnimationVariants}
            initial="initial"
            animate={["animate", "float"]}
            className="relative opacity-40"
          >
            <div className="bg-white rounded-full shadow-xl p-3 transform -rotate-12">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-50 to-emerald-100 border-4 border-white shadow-inner flex items-center justify-center relative overflow-hidden">
                 <div className="absolute inset-0 bg-white/40 rounded-full transform scale-50 translate-x-4 -translate-y-4 blur-md"></div>
                 <div className="text-emerald-800/40 text-xs font-bold tracking-widest uppercase">Natural</div>
              </div>
            </div>
          </motion.div>

          {/* Herbal Tube */}
          <motion.div
            variants={leftAnimationVariants}
            initial="initial"
            animate={["animate", "float"]}
            transition={{ delay: 0.2 }}
            className="relative opacity-40"
          >
            <div className="bg-white rounded-xl shadow-xl p-2 transform rotate-6">
              <div className="w-16 h-32 bg-gradient-to-b from-teal-50 to-teal-100 rounded-b-2xl rounded-t-lg border border-teal-100 relative shadow-sm flex flex-col items-center">
                <div className="w-full h-8 bg-teal-600/20 rounded-t-lg mb-4"></div>
                <FaLeaf className="text-teal-600/30 text-3xl" />
                <div className="mt-auto mb-4 w-8 h-1 bg-teal-600/20 rounded"></div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Side Natural/Cream Images - Bottom to Top */}
        <div className="absolute right-0 bottom-0 w-full md:w-1/5 h-full hidden md:flex flex-col items-center justify-center pb-8 px-4 gap-8">
          {/* Himalaya Style Face Wash */}
          <motion.div
            variants={rightAnimationVariants}
            initial="initial"
            animate={["animate", "float"]}
            className="relative opacity-40"
          >
            <div className="bg-white rounded-2xl shadow-xl p-2 transform rotate-3">
              <div className="w-14 h-36 bg-gradient-to-t from-lime-50 to-green-100 rounded-b-lg relative border-b-4 border-green-600/30 flex flex-col items-center justify-center">
                 <div className="w-10 h-10 rounded-full border-2 border-green-600/20 flex items-center justify-center mb-2 bg-white/30 backdrop-blur-sm">
                    <FaLeaf className="text-green-600/40 text-sm" />
                 </div>
                 <div className="w-8 h-1 bg-green-600/20 rounded-full"></div>
              </div>
            </div>
          </motion.div>

          {/* Natural Soap/Core Product */}
          <motion.div
            variants={rightAnimationVariants}
            initial="initial"
            animate={["animate", "float"]}
            transition={{ delay: 0.2 }}
            className="relative opacity-40"
          >
             <div className="bg-white rounded-lg shadow-xl p-3 transform -rotate-6">
              <div className="w-24 h-16 bg-gradient-to-br from-amber-50 to-yellow-100 rounded-lg shadow-sm flex items-center justify-center border border-amber-100">
                 <div className="text-amber-800/30 font-serif italic text-lg">Pure</div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Floating Natural Elements */}
        <motion.div
          className="absolute top-1/4 left-1/4 md:left-1/3"
          animate={{
            y: [0, -15, 0],
            rotate: [0, 10, 0],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <div className="bg-green-100/50 backdrop-blur-sm rounded-full p-3 shadow-lg">
            <FaLeaf className="text-green-600 text-xl opacity-60" />
          </div>
        </motion.div>
        <motion.div
          className="absolute bottom-1/4 right-1/4 md:right-1/3"
          animate={{
            y: [0, 15, 0],
            rotate: [0, -10, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        >
          <div className="bg-teal-100/50 backdrop-blur-sm rounded-full p-3 shadow-lg">
            <FaLeaf className="text-teal-600 text-xl opacity-60 transform rotate-90" />
          </div>
        </motion.div>
      </div>
          
      {/* Content Section */}
      <div className="hero-padding relative z-10 w-full flex flex-col items-center justify-center px-4  md:py-10 min-h-[300px]">
        {/* Hero Text Section */}
        <motion.div
          variants={contentVariants}
          initial="initial"
          animate="animate"
          className="relative z-10 text-center w-full max-w-6xl mx-auto mb-6 md:mb-8 px-2"
        >
          <h1 className="text-2xl md:text-5xl   font-bold mb-4 md:mb-6 leading-tight text-emerald-950 drop-shadow-sm">
            {showingTranslateValue(storeCustomizationSetting?.home?.hero_title) || "Affordable Medicines, Delivered to Your Doorstep"}
          </h1>
          <p className="text-base md:text-lg lg:text-xl text-emerald-800 drop-shadow-sm mb-6 md:mb-8" style={{ fontFamily: 'Poppins, Arial, sans-serif' }}>
            {showingTranslateValue(storeCustomizationSetting?.home?.hero_description) || "Trusted pharmacy • Genuine medicines • Fast delivery"}
          </p>
          {/* Search Box Section */}
        <motion.div
          variants={contentVariants}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.5 }}
          className="relative z-50 w-full flex flex-col items-center  "
        >
          <div id="hero-search-anchor" className="w-full max-w-4xl scroll-mt-32">
            <form onSubmit={handleSubmit} className="w-full relative flex items-center bg-white rounded-full shadow-lg border border-gray-200 transition-all duration-300 z-30 p-1.5">
              <div className="relative z-50 shrink-0 mr-1 md:mr-2">
                <LocationPickerDropdown hideDivider className="!px-2 md:!px-4 !border-none" />
              </div>
              
              {/* Search Input */}
              <div className="flex-1 relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-500">
                   <IoSearchOutline className="text-xl" />
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search for medicine"
                  className="w-full py-2 pl-10 pr-4 focus:outline-none focus:ring-0 text-gray-700 font-medium border-0 focus:border-0 placeholder-gray-400 bg-transparent"
                  value={searchText}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => {
                    if (searchText.trim().length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  onBlur={(e) => {
                    const relatedTarget = e.relatedTarget;
                    const suggestionsContainer = document.querySelector('.search-suggestions-container');
                    
                    if (!relatedTarget || (suggestionsContainer && !suggestionsContainer.contains(relatedTarget))) {
                      setTimeout(() => {
                        const activeElement = document.activeElement;
                        if (!suggestionsContainer || !suggestionsContainer.contains(activeElement)) {
                          setShowSuggestions(false);
                        }
                      }, 200);
                    }
                  }}
                />
                <SearchSuggestions
                  searchText={searchText}
                  showSuggestions={showSuggestions}
                  onSelect={() => {
                    setSearchText("");
                    setShowSuggestions(false);
                  }}
                  onClose={() => setShowSuggestions(false)}
                />
              </div>

               {/* Search Button removed as per request */}
            </form>
          </div>
        </motion.div>
          
        </motion.div>

        
      </div>
      
      <style jsx>{`
      /* Default (Laptop / Desktop) */
.hero-padding {
  padding-top: 1.5rem;
  padding-bottom: 1.5rem;
}

/* Mobile Screens */
@media (max-width: 768px) {
  .hero-padding {
    padding-top: 4.5rem;
    padding-bottom: 1.5rem; /* keep bottom same */
  }
}

        `}</style>
    </div>
  );
};

export default HeroBanner;
