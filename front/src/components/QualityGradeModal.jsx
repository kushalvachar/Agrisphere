import { useRef, useState } from 'react';
import { X, Upload, Loader2, Camera } from 'lucide-react';
import { api } from '../api/client.js';

export default function QualityGradeModal({ open, onClose, cropHint }) {
  const fileRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const base64 = await toBase64(file);
      const res = await api.analyzeQuality({ imageBase64: base64, mimeType: file.type, cropHint });
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <X size={20} />
        </button>
        <h3 className="font-bold text-lg text-slate-800 mb-1">AI Crop Quality Estimate</h3>
        <p className="text-sm text-slate-500 mb-4">Upload a photo of the crop for a rough AI-assisted grade estimate.</p>

        {!result && (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-slate-300 rounded-xl py-8 flex flex-col items-center gap-2 text-slate-500 hover:border-agri-400 hover:text-agri-600 transition-colors"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Camera size={28} />}
            <span className="text-sm font-medium">{loading ? 'Analyzing…' : 'Click to upload crop image'}</span>
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

        {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

        {result && (
          <div className="mt-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-sm">Crop</span>
              <span className="font-semibold">{result.crop}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-sm">Estimated Grade</span>
              <span className="font-extrabold text-2xl text-agri-700">{result.estimatedGrade}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-sm">Confidence</span>
              <span className="font-semibold">{result.confidence}%</span>
            </div>
            <ul className="text-sm text-slate-600 list-disc list-inside">
              {(result.observations || []).map((o, i) => <li key={i}>{o}</li>)}
            </ul>
            <p className="text-xs text-warn-600 bg-warn-50 rounded-lg px-3 py-2 mt-2">{result.warning}</p>
            <button onClick={() => { setResult(null); }} className="btn-secondary w-full justify-center mt-2">
              <Upload size={14} /> Try another photo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
