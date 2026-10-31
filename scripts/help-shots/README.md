# Annotated help screenshots

The in-app help for the newer surfaces (Teach studio, company workflows, workflow
issues, executive dashboard, the company console's Trainer grant and API &
webhooks) shows REAL screenshots with numbered callouts layered on top
(`src/pages/work/help/AnnotatedShot.jsx`). Each image lives under
`public/help/<group>/<name>.webp`; its callout regions live in
`src/pages/work/help/shotGeometry.js`. Both come from the same capture run, so a
highlight can never drift from its screenshot. Refresh them whenever one of these
screens changes (the dashboard design standard makes that the last step of any
dashboard change).

Nothing here touches real data: the seed builds a fictional company (Northwind
Logistics) in a fresh throwaway data dir, and refuses `server/data`.

## Refresh

Needs Python with `playwright` (Chromium) and `Pillow`, plus `ffmpeg` for the
sample video. `<workdir>` is any empty folder OUTSIDE the repo.

1. `<workdir>/help.env` with `WORK_DATA_DIR=<workdir>/data`, `SEED_PASSWORD=<random>`,
   `EXPORT_PASS=<random>`, `WORK_MFA_DISABLED=1`, `PORT=4461`.
2. Mock app screens for the workflow step screenshots, and a short sample video
   for the import shot:
   `python scripts/help-shots/frames.py <workdir>/frames`, then build
   `<workdir>/refund-call.webm` from `frames/refund-*.jpg` with ffmpeg (any
   16-second VP9/Opus clip works).
3. Seed: `node --env-file=<workdir>/help.env scripts/help-shots/seed.mjs . <workdir>/frames`
4. Start the API with the same env file (`node --env-file=<workdir>/help.env server/index.js`)
   and a vite dev server whose `/api` points at it (`.verify-api.local` containing
   `http://127.0.0.1:4461`, then `npx vite --config vite.verify.config.js --port 5208`).
   Override the address with `HELP_SHOTS_BASE` if you use another port.
5. Capture all shots (or a comma list of names):
   `python scripts/help-shots/capture.py <workdir> . [names]`
   Review copies with the boxes drawn land in `<workdir>/shots/`.
6. Write the geometry: `python scripts/help-shots/geo2js.py <workdir> .`
7. Verify the rendered help per role, width and theme:
   `HELP_SHOTS_DIR=<workdir> python scripts/help-shots/verify_help.py en`

Capture order matters for a few states (the Teach studio list is taken before the
Workflow issues inbox marks the trainer's alerts read): run the full set on a
fresh seed.

## Adding a shot

Register it in the matching `shots_*.py` with `@shot('<group>/<name>')`: sign in
as the role that sees the screen, set up the state, then
`shoot(pg, name, clip, { key: selector })`. Each `key` becomes a callout; add its
text under the help entry's `marks.<key>` in English and every locale, and list
the key in the entry spec (`src/pages/work/help/entries/*.jsx` or
`src/pages/workadmin/sections/HelpCompanyNewAreas.jsx`).
