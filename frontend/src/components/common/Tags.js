import React from 'react';

const Tags = ({ product }) => {
  const getTags = (tagData) => {
    if (!tagData) return [];
    if (Array.isArray(tagData)) return tagData;
    if (typeof tagData === 'string') {
      try {
        const parsed = JSON.parse(tagData);
        if (Array.isArray(parsed)) return parsed;
        return [parsed];
      } catch (err) {
        return tagData.split(',').map((t) => t.trim()).filter(Boolean);
      }
    }
    return [];
  };

  const tagsList = getTags(product?.tag);

  if (!tagsList || tagsList.length === 0) return null;

  return (
    <div className="flex flex-row items-center">
      <div>
        <span className="text-gray-800 font-semibold text-sm mr-2">Net Quantity : </span>
      </div>
      {tagsList.map((t, i) => (
        <span
          key={i + 1}
          className="bg-gray-50 mr-2 border text-gray-600 rounded-full inline-flex items-center justify-center px-3 py-1 text-xs font-semibold font-serif mt-2"
        >
          {t}
        </span>
      ))}
    </div>
  );
};

export default Tags;
