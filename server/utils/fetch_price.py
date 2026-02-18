import yfinance as yf
import sys
import json

def get_price(symbol, exchange='NASDAQ'):
    try:
        # Adjust symbol for NSE
        ticker_symbol = symbol
        if exchange == 'NSE':
            if not symbol.endswith('.NS'):
                ticker_symbol = f"{symbol}.NS"
            # NSE often requires 1d interval for reliable "latest" data during market hours via yfinance history
            # User requested: interval="1d" for today's data
            period = "1d"
            interval = "1d"
        else:
             # Standard behavior for US stocks
            period = "1d"
            interval = "1d"

        stock = yf.Ticker(ticker_symbol)
        df = stock.history(period=period, interval=interval)
        
        if not df.empty:
            last_price = df['Close'].iloc[-1]
            return {"price": float(last_price)}
        else:
             # Fallback
            df = stock.history(period="1d")
            if not df.empty:
                last_price = df['Close'].iloc[-1]
                return {"price": float(last_price)}
            return {"error": "No data found"}

    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) > 1:
        symbol = sys.argv[1]
        exchange = sys.argv[2] if len(sys.argv) > 2 else 'NASDAQ'
        result = get_price(symbol, exchange)
        print(json.dumps(result))
    else:
        print(json.dumps({"error": "No symbol provided"}))
