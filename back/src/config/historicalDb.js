// config/historicalDb.js — Feature: Historical Market Data & Price
// Trend Charts.
//
// A SECOND, independent MongoDB connection, pointed at MONGO_URI2 — a
// separate database that already contains historical mandi price
// records (collected outside this app). This is intentionally NOT the
// same connection config/db.js opens for the primary application DB
// (farmers, buyers, transactions, etc.): the two databases are
// unrelated, may live on entirely different clusters, and mixing them
// on one mongoose connection would make it impossible to point either
// one somewhere else independently later.
//
// mongoose.createConnection() (as opposed to mongoose.connect(), which
// config/db.js uses for the default connection) is exactly what
// mongoose recommends for "talk to a second database from the same
// process" — see https://mongoosejs.com/docs/connections.html#multiple_connections
//
// Never throws: if MONGO_URI2 is unset or unreachable, historical
// trend data simply comes back empty (see historicalMarketService.js)
// rather than taking the whole API down — same reliability rule the
// rest of this backend already follows for its other external data
// sources (data.gov.in, Geoapify, OSRM).
import mongoose from 'mongoose';

let historicalConnection = null;
let connectingPromise = null;

/**
 * Opens (once) and returns the dedicated MONGO_URI2 connection.
 * Safe to call repeatedly — subsequent calls reuse the same connection
 * (or the same in-flight connection attempt) instead of opening a new
 * one every time a request comes in.
 * @returns {Promise<import('mongoose').Connection|null>} null if
 *   MONGO_URI2 is not configured, or if the connection attempt fails.
 */
export async function getHistoricalConnection() {
  if (historicalConnection?.readyState === 1) return historicalConnection;

  const uri = process.env.MONGO_URI2;
  if (!uri) {
    // Logged once per process, not once per request, via the module-level
    // guard below.
    if (!connectingPromise) {
      console.warn('historicalDb: MONGO_URI2 is not set — historical 7-day trend data will be unavailable (Market Intelligence keeps working off live prices only).');
      connectingPromise = Promise.resolve(null);
    }
    return connectingPromise;
  }

  if (!connectingPromise) {
    connectingPromise = mongoose.createConnection(uri, {
      serverSelectionTimeoutMS: 8000,
    }).asPromise()
      .then((conn) => {
        historicalConnection = conn;
        console.log('historicalDb: MONGO_URI2 connected (dedicated connection, separate from the primary app DB).');
        conn.on('error', (err) => console.error('historicalDb: connection error —', err.message));
        conn.on('disconnected', () => console.warn('historicalDb: MONGO_URI2 connection lost — will retry on next request.'));
        return conn;
      })
      .catch((err) => {
        console.error('historicalDb: failed to connect to MONGO_URI2 —', err.message);
        historicalConnection = null;
        connectingPromise = null; // allow a later request to retry rather than staying broken forever
        return null;
      });
  }

  return connectingPromise;
}

/** Called once from server.js at startup, purely so a connection
 * failure is visible in the logs immediately rather than on the first
 * request — the API itself never depends on this having succeeded. */
export async function connectHistoricalDB() {
  await getHistoricalConnection();
}