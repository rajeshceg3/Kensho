# Verify Kensho
The Char Dham - atmospheric pilgrimage experience (plain static site).
## Launch
Serve the repo root over plain HTTP; everything is static.
## Doctor
`python3 .cursor/skills/verify-kensho/verify.py`
## Drive
Serves the app, renders it in headless Chromium, asserts the boot markers plus zero JS console errors. External-network content neutralized via host-resolver rules.
## Evidence
`.cursor/skills/verify-kensho/evidence.json`
## Cleanup
No daemons left running.
## Known boundaries
Proves local boot and console cleanliness, not third-party services.
