import * as fs from "node:fs";
import * as path from "node:path";
import {
  BALANCES, ORDERBOOK, POSITIONS, ORDERS, FILLS, INDEX_PRICES
} from "../exchangeStore";

const SNAPSHOT_DIR = path.resolve(process.cwd(), "data/snapshot");
const INTERVAL_MS = 5 * 60 * 1000;
const MAX_SNAPSHOTS = 3;

interface SnapshotData {
  balances: [string, Record<string, any>][];
  positions: [string, [string, any][]][];
  indexPrices: [string, number][];
}

async function saveSnapshot() {
  try {
    await fs.promises.mkdir(SNAPSHOT_DIR, { recursive: true });

    const snapshot: SnapshotData = {
      balances: [...BALANCES.entries()],
      positions: [...POSITIONS.entries()].map(([uid, m]) => [uid, [...m.entries()]]),
      indexPrices: [...INDEX_PRICES.entries()],
    };

    const timestamp = Date.now();
    const filePath = path.join(SNAPSHOT_DIR, `snapshot-${timestamp}.json`);
    await fs.promises.writeFile(filePath, JSON.stringify(snapshot));

    const files = (await fs.promises.readdir(SNAPSHOT_DIR))
      .filter((f) => f.startsWith("snapshot-") && f.endsWith(".json"))
      .sort();

    while (files.length > MAX_SNAPSHOTS) {
      const oldest = files.shift()!;
      await fs.promises.unlink(path.join(SNAPSHOT_DIR, oldest));
    }
    console.log(`[snapshot] saved (${snapshot.balances.length} users)`);
  } catch (err) {
    console.error("Snapshot save failed:", err);
  }
}

function loadLatestSnapshot(): boolean {
  try {
    if (!fs.existsSync(SNAPSHOT_DIR)) return false;

    const files = fs.readdirSync(SNAPSHOT_DIR)
      .filter((f) => f.startsWith("snapshot-") && f.endsWith(".json"))
      .sort();

    if (files.length === 0) return false;

    const latestFile = files[files.length - 1];
    const raw = fs.readFileSync(path.join(SNAPSHOT_DIR, latestFile!), "utf-8");
    const snap: SnapshotData = JSON.parse(raw);

    BALANCES.clear();
    for (const [userId, balances] of snap.balances) {
      BALANCES.set(userId, balances);
    }

    ORDERBOOK.clear();
    ORDERS.clear();
    FILLS.length = 0;

    POSITIONS.clear();
    for (const [uid, entries] of snap.positions) {
      POSITIONS.set(uid, new Map(entries));
    }

    INDEX_PRICES.clear();
    for (const [sym, price] of snap.indexPrices) {
      INDEX_PRICES.set(sym, price);
    }

    return true;
  } catch (err) {
    console.error("Snapshot load failed, starting fresh:", err);
    // Delete corrupt files so they don't cause repeated failures
    try {
      const files = fs.readdirSync(SNAPSHOT_DIR)
        .filter((f) => f.startsWith("snapshot-") && f.endsWith(".json"));
      for (const f of files) {
        fs.unlinkSync(path.join(SNAPSHOT_DIR, f));
      }
    } catch {}
    return false;
  }
}

export function startSnapshotLoop() {
  const loaded = loadLatestSnapshot();
  console.log(loaded ? "Snapshot restored (orderbook/orders/fills cleared)" : "No snapshot found, fresh start");

  setInterval(saveSnapshot, INTERVAL_MS);
}
