const AdjustmentControls = ({ brightness, setBrightness, contrast, setContrast, blending, setBlending }) => (
  <div className="p-4 bg-white rounded-xl shadow-md border border-gray-100">
    <h4 className="text-lg font-bold mb-4 text-gray-800 border-b pb-2">⚙️ Adjustments</h4>

    <div className="space-y-4">
      <div className="flex flex-col">
        <label className="text-sm font-medium mb-1 text-gray-700">Brightness ({brightness}%)</label>
        <input 
          type="range" 
          min="0" max="200" step="1" 
          value={brightness} 
          onChange={(e) => setBrightness(parseInt(e.target.value))} 
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      <div className="flex flex-col">
        <label className="text-sm font-medium mb-1 text-gray-700">Contrast ({contrast}%)</label>
        <input 
          type="range" 
          min="0" max="200" step="1" 
          value={contrast} 
          onChange={(e) => setContrast(parseInt(e.target.value))} 
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>
      
      <div className="flex flex-col">
        <label className="text-sm font-medium mb-1 text-gray-700">Frame Blending ({(100 - blending * 100).toFixed(0)}% trail)</label>
        <input 
          type="range" 
          min="0.05" max="1" step="0.05" 
          value={blending} 
          onChange={(e) => setBlending(parseFloat(e.target.value))} 
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>
    </div>
  </div>
);
export default AdjustmentControls;