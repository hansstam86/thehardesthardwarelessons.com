# Leaderboard API (Cloudflare Worker + D1)

```
cd worker
npx wrangler d1 create hhl            # copy database_id into wrangler.toml
npx wrangler d1 execute hhl --remote --file=schema.sql
npx wrangler deploy                   # serves api.thehardesthardwarelessons.com (custom domain in wrangler.toml)
```
`API` at the top of `games/hhl.js` points at it.

Scores are client-reported: the API bounds them per chapter, limits writes to 1 per 5s per player and keeps one row per player per chapter. Good enough for a casual board, not tamper-proof.
