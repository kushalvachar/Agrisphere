// services/trustScoreService.js
//
// Deterministic "AgriSphere Buyer Trust Score" (spec section 8).
// A simple weighted blend of reliability signals, shown with an
// explanation of what feeds into it — never an opaque black-box number.
//
//   completedTransactions   -> capped contribution, more history = more trust
//   paymentReliabilityPct   -> heaviest weight
//   disputedTransactionsPct -> penalty
//   verified                -> flat bonus
//
// Phase 12: Trust Score Engine. calculateRealTrustScore() below computes
// these four inputs from REAL Transaction/Dispute/Payment records for a
// buyer once they have any — completedTransactions, paymentReliabilityPct
// and disputedTransactionsPct are no longer read from the buyer's
// static/seeded fields once real history exists. A brand-new buyer with
// zero real transactions has no track record to judge, so it correctly
// falls back to the account's own declared/default fields (verified
// status still applies) rather than a fabricated real-looking number.
import Transaction from '../models/Transaction.js';
import Dispute from '../models/Dispute.js';

export function calculateTrustScore(buyer) {
  const {
    completedTransactions = 0,
    paymentReliabilityPct = 0,
    disputedTransactionsPct = 0,
    verified = false,
  } = buyer;

  const historyScore = Math.min(completedTransactions, 50) / 50 * 20; // up to 20 pts
  const reliabilityScore = (paymentReliabilityPct / 100) * 50;         // up to 50 pts
  const disputePenalty = (disputedTransactionsPct / 100) * 20;         // up to -20 pts
  const verifiedBonus = verified ? 10 : 0;                             // 10 pts flat

  const raw = historyScore + reliabilityScore + verifiedBonus - disputePenalty + 20; // +20 base
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  return {
    score,
    label: 'AgriSphere Buyer Trust Score',
    factors: [
      `${completedTransactions} completed transactions on record`,
      `${paymentReliabilityPct}% on-time payment rate`,
      `${disputedTransactionsPct}% of past transactions disputed`,
      verified ? 'Identity verified on AgriSphere' : 'Not yet verified',
    ],
    disclaimer: 'This is not an official credit score.',
  };
}

/**
 * Real-data version: looks up this buyer's actual Transaction and
 * Dispute records and uses THOSE to score, only falling back to the
 * buyer document's own fields where no real transaction history exists
 * yet. Same scoring formula as calculateTrustScore() — this only
 * changes where the four inputs come from.
 */
export async function calculateRealTrustScore(buyer) {
  const transactions = await Transaction.find({ buyerName: buyer.name }).select('_id payment status').lean();

  if (!transactions.length) {
    // No real track record yet — score from the account's own fields
    // (verification status still counts) rather than fabricating history.
    return calculateTrustScore(buyer);
  }

  const withPayment = transactions.filter((t) => t.payment?.status);
  const successfulPayments = withPayment.filter((t) => ['RELEASED', 'COMPLETED'].includes(t.payment.status)).length;
  const paymentReliabilityPct = withPayment.length ? Math.round((successfulPayments / withPayment.length) * 100) : (buyer.paymentReliabilityPct ?? 0);

  const disputeCount = await Dispute.countDocuments({ transactionId: { $in: transactions.map((t) => t._id) } });
  const disputedTransactionsPct = Math.round((disputeCount / transactions.length) * 100);

  const completedTransactions = transactions.filter((t) => t.status === 'PAYMENT_RECEIVED').length;

  return calculateTrustScore({
    completedTransactions,
    paymentReliabilityPct,
    disputedTransactionsPct,
    verified: buyer.verified,
  });
}
