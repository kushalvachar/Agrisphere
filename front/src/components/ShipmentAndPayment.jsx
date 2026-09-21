// components/ShipmentAndPayment.jsx — Phases 8 & 9.
//
// Embedded inside each transaction card in pages/Transaction.jsx. Both
// the shipment and the payment record are scoped to one real
// transaction (transactionId) — neither can exist without it, so there
// is no way to display a fabricated shipment/payment here.
import { useEffect, useState } from 'react';
import { Truck, Plus, MapPin, PackageCheck, CircleDollarSign, Loader2 } from 'lucide-react';
import { api } from '../api/client.js';

const SHIPMENT_STATUSES = ['CREATED', 'VEHICLE_ASSIGNED', 'PICKUP_CONFIRMED', 'IN_TRANSIT', 'DELIVERED'];
const PAYMENT_STATUSES = ['PENDING', 'ADVANCE_PAID', 'IN_ESCROW', 'RELEASED', 'COMPLETED'];

export default function ShipmentAndPayment({ transaction, onChange }) {
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkpointInput, setCheckpointInput] = useState('');
  const [vehicleForm, setVehicleForm] = useState({ vehicleType: '', registrationNumber: '', driverName: '', driverPhone: '' });

  const loadShipment = () => {
    api.getShipmentByTransaction(transaction._id).then((res) => setShipment(res.shipment)).finally(() => setLoading(false));
  };
  useEffect(() => { loadShipment(); }, [transaction._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const createShipment = async () => {
    setLoading(true);
    await api.createShipment({ transactionId: transaction._id, origin: transaction.farmerName, destination: transaction.buyerName });
    loadShipment();
  };

  const assignVehicle = async () => {
    await api.assignShipmentVehicle(shipment._id, vehicleForm);
    loadShipment();
  };
  const confirmPickup = async () => { await api.confirmShipmentPickup(shipment._id); loadShipment(); };
  const addCheckpoint = async () => {
    if (!checkpointInput.trim()) return;
    await api.addShipmentCheckpoint(shipment._id, { location: checkpointInput });
    setCheckpointInput('');
    loadShipment();
  };
  const markDelivered = async () => { await api.markShipmentDelivered(shipment._id); loadShipment(); };

  const advancePayment = async () => {
    const idx = PAYMENT_STATUSES.indexOf(transaction.payment?.status || 'PENDING');
    if (idx >= PAYMENT_STATUSES.length - 1) return;
    const nextStatus = PAYMENT_STATUSES[idx + 1];
    const amount = nextStatus === 'ADVANCE_PAID'
      ? Math.round((transaction.payment?.totalAmount || 0) * 0.3)
      : transaction.payment?.totalAmount;
    await api.updatePaymentStatus(transaction._id, { status: nextStatus, amount });
    onChange?.();
  };

  if (loading) return <Loader2 size={16} className="animate-spin text-slate-400 my-2" />;

  const paymentStatus = transaction.payment?.status || 'PENDING';

  return (
    <div className="mt-4 pt-4 border-t border-slate-100 grid sm:grid-cols-2 gap-4">
      {/* Phase 8: Logistics Transparency */}
      <div>
        <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1"><Truck size={13} /> Logistics</p>
        {!shipment ? (
          <button onClick={createShipment} className="btn-secondary text-xs"><Plus size={13} /> Start Shipment Tracking</button>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1">
              {SHIPMENT_STATUSES.map((s) => {
                const done = SHIPMENT_STATUSES.indexOf(shipment.status) >= SHIPMENT_STATUSES.indexOf(s);
                return <span key={s} className={`text-[10px] px-2 py-1 rounded-full font-medium ${done ? 'bg-intel-100 text-intel-700' : 'bg-slate-100 text-slate-400'}`}>{s.replaceAll('_', ' ')}</span>;
              })}
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div className="bg-intel-600 h-1.5 rounded-full transition-all" style={{ width: `${shipment.progressPct}%` }} />
            </div>

            {shipment.status === 'CREATED' && (
              <div className="space-y-1">
                <div className="grid grid-cols-2 gap-1">
                  <input placeholder="Vehicle type" value={vehicleForm.vehicleType} onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleType: e.target.value })} className="text-xs border border-slate-200 rounded-lg px-2 py-1" />
                  <input placeholder="Reg. number" value={vehicleForm.registrationNumber} onChange={(e) => setVehicleForm({ ...vehicleForm, registrationNumber: e.target.value })} className="text-xs border border-slate-200 rounded-lg px-2 py-1" />
                  <input placeholder="Driver name" value={vehicleForm.driverName} onChange={(e) => setVehicleForm({ ...vehicleForm, driverName: e.target.value })} className="text-xs border border-slate-200 rounded-lg px-2 py-1" />
                  <input placeholder="Driver phone" value={vehicleForm.driverPhone} onChange={(e) => setVehicleForm({ ...vehicleForm, driverPhone: e.target.value })} className="text-xs border border-slate-200 rounded-lg px-2 py-1" />
                </div>
                <button onClick={assignVehicle} className="btn-secondary text-xs w-full justify-center">Assign Vehicle</button>
              </div>
            )}
            {shipment.status === 'VEHICLE_ASSIGNED' && (
              <button onClick={confirmPickup} className="btn-secondary text-xs w-full justify-center"><PackageCheck size={13} /> Confirm Pickup</button>
            )}
            {(shipment.status === 'PICKUP_CONFIRMED' || shipment.status === 'IN_TRANSIT') && (
              <div className="flex gap-1">
                <input placeholder="Checkpoint location" value={checkpointInput} onChange={(e) => setCheckpointInput(e.target.value)} className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1" />
                <button onClick={addCheckpoint} className="btn-secondary text-xs"><MapPin size={13} /></button>
              </div>
            )}
            {shipment.status === 'IN_TRANSIT' && shipment.checkpoints.length > 0 && (
              <button onClick={markDelivered} className="text-xs text-agri-700 font-semibold hover:underline">Mark Delivered</button>
            )}
            {shipment.vehicle?.registrationNumber && (
              <p className="text-[11px] text-slate-400">{shipment.vehicle.type} · {shipment.vehicle.registrationNumber} · Driver: {shipment.driver?.name}</p>
            )}
            {shipment.checkpoints?.length > 0 && (
              <p className="text-[11px] text-slate-400">Last checkpoint: {shipment.checkpoints[shipment.checkpoints.length - 1].location}</p>
            )}
          </div>
        )}
      </div>

      {/* Phase 9: Payment Tracking */}
      <div>
        <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1"><CircleDollarSign size={13} /> Payment</p>
        <div className="flex flex-wrap gap-1 mb-2">
          {PAYMENT_STATUSES.map((s) => {
            const done = PAYMENT_STATUSES.indexOf(paymentStatus) >= PAYMENT_STATUSES.indexOf(s);
            return <span key={s} className={`text-[10px] px-2 py-1 rounded-full font-medium ${done ? 'bg-agri-100 text-agri-700' : 'bg-slate-100 text-slate-400'}`}>{s.replaceAll('_', ' ')}</span>;
          })}
        </div>
        {transaction.payment?.totalAmount && (
          <p className="text-xs text-slate-500 mb-1">Total: ₹{transaction.payment.totalAmount.toLocaleString('en-IN')}{transaction.payment.advanceAmount ? ` · Advance paid: ₹${transaction.payment.advanceAmount.toLocaleString('en-IN')}` : ''}</p>
        )}
        {paymentStatus !== 'COMPLETED' && (
          <button onClick={advancePayment} className="btn-secondary text-xs">Advance Payment Stage</button>
        )}
      </div>
    </div>
  );
}
