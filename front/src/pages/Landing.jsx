import { useNavigate } from 'react-router-dom';
import { Sprout, ArrowRight, Landmark, Database, Brain, Target } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext.jsx';

export default function Landing() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const featureCards = [
    { icon: Database, title: t('landingUnderstandsTitle'), desc: t('landingUnderstandsDesc') },
    { icon: Brain, title: t('landingAnalyzesTitle'), desc: t('landingAnalyzesDesc') },
    { icon: Target, title: t('landingRecommendsTitle'), desc: t('landingRecommendsDesc') },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-agri-50 via-white to-white">
      <header className="max-w-7xl mx-auto px-6 py-6 flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-agri-600 flex items-center justify-center">
          <Sprout size={20} className="text-white" />
        </div>
        <span className="font-extrabold text-lg text-slate-800">{t('appName')}</span>
      </header>

      <section className="max-w-4xl mx-auto px-6 text-center pt-10 pb-16">
        <span className="badge bg-intel-50 text-intel-700 mb-4">{t('landingBadge')}</span>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
          {t('landingHeadline')}
        </h1>
        <p className="text-slate-600 mt-5 text-lg max-w-2xl mx-auto">
          {t('landingSubtext')}
        </p>
        <button onClick={() => navigate('/demo/dashboard')} className="btn-primary mt-8 text-base px-6 py-3">
          {t('landingEnterDemo')} <ArrowRight size={18} />
        </button>
        <p className="text-xs text-slate-400 mt-3">{t('landingPreconfigured')}</p>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-16 grid sm:grid-cols-3 gap-4">
        {featureCards.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="card text-left">
            <div className="w-10 h-10 rounded-xl bg-agri-50 flex items-center justify-center mb-3">
              <Icon size={20} className="text-agri-700" />
            </div>
            <h3 className="font-bold text-slate-800">{title}</h3>
            <p className="text-sm text-slate-500 mt-1">{desc}</p>
          </div>
        ))}
      </section>

      <section className="max-w-3xl mx-auto px-6 pb-20 text-center">
        <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
          <Landmark size={16} /> {t('landingComplements')}
        </div>
      </section>
    </div>
  );
}