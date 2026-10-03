# Wireframes

Clickable wireframes for the three surfaces: super admin (13 screens), vendor CMS (31 screens)
and storefront PWA (24 screens, each in mobile and desktop). Updated 3 October 2026 with the
Phase 1 growth features (schemes and offers, coupons, offer messages, abandoned carts, affiliates,
reviews, wishlist) and Phase 2 zones (trade accounts, trade schemes, loyalty points, compare). The two admin surfaces also have a
full-colour Design view: the planned TenantEcom theme for Payload's admin, the same for every vendor. Sample data and
fictional vendors only. Every screen lists its purpose, route, roles, collections and numbered
redline notes that point back to the docs.

- Private link: https://claude.ai/artifact/7jC16wPvqyavZW9qqN7ask
- Open locally: `python -m http.server 4173 --directory docs/wireframes`, then http://localhost:4173
  (also saved as the `wireframes` entry in `.claude/launch.json`). Opening `index.html` straight
  from disk works too.
- Public site: https://tenantecom-wireframes.vercel.app (Vercel project `tenantecom-wireframes`
  in mudit's account). Redeploy after changes: `npx vercel deploy --prod` from this folder.

## Specs for building the app

`docs/screens/super-admin.md`, `docs/screens/vendor-cms.md` and `docs/screens/storefront.md` are
generated from these screens (route, roles, collections, everything on the screen, rules). After
changing a screen, regenerate them from the repo root:

```bash
node docs/wireframes/build-specs.js
```

The intro of each spec lives in `spec-intros/` (`sa.md`, `cms.md`, `st.md`).

## Files

| File | What it holds |
|---|---|
| `index.html` | Page shell and all styles |
| `js/kit.js` | Drawing helpers (fields, tables, admin and storefront chrome, sample products) |
| `js/super-admin.js` | Super admin screens |
| `js/cms.js` | Vendor CMS screens |
| `js/storefront.js` | Storefront screens |
| `js/app.js` | Router, screen index, notes panel, fit-to-width zoom |

Each screen is one `WF.screen({ id, surface, group, title, purpose, route, who, data, docs, notes, render })`
entry. Elements with `data-go="<screen id>"` link screens together. When `docs/08` feature keys,
`docs/17` phases or `docs/05` roles change, update the matching screen notes so the wireframes stay
in sync.
