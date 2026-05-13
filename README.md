# DQS PWA

A simple, local-first Progressive Web App for tracking daily Diet Quality Score (DQS).

The app is designed for quick daily use:

- Tap food-type tiles to log servings
- See live DQS updates with diminishing-return point logic
- Review the past 30 days in the History tab with bars plus trend line
- Keep all data local in your browser (no backend)

## Notes

- This app was vibe coded.
- Data is stored locally only (IndexedDB).

## Attribution

The Diet Quality Score (DQS) system is attributed to Mark Fitzgerald, author of The Endurance Diet.

## Run Locally

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Quality Checks

```bash
npm run lint
npm run test:run
npm run build
```
