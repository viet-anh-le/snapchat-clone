import React from "react";

const StickerSelector = ({ addSticker }) => {
  const stickers = [
    // Note: It's best practice to use local or optimized assets for production, 
    // but we'll keep the provided URLs for this example.
    "https://i.ibb.co/2s0XK1v/glasses.png",
    "https://i.ibb.co/3yXkqfK/crown.png",
    "https://i.ibb.co/JrCzq1H/mustache.png"
  ];

  // Base dimensions and initial position for a new sticker
  const defaultStickerProps = { 
    x: 200, 
    y: 100, 
    width: 100, 
    height: 100 
  };

  return (
    <div className="p-4 bg-white rounded-xl shadow-lg border border-gray-100">
      <h4 className="text-lg font-bold mb-4 text-gray-800 border-b pb-2">✨ Add Stickers</h4>
      
      {/* Container for the stickers - uses a grid for a neat layout */}
      <div className="grid grid-cols-3 gap-4 justify-items-center">
        {stickers.map((src, i) => (
          <div 
            key={i}
            // Tailwind classes for styling the wrapper/button-like behavior
            className="w-16 h-16 p-2 flex items-center justify-center cursor-pointer 
                       rounded-lg border-2 border-transparent bg-gray-50 
                       transition duration-200 ease-in-out 
                       hover:border-blue-500 hover:shadow-md hover:scale-105"
            onClick={() => addSticker({ src, ...defaultStickerProps })}
          >
            <img
              src={src}
              alt={`Sticker ${i + 1}`}
              // Use Tailwind utility classes for size
              className="w-12 h-12 object-contain"
              // The image element itself is now free of inline styles
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default StickerSelector;