import React from "react";

const filters = [
  { name: "None", value: "none" },
  { name: "Grayscale", value: "grayscale(100%)" },
  { name: "Sepia", value: "sepia(100%)" },
  { name: "Invert", value: "invert(100%)" },
  { name: "Blur (5px)", value: "blur(5px)" } 
];

const FilterSelector = ({ setFilter, currentFilter }) => (
  <div className="p-4 bg-white rounded-xl shadow-md border border-gray-100">
    <h4 className="text-lg font-bold mb-4 text-gray-800 border-b pb-2">🖼️ Image Filters</h4>
    
    <div className="flex flex-col gap-3">
      {filters.map((f, i) => {
        const isActive = currentFilter === f.value;

        const baseClasses = "w-full text-left px-4 py-2 text-sm rounded-lg transition duration-150 ease-in-out hover:shadow-lg focus:outline-none";

        const activeClasses = isActive
          ? "bg-indigo-600 text-white font-bold border-2 border-indigo-700 shadow-indigo-500/50"
          : "bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200";

        return (
          <button
            key={i}
            onClick={() => setFilter(f.value)}
            className={`${baseClasses} ${activeClasses}`}
            style={{ filter: f.value !== 'none' ? f.value : 'none' }}
          >
            {f.name}
          </button>
        );
      })}
    </div>
  </div>
);

export default FilterSelector;