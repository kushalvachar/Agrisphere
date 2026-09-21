export default function StatCard({ label, value, sub, icon: Icon, tone = 'agri' }) {
  const toneMap = {
    agri: 'bg-agri-50 text-agri-700',
    intel: 'bg-intel-50 text-intel-700',
    warn: 'bg-warn-50 text-warn-700',
  };
  return (
    <div className="card flex items-start justify-between">
      <div>
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        <p className="text-2xl font-extrabold text-slate-800 mt-1">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
      {Icon && (
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${toneMap[tone]}`}>
          <Icon size={20} />
        </div>
      )}
    </div>
  );
}
