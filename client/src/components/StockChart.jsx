import React, { useEffect, useRef } from 'react';

const StockChart = ({ symbol, onClose }) => {
  const container = useRef();

  useEffect(() => {
    // Only load the script if it hasn't been loaded already
    const scriptId = 'tradingview-widget-script';
    let script = document.getElementById(scriptId);

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://s3.tradingview.com/tv.js';
      script.async = true;
      script.onload = () => createWidget();
      document.head.appendChild(script);
    } else {
      createWidget();
    }

    function createWidget() {
      if (window.TradingView && container.current) {
        new window.TradingView.widget({
          "autosize": true,
          "symbol": `NASDAQ:${symbol}`,
          "interval": "D",
          "timezone": "Etc/UTC",
          "theme": "dark",
          "style": "1",
          "locale": "en",
          "toolbar_bg": "#f1f3f6",
          "enable_publishing": false,
          "allow_symbol_change": true,
          "container_id": "tradingview_chart",
          "backgroundColor": "rgba(0, 0, 0, 1)",
          "gridColor": "rgba(255, 255, 255, 0.05)",
          "hide_side_toolbar": false,
        });
      }
    }
  }, [symbol]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-6xl h-[80vh] bg-[#0a0a0a] p-6 rounded-2xl relative border border-white/10 shadow-2xl">
        <button 
          onClick={onClose}
          className="absolute -top-12 right-0 text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all flex items-center gap-2 px-4"
        >
          ✕ Close Graph
        </button>
        
        <div id="tradingview_chart" ref={container} className="w-full h-full" />
      </div>
    </div>
  );
};

export default StockChart;
