    import * as fs from "node:fs";
    import * as path from "node:path";
    import {
      BALANCES, ORDERBOOK, POSITIONS, ORDERS, FILLS, INDEX_PRICES,
      type Fill, type OrderRecord, type Position, type Balance, type RestingOrder
    } from "../exchangeStore";

    const SNAPSHOT_DIR = path.resolve(import.meta.dir, "../../../data/snapshot");
    const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

    interface SnapshotData {
      balances: [string, Record<string, Balance>][];
      orderBooks: [string, { bids: [number, RestingOrder[]][]; asks: [number, RestingOrder[]][] }][];
      positions: [string, [string, Position][]][];
      orders: [string, OrderRecord][];
      fills: Fill[];
      indexPrices: [string, number][];
    }

    export function saveSnapshot() {
      if (!fs.existsSync(SNAPSHOT_DIR)) {
        fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
      }

      const snapshot: SnapshotData = {
        balances: [...BALANCES.entries()],
        orderBooks: [...ORDERBOOK.entries()].map(([sym, ob]) => [
          sym,
          { bids: [...ob.bids.entries()], asks: [...ob.asks.entries()] },
        ]),
        positions: [...POSITIONS.entries()].map(([uid, m]) => [uid, [...m.entries()]]),
        orders: [...ORDERS.entries()],
        fills: [...FILLS],
        indexPrices: [...INDEX_PRICES.entries()],
      };

      const timestamp = Date.now();
      const filePath = path.join(SNAPSHOT_DIR, `snapshot-${timestamp}.json`);

      fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2));
    }

    export function loadLatestSnapshot(): boolean {
      if (!fs.existsSync(SNAPSHOT_DIR)) return false;

      const files = fs.readdirSync(SNAPSHOT_DIR)
        .filter((f) => f.startsWith("snapshot-") && f.endsWith(".json"))
        .sort(); // alphabetical = chronological for timestamps

      if (files.length === 0) return false;

      const latestFile = files[files.length - 1];
      const raw = fs.readFileSync(path.join(SNAPSHOT_DIR, latestFile!), "utf-8");
      const snap: SnapshotData = JSON.parse(raw);

      // Restore BALANCES
      BALANCES.clear();
      for (const [userId, balances] of snap.balances) {
        BALANCES.set(userId, balances);
      }

      // Restore ORDERBOOK
      ORDERBOOK.clear();
      for (const [sym, ob] of snap.orderBooks) {
        ORDERBOOK.set(sym, {
          bids: new Map(ob.bids),
          asks: new Map(ob.asks),
        });
      }

      // Restore POSITIONS
      POSITIONS.clear();
      for (const [uid, entries] of snap.positions) {
        POSITIONS.set(uid, new Map(entries));
      }

      // Restore ORDERS
      ORDERS.clear();
      for (const [oid, order] of snap.orders) {
        ORDERS.set(oid, order);
      }

      // Restore FILLS
      FILLS.length = 0;
      FILLS.push(...snap.fills);

      // Restore INDEX_PRICES
      INDEX_PRICES.clear();
      for (const [sym, price] of snap.indexPrices) {
        INDEX_PRICES.set(sym, price);
      }

      return true;
    }

    export function startSnapshotLoop() {
      const loaded = loadLatestSnapshot();
      console.log(loaded ? "Snapshot restored" : "No snapshot found, fresh start");

      setInterval(saveSnapshot, INTERVAL_MS);
    }