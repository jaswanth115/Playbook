import React from 'react';

const CandleLoader = () => {
  return (
    <div className="flex items-center justify-center gap-2 h-40 w-full animate-pulse opacity-50">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-1 h-32 justify-center">
          <div className="w-[2px] bg-secondary opacity-30 h-full relative">
            <div 
              className={`absolute left-1/2 -translate-x-1/2 w-4 rounded-sm transition-all duration-500 candle-anim-${(i % 3) + 1} ${i % 2 === 0 ? 'bg-green-500/40' : 'bg-red-500/40'}`} 
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default CandleLoader;
