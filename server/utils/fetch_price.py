import yfinance as yf
import sys
import json

def get_price(symbol):
    try:
        stock = yf.Ticker(symbol)
        # Get last 1 day of history at 1 minute interval to get the most recent price
        df = stock.history(period="1d", interval="1m")
        if not df.empty:
            last_price = df['Close'].iloc[-1]
            return {"price": float(last_price)}
        else:
            # Fallback to daily if 1m is empty
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
        result = get_price(symbol)
        print(json.dumps(result))
    else:
        print(json.dumps({"error": "No symbol provided"}))
