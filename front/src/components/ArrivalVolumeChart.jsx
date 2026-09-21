// components/ArrivalVolumeChart.jsx — Phase 2: Market Reporting Activity.
//
// Renders the real, dynamically-collected "how many mandis reported a
// price today" metric (see backend/services/marketActivityService.js).
// This intentionally replaced an earlier arrival-TONNAGE chart that was
// backed by synthetic seed data — the live data.gov.in price resource
// this app uses does not publish arrival quantities, so showing a
// tonnage number here would have been fabricated data. Reporting-market
// count is real and grows purely from live collection.
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDynamicTranslation } from '../context/LanguageContext.jsx';

export default function ArrivalVolumeChart({ series, stats, message }) {
  const { t } = useTranslation();
  // `message` and `stats.metric` are backend-generated sentences that
  // vary per crop/data-state (not fixed UI chrome), so they go through
  // the dynamic-content translation path instead of the static t() dict.
  const [dynMessage, dynMetric] = useDynamicTranslation([
    message || null,
    stats?.metric || null,
  ]);

  if (!series?.length) {
    return <p className="text-slate-500 text-sm">{dynMessage || t('widget.noActivityDataYet')}</p>;
  }

  const chartData = series.map((s) => ({
    date: new Date(s.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    reportingMarkets: s.reportingMarkets,
  }));

  const changeUp = stats?.reportingChangePct >= 0;

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="bg-slate-50 rounded-xl p-3">
          <p className="text-xs text-slate-500">{t('widget.recentAvgMandisReporting')}</p>
          <p className="text-xl font-extrabold text-slate-800">{stats.recentAvgReportingMarkets}{t('widget.perDay')}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3">
          <p className="text-xs text-slate-500">{t('widget.changeVsPriorPeriod')}</p>
          <p className={`text-xl font-extrabold flex items-center gap-1 ${changeUp ? 'text-intel-600' : 'text-warn-600'}`}>
            {changeUp ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
            {stats.reportingChangePct}%
          </p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3">
          <p className="text-xs text-slate-500">{t('widget.realDaysCollectedLabel')}</p>
          <p className="text-xl font-extrabold text-slate-800">{stats.windowDays}</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={Math.max(0, Math.floor(chartData.length / 8))} />
          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="reportingMarkets" fill="#274bd1" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <div className="bg-intel-50/50 border border-intel-100 rounded-xl p-3 flex items-start gap-2">
        <Info size={14} className="text-intel-600 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-600">{dynMetric || stats.metric}</p>
      </div>
    </div>
  );
}