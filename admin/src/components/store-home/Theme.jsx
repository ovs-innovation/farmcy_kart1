import React, { useEffect, useMemo, useState } from "react";
import { FiSettings, FiPlus } from "react-icons/fi";
import { Button } from "@windmill/react-ui";
import spinnerLoadingImage from "@/assets/img/spinner.gif";

// Extended color palette for the "gradient box"
const extendedColors = [
  "#F87171", "#EF4444", "#DC2626", "#B91C1C", "#991B1B",
  "#FB923C", "#F97316", "#EA580C", "#C2410C", "#9A3412",
  "#FBBF24", "#F59E0B", "#D97706", "#B45309", "#92400E",
  "#FACC15", "#EAB308", "#CA8A04", "#A16207", "#854D0E",
  "#A3E635", "#84CC16", "#65A30D", "#4D7C0F", "#3F6212",
  "#4ADE80", "#22C55E", "#16A34A", "#15803D", "#166534",
  "#34D399", "#10B981", "#059669", "#047857", "#065F46",
  "#2DD4BF", "#14B8A6", "#0D9488", "#0F766E", "#134E4A",
  "#22D3EE", "#06B6D4", "#0891B2", "#0E7490", "#155E75",
  "#38BDF8", "#0EA5E9", "#0284C7", "#0369A1", "#075985",
  "#60A5FA", "#3B82F6", "#2563EB", "#1D4ED8", "#1E40AF",
  "#818CF8", "#6366F1", "#4F46E5", "#4338CA", "#3730A3",
  "#A78BFA", "#8B5CF6", "#7C3AED", "#6D28D9", "#5B21B6",
  "#C084FC", "#A855F7", "#9333EA", "#7E22CE", "#6B21A8",
  "#E879F9", "#D946EF", "#C026D3", "#A21CAF", "#86198F",
  "#F472B6", "#EC4899", "#DB2777", "#BE185D", "#9D174D",
  "#FB7185", "#F43F5E", "#E11D48", "#BE123C", "#9F1239",
];

const gradients = [
  "linear-gradient(to right, #ff7e5f, #feb47b)",
  "linear-gradient(to right, #6a11cb, #2575fc)",
  "linear-gradient(to right, #ff9a9e, #fecfef)",
  "linear-gradient(to right, #00c6ff, #0072ff)",
  "linear-gradient(to right, #f83600, #f9d423)",
  "linear-gradient(to right, #4facfe, #00f2fe)",
  "linear-gradient(to right, #43e97b, #38f9d7)",
  "linear-gradient(to right, #fa709a, #fee140)",
  "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
];

// Tailwind base color swatches (no shade)
const swatches = [
  { token: "slate", hex: "#64748B" },
  { token: "gray", hex: "#6B7280" },
  { token: "zinc", hex: "#71717A" },
  { token: "neutral", hex: "#737373" },
  { token: "stone", hex: "#78716C" },
  { token: "blue", hex: "#3B82F6" },
  { token: "teal", hex: "#14B8A6" },
  { token: "indigo", hex: "#6366F1" },
  { token: "violet", hex: "#8B5CF6" },
  { token: "sky", hex: "#0EA5E9" },
  { token: "green", hex: "#22C55E" },
  { token: "emerald", hex: "#10B981" },
  { token: "cyan", hex: "#06B6D4" },
  { token: "purple", hex: "#A855F7" },
  { token: "orange", hex: "#F97316" },
  { token: "amber", hex: "#F59E0B" },
  { token: "red", hex: "#EF4444" },
  { token: "rose", hex: "#F43F5E" },
  { token: "store", hex: "#16A34A" },
  { token: "fuchsia", hex: "#D946EF" },
  { token: "lime", hex: "#84CC16" },
  { token: "yellow", hex: "#EAB308" },
];

const Theme = ({ register, isSubmitting, defaultColor, setValue }) => {
  const initialToken = useMemo(() => (defaultColor ? defaultColor : "green"), [defaultColor]);
  const [selected, setSelected] = useState(initialToken);
  const [customColor, setCustomColor] = useState(initialToken.startsWith("#") ? initialToken : "#16A34A");
  const [showGradientBox, setShowGradientBox] = useState(false);

  useEffect(() => {
    setSelected(initialToken);
    if (initialToken.startsWith("#")) {
      setCustomColor(initialToken);
    }
  }, [initialToken]);

  useEffect(() => {
    if (setValue) setValue("theme_color", selected);
  }, [selected, setValue]);

  useEffect(() => {
    register("theme_color");
  }, [register]);

  const handleCustomColorChange = (e) => {
    const color = e.target.value;
    setCustomColor(color);
    setSelected(color);
  };

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="sticky top-0 z-20 flex justify-end">
        {isSubmitting ? (
          <Button disabled={true} type="button" className="h-10 px-6">
            <img src={spinnerLoadingImage} alt="Loading" width={20} height={10} />
            <span className="font-serif ml-2 font-light">Processing</span>
          </Button>
        ) : (
          <Button type="submit" className="h-10 px-6">Update</Button>
        )}
      </div>
      <div className="inline-flex md:text-lg text-base text-gray-800 font-semibold dark:text-gray-400 mb-3">
        <FiSettings className="mt-1 mr-2" />
        Theme Settings
      </div>
      <hr className="md:mb-6 mb-3" />
      <div>
        <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Pick Your Favorite Color
        </label>
        <div className="grid grid-cols-6 sm:grid-cols-8 gap-4 mb-6">
          {swatches.map(({ token, hex }) => {
            const isActive = selected === token;
            return (
              <button
                key={token}
                type="button"
                onClick={() => setSelected(token)}
                disabled={isSubmitting}
                className={`h-10 w-10 rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-300`}
                style={{
                  backgroundColor: hex,
                  border: isActive ? `1px solid transparent` : `1px solid rgba(156,163,175,0.6)`,
                  boxShadow: isActive
                    ? `0 0 0 2px rgba(255,255,255,0.95), 0 0 0 5px ${hex}`
                    : undefined,
                }}
                aria-label={token}
                title={token}
              />
            );
          })}

          {/* Gradient Button as requested */}
          <button
            type="button"
            onClick={() => setShowGradientBox(!showGradientBox)}
            className={`h-10 w-10 rounded-full flex items-center justify-center relative p-[2px] transition-all hover:scale-110 focus:outline-none ${showGradientBox ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
            style={{
              background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
            }}
            title="More Colors"
          >
            <div className="bg-white dark:bg-gray-800 w-full h-full rounded-full flex items-center justify-center">
              <FiPlus className="text-gray-600 dark:text-gray-300" />
            </div>
          </button>
        </div>

        {/* Gradient Box (Extended Palette) */}
        {showGradientBox && (
          <div className="mt-4 mb-6 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 animate-in fade-in slide-in-from-top-2 duration-200">
            <label className="block mb-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Choose from Extended Palette
            </label>
            <div className="grid grid-cols-8 sm:grid-cols-10 gap-2">
              {extendedColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    setSelected(color);
                    setCustomColor(color);
                  }}
                  className={`h-6 w-6 rounded-md transition-transform hover:scale-125 focus:outline-none ${selected === color ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : ''}`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>

            {/* <label className="block mt-4 mb-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Choose a Gradient
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {gradients.map((grad, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSelected(grad);
                  }}
                  className={`h-8 rounded-lg transition-all hover:scale-105 focus:outline-none ${selected === grad ? 'ring-2 ring-offset-2 ring-gray-400 scale-105' : ''}`}
                  style={{ background: grad }}
                  title={`Gradient ${idx + 1}`}
                />
              ))}
            </div> */}
          </div>
        )}

        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <label className="block mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
            Or Choose a Custom Solid Color
          </label>
          <div className="flex items-center gap-4">
            <div className="relative h-12 w-12 rounded-lg overflow-hidden border-2 border-white shadow-sm">
              <input
                type="color"
                value={customColor}
                onChange={handleCustomColorChange}
                className="absolute inset-0 h-full w-full cursor-pointer border-none p-0 bg-transparent"
                style={{ transform: 'scale(1.5)' }}
              />
            </div>
            <div className="flex-1">
              <input
                type="text"
                value={customColor}
                onChange={handleCustomColorChange}
                className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-store-500 focus:border-store-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white uppercase"
                placeholder="#000000"
              />
            </div>
            {selected.startsWith("#") && (
              <div className="h-4 w-4 rounded-full bg-green-500" title="Custom color active" />
            )}
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-4 dark:text-gray-400">
          Saved as: <span className="font-mono font-bold text-gray-800 dark:text-gray-200">{selected}</span>
        </p>
        <input type="hidden" {...register("theme_color")} value={selected} readOnly />
      </div>
    </div>
  );
};

export default Theme;


