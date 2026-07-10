# communication-style
- During coding/debugging sessions, prefer concise direct answers over explanations. Confidence: 0.80

# code-style
- Use `throw new Error(...)` instead of `return new Error(...)` in handler functions. Confidence: 0.75

# workflow
- When asked for new feature code/snippets, provide the code directly without modifying any files unless explicitly asked. Confidence: 0.85

# snapshot
- Use full snapshots (save entire state) rather than incremental/delta snapshots for engine state persistence. Confidence: 0.65

# typescript
- Use `import.meta.dir` instead of `process.cwd()` for resolving relative paths in Bun/TypeScript. Confidence: 0.60

# architecture
- When a position fails to meet obligations (e.g., funding payment), use existing domain functions like `liquidate()` rather than writing ad-hoc balance adjustments. Confidence: 0.70
- User balances are denominated in USD only, not per-symbol — avoid creating or using symbol-keyed balance entries like `BALANCES[user]["BTCUSD"]`. Confidence: 0.75
