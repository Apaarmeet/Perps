export interface SymbolConfig {
  basePrice: number;
  volatility: number;  // daily volatility
  drift: number;       // annual drift
}

export const SYMBOL_CONFIGS: Record<string, SymbolConfig> = {
  BTCUSD: { basePrice: 65420, volatility: 0.5, drift: 0.05 },
  ETHUSD: { basePrice: 3420, volatility: 0.55, drift: 0.08 },
  SOLUSD: { basePrice: 145, volatility: 0.6, drift: 0.1 },
};

// Geometric Brownian Motion price simulator
// Tick = 500ms, so annualSteps = 365 * 24 * 60 * 60 * 2 ≈ 63M steps
// We scale volatility/drift per tick
const TICK_SECONDS = 0.5;
const STEPS_PER_YEAR = 365 * 24 * 60 * 60 / TICK_SECONDS;

export class PriceSimulator {
  private prices: Record<string, number>;

  constructor() {
    this.prices = {};
    for (const [symbol, config] of Object.entries(SYMBOL_CONFIGS)) {
      this.prices[symbol] = config.basePrice;
    }
  }

  getPrice(symbol: string): number {
    return this.prices[symbol] ?? 0;
  }

  tick() {
    for (const [symbol, config] of Object.entries(SYMBOL_CONFIGS)) {
      const dt = 1 / STEPS_PER_YEAR;
      const mu = config.drift * dt;
      const sigma = config.volatility * Math.sqrt(dt);
      const z = gaussianRandom();

      let price = this.prices[symbol] * Math.exp(mu + sigma * z);

      // Clamp to prevent extreme moves (max 5% per tick, min 1% of base)
      const maxMove = this.prices[symbol] * 0.05;
      const minPrice = config.basePrice * 0.01;

      if (price > this.prices[symbol] + maxMove) {
        price = this.prices[symbol] + maxMove;
      }
      if (price < this.prices[symbol] - maxMove) {
        price = this.prices[symbol] - maxMove;
      }
      if (price < minPrice) price = minPrice;

      this.prices[symbol] = +price.toFixed(1);
    }
  }

  getMidPrice(symbol: string): number {
    return this.prices[symbol] ?? 0;
  }
}

function gaussianRandom(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}
