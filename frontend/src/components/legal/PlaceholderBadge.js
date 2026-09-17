import React from "react";

const PlaceholderBadge = ({ label }) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold bg-amber-100 text-amber-900 border border-amber-200 mx-1 align-baseline select-all">
    {label}
  </span>
);

export default PlaceholderBadge;
