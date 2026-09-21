import { useEffect, useState } from 'react';
import { Plus, ArrowRight, AlertTriangle } from 'lucide-react';
import { api } from '../api/client.js';
import ShipmentAndPayment from '../components/ShipmentAndPayment.jsx';

const STATUSES = ['OFFER_CREATED', 'OFFER_ACCEPTED', 'PICKUP_SCHEDULED', 'IN_TRANSIT', 'DELIVERED', 'PAYMENT_RECEIVED'];

const DEFAULT_DEMO_TX = {
  farmerName: 'Ramesh Kumar', buyerName: 'ABC Foods (Demo)', crop: 'Tomato',
  quantityTonnes: 10, agreedPricePerKg: 24, netRealizationPerKg: 21.6,
};

// Reused as-is across /demo, Farmer, FPO, and Buyer roles. Each role
// passes filterFarmerName/filterBuyerName so it only sees transactions
// relevant to it (spec section 19) — the underlying Transaction data and
// lifecycle are shared, not duplicated.
export default function TransactionTracking({ filterFarmerName, filterBuyerName, demoTransactionDefaults = DEFAULT_DEMO_TX }) {
  const [transactions, setTransactions] = useState([]);
  const [disputeFor, setDisputeFor] = useState(null);
  const [disputeForm, setDisputeForm] = useState({ issueType: '', description: '' });

  const load = () => api.listTransactions().then((res) => {
    let list = res.transactions;
    if (filterFarmerName) list = list.filter((t) => t.farmerName === filterFarmerName);
    if (filterBuyerName) list = list.filter((t) => t.buyerName === filterBuyerName);
    setTransactions(list);
  });
  useEffect(() => { load(); }, [filterFarmerName, filterBuyerName]); // eslint-disable-line react-hooks/exhaustive-deps

  const createDemoTransaction = async () => {
    await api.createTransaction(demoTransactionDefaults);
    load();
  };

  const advance = async (tx) => {
    const idx = STATUSES.indexOf(tx.status);
    if (idx >= STATUSES.length - 1) return;
    await api.updateTransactionStatus(tx._id, STATUSES[idx + 1]);
    load();
  };

  const submitDispute = async () => {
    await api.createDispute({ transactionId: disputeFor._id, ...disputeForm });
    setDisputeFor(null);
    setDisputeForm({ issueType: '', description: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-900">Transaction Tracking</h1>
        <button onClick={createDemoTransaction} className="btn-primary"><Plus size={16} /> New Demo Transaction</button>
      </div>

      <div className="space-y-4">
        {transactions.map((tx) => (
          <div key={tx._id} className="card">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-bold text-slate-800">{tx.farmerName} → {tx.buyerName}</p>
                <p className="text-sm text-slate-500">{tx.crop} · {tx.quantityTonnes} T · ₹{tx.agreedPricePerKg}/kg agreed, ₹{tx.netRealizationPerKg}/kg net</p>
              </div>
              <button onClick={() => setDisputeFor(tx)} className="btn-secondary text-xs"><AlertTriangle size={14} /> Raise Dispute</button>
            </div>

            <div className="flex flex-wrap items-center gap-1">
              {STATUSES.map((s, i) => {
                const currentIdx = STATUSES.indexOf(tx.status);
                const done = i <= currentIdx;
                return (
                  <span key={s} className={`text-xs px-2 py-1 rounded-full font-medium ${done ? 'bg-agri-100 text-agri-700' : 'bg-slate-100 text-slate-400'}`}>
                    {s.replaceAll('_', ' ')}
                  </span>
                );
              })}
            </div>

            {tx.status !== 'PAYMENT_RECEIVED' && (
              <button onClick={() => advance(tx)} className="mt-3 text-sm font-semibold text-intel-700 flex items-center gap-1 hover:underline">
                Advance to next stage <ArrowRight size={14} />
              </button>
            )}

            <ShipmentAndPayment transaction={tx} onChange={load} />
          </div>
        ))}
        {!transactions.length && <p className="text-slate-500 text-sm">No transactions yet — create a demo transaction to see the lifecycle.</p>}
      </div>

      {disputeFor && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6">
            <h3 className="font-bold text-slate-800 mb-3">Raise a Dispute</h3>
            <input
              placeholder="Issue type (e.g. Quality mismatch)"
              value={disputeForm.issueType}
              onChange={(e) => setDisputeForm({ ...disputeForm, issueType: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-2"
            />
            <textarea
              placeholder="Description"
              value={disputeForm.description}
              onChange={(e) => setDisputeForm({ ...disputeForm, description: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-3"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setDisputeFor(null)} className="btn-secondary">Cancel</button>
              <button onClick={submitDispute} className="btn-primary">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}