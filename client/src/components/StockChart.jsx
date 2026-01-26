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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 md:p-8">
      <div className="w-full h-full md:h-[85vh] max-w-7xl bg-[#0a0a0a] p-2 md:p-6 rounded-2xl relative border border-white/10 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-2 md:p-0 mb-2">
          <h3 className="text-sm md:text-xl font-bold text-primary">{symbol} Live Chart</h3>
          <button 
            onClick={onClose}
            className="text-white bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-all text-xs font-bold px-3"
          >
            ✕ Close
          </button>
        </div>
        
        <div id="tradingview_chart" ref={container} className="flex-1 w-full" />
      </div>
    </div>
  );
};

export default StockChart;
