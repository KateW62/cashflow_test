# cashflow_test Desktop Version Notes

This repository currently treats the existing Vite entry as the official mainline:

```text
index.html -> src/main.tsx -> src/App.tsx
```

The desktop experiment is still present, but it is not the active entry:

```text
src/main_desktop.tsx
src/App_desktop.tsx
src/styles/electric-velocity.css
src/components/CircularBoard.tsx
src/components/ThreeDDice.tsx
src/components/CashFlowDonut.tsx
src/components/MarketTrendChart.tsx
src/components/InvestmentModal.tsx
```

## Current Status

- The default Vite build uses `src/main.tsx`.
- `App_desktop.tsx` is preserved as an experimental PC layout.
- Desktop-only files are excluded from strict typecheck and lint while the mainline is being stabilized.
- Do not switch `index.html` to `src/main_desktop.tsx` until the desktop version is reconciled with the current `GameState`, `Asset`, `Loan`, and market price types.

## Mainline Data Model

Runtime game state should use weekly fields internally:

- `Asset.weeklyIncome`
- `Loan.weeklyInterest`

UI may display monthly values, but it should derive them with `weeklyValue * 4`.

Card definitions still use `monthlyIncome` because those values describe source card data before conversion into owned assets.

## Before Promoting Desktop Version

1. Update desktop UI to use `weeklyIncome` and `weeklyInterest`.
2. Replace removed or stale fields such as `cashFlow`, `balance`, `totalCost`, and `totalMoves`.
3. Align desktop components with exported types from `gameTypes.ts`.
4. Run:

```bash
npm run typecheck
npm run lint
npm run build
```
