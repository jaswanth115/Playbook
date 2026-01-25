import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import api from '../api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const StockChart = ({ symbol, onClose }) => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data } = await api.get(`/trades/history/${symbol}`);
        const labels = data.map(d => new Date(d.date).toLocaleDateString());
        const prices = data.map(d => d.close);

        setChartData({
          labels,
          datasets: [
            {
              label: `${symbol} Price`,
              data: prices,
              borderColor: '#00f2fe',
              backgroundColor: 'rgba(0, 242, 254, 0.2)',
              fill: true,
              tension: 0.4,
            },
          ],
        });
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch stock history', err);
        setLoading(false);
      }
    };
    fetchHistory();
  }, [symbol]);

  if (loading) return <div className="text-white text-center p-10">Loading chart...</div>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-4xl p-6 rounded-2xl border border-white/10 relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-secondary hover:text-white"
        >
          ✕
        </button>
        <h3 className="text-xl font-bold mb-4 text-primary">{symbol} Live Graph</h3>
        {chartData ? (
          <Line data={chartData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
        ) : (
          <p className="text-red-400">Failed to load chart data.</p>
        )}
      </div>
    </div>
  );
};

export default StockChart;
