import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const trendIcon = { up: TrendingUp, down: TrendingDown, stable: Minus };
const trendColor = { up: 'text-agri-600', down: 'text-red-500', stable: 'text-slate-400' };

export default function MarketTable({ markets }) {
  const { t } = useTranslation();
  if (!markets?.length) return <p className="text-slate-500 text-sm">{t('widget.noMarketDataAvailable')}</p>;
  const bestName = markets[0]?.name;

  return (
    // max-h + overflow-y-auto scrolls just this table when the market list
    // is long, instead of the whole page growing under it. The header row
    // is sticky so it stays visible while scrolling.
    <div className="overflow-x-auto overflow-y-auto max-h-96">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-white z-10">
          <tr className="text-left text-slate-500 border-b border-slate-200">
            <th className="py-2 pr-4 font-medium">{t('widget.tableMarket')}</th>
            <th className="py-2 pr-4 font-medium">{t('widget.tableDistance')}</th>
            <th className="py-2 pr-4 font-medium">{t('widget.tableModalPrice')}</th>
            <th className="py-2 pr-4 font-medium">{t('widget.tableTransport')}</th>
            <th className="py-2 pr-4 font-medium">{t('widget.tableNetRealisation')}</th>
            <th className="py-2 pr-4 font-medium">{t('widget.tableTrend')}</th>
          </tr>
        </thead>
        <tbody>
          {markets.map((m) => {
            const TrendIcon = trendIcon[m.trend] || Minus;
            const isBest = m.name === bestName;
            return (
              <tr key={m.name} className={`border-b border-slate-100 ${isBest ? 'bg-agri-50/60' : ''}`}>
                <td className="py-3 pr-4 font-medium text-slate-800">
                  {m.name} {isBest && <span className="badge bg-agri-100 text-agri-700 ml-1">{t('widget.tableBest')}</span>}
                </td>
                <td className="py-3 pr-4 text-slate-600">{m.distanceKm != null ? `${m.distanceKm} km` : '—'}</td>
                <td className="py-3 pr-4 text-slate-600">₹{m.modalPrice}/kg</td>
                <td className="py-3 pr-4 text-slate-600">₹{m.transportCostPerKg?.toFixed(2)}/kg</td>
                <td className="py-3 pr-4 font-bold text-agri-700">₹{m.netRealization}/kg</td>
                <td className={`py-3 pr-4 ${trendColor[m.trend]}`}><TrendIcon size={16} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}