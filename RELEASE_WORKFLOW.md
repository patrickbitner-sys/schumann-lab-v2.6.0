# Release Workflow (v2.6.x)

This is the lightweight, one-command flow for patch releases (v2.6.x).

## Preconditions
- You are on `main`
- Working tree is clean
- SSH auth to GitHub is already configured

## One Command
Run from repo root:

```bash
python3 tools/release_v26.py 2.6.1 --push
```

What this does:
1. Validates repo state (clean + `main`)
2. Updates version strings in:
   - `BASELINE_VERSION.md`
   - `README.md`
   - `app.js`
3. Creates release notes scaffold if missing:
   - `docs/RELEASE_NOTES_v2.6.1.md`
4. Commits changes: `Release v2.6.1`
5. Creates annotated tag: `v2.6.1`
6. Pushes `main` and tag to `origin`

## Dry Run
```bash
python3 tools/release_v26.py 2.6.2 --dry-run
```

## Notes
- Script intentionally allows only `2.6.x`.
- For minor/major bump (`2.7.x` or `3.x`), create a new release helper script.
