# cashflow_test Integration Guide

This project is a Vite + React + TypeScript cashflow game prototype.

## Active Entry

The supported entry is:

```text
index.html -> src/main.tsx -> src/App.tsx
```

`src/main_desktop.tsx` and `src/App_desktop.tsx` are kept as desktop experiments and are intentionally excluded from the current strict checks.

## Financial Model

The current mainline stores recurring values weekly inside game state:

- Assets use `weeklyIncome`.
- Loans use `weeklyInterest`.
- `calculateFinancials()` returns the current recurring cashflow values used by the UI and rules.

When displaying monthly values, derive them from state:

```ts
const monthlyIncome = asset.weeklyIncome * 4;
const monthlyInterest = loan.weeklyInterest * 4;
```

Opportunity cards still define `monthlyIncome`; when a card becomes an owned asset, the logic converts it into `weeklyIncome`.

## Smart Systems

The smart unemployment and smart market systems are integrated through `src/logic/gameLogic.ts` and the smart panel components. They should consume `GameState` from `src/logic/gameTypes.ts` and must not introduce alternate asset or loan shapes.

## Backup Code

`src_backup/` is historical reference only. It is ignored by ESLint and should not be used as a source of truth for new work.

## Validation Commands

Run these after changes:

```bash
npm run typecheck
npm run lint
npm run build
```
