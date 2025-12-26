import React from "react";

const stickersList = [
  { src: "src/assets/glasses.png", name: "Glasses" },
  { src: "src/assets/crown.png", name: "Crown" },
  { src: "src/assets/mustache.png", name: "Mustache" }
];

// Assuming the Home component uses a function to update the list of active stickers
// For simplicity, this version just adds the selected sticker to the list.
const StickerSelector = ({ setStickers }) => {
  
  const handleAddSticker = (src) => {
    // Add the new sticker to the list. The x/y/width/height are handled by AIFilterCanvas landmark logic
    setStickers(prevStickers => {
        // Prevent adding the same sticker multiple times, if desired
        if (prevStickers.some(s => s.src === src)) return prevStickers;
        return [...prevStickers, { src }];
    });
  };
  
  // Note: A button to clear stickers might be useful, but is omitted for brevity.

  return (
    <div className="p-4 bg-white rounded-xl shadow-md border border-gray-100">
      <h4 className="text-lg font-bold mb-4 text-gray-800 border-b pb-2">✨ Add Stickers</h4>
      
      <div className="grid grid-cols-3 gap-4 justify-items-center">
        {stickersList.map((sticker, i) => (
          <div 
            key={i}
            className="w-16 h-16 p-2 flex flex-col items-center justify-center cursor-pointer 
                       rounded-lg border-2 border-transparent bg-gray-50 
                       transition duration-200 ease-in-out 
                       hover:border-blue-500 hover:shadow-lg hover:scale-105"
            onClick={() => handleAddSticker(sticker.src)}
          >
            <img
              src={sticker.src}
              alt={sticker.name}
              className="w-12 h-12 object-contain pointer-events-none"
            />
          </div>
        ))}
      </div>
      
      {/* Clear Button (Optional but useful) */}
      <button 
        onClick={() => setStickers([])} 
        className="mt-4 w-full py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
      >
        Clear Stickers
      </button>
    </div>
  );
};

export default StickerSelector;
