## Unreleased changes on v1.8.4 source branch (after published ZIP)
- Added **Remember username and password on this computer** checkbox to the Electron desktop sign-in screen. Opt-in credentials are encrypted using Electron safeStorage (Windows DPAPI), not saved as plain text. Credentials are scoped to the selected local/shared server and can be cleared by unchecking the option on the next sign-in.
- Password minimum reduced from 12 to **6 characters** for first-run administrator setup, new users and administrator password resets, with server-side enforcement.
- GitHub Actions now builds the installer from the editable source folder, so source updates are included without rebuilding the older source ZIP first.
- **Important:** the existing `ISP-Inventory-1.8.4.zip` is an earlier snapshot and does not include these changes. Use the source folder or a new successful GitHub Actions installer artifact.

## v1.8.4 — User administration and sign-in fixes
- Administrator can delete users safely (deactivates account, revokes sessions, hides user from management while retaining ledger and audit history).
- Administrator can disable/enable users and reset passwords, revoking existing sessions.
- Sign-in errors are displayed inline; password entry is immediately available for another attempt without restarting.
- Clearer messages for incorrect credentials and viewer accounts without team assignments.
- Login screen explains local and shared databases have different accounts.
- Original S.ico and local/shared port controls preserved.

## v1.8.3 — Exact S.ico and independent local/shared port fields
- Copied uploaded S.ico byte-for-byte as default Windows application, installer, and shortcut icon.
- Added separate shared server port input alongside shared server host in desktop connection settings.
- Kept custom/automatic local application port setting.
- Kept administrator-only shared server listening port setting and restart requirement.
- Improved local port test when checking the currently running application port.

## v1.8.2 — Administrator network and port configuration
- Desktop local backend port can be Automatic or manually selected (1024–65535) in Database Connection.
- Server Settings includes a configurable shared listening port, persisted outside SQLite and applied on restart.
- Shared client URL continues to support custom ports; connection testing retained.
- All port controls require Administrator role; server-side validation enforced.
- Preserved custom red S icon and all existing inventory features.

## v1.8.1
- Default Windows app, installer, uninstaller, taskbar and shortcut icon set to user-provided red S.
- Multi-resolution .ico generated and included with editable source.

## v1.8.0 — Network database selection
- Admin-only Database control in desktop top bar.
- Local or shared server connection with URL validation, connection test and restart.
- Central server LAN bind opt-in, firewall script and setup documentation.
- Local data retained when using shared mode; shared offline recovery.
- No SQLite network file sharing or automatic synchronization.

## v1.6.0 — Charcoal Dashboard, Supplier Dispatch, Print and Backup Upload
- Dashboard uses a charcoal, low-glow, screenshot-inspired layout with a top navigation selector. All underlying modules remain available.
- Only administrators see the Theme button. Theme setting writes and logo uploads are enforced as admin-only by the API.
- Returned equipment can be selected and dispatched to a supplier, deducting actual warehouse balances transactionally and recording permanent movements and dispatch history.
- Print a single stock movement or the entire ledger with branded A4 forms, print filtered inventory, and print supplier dispatch history.
- Upload and validate SQLite backup snapshots (up to 200 MiB) from a local file, then stage restore for the next restart.
- SQLite-only imported backups preserve existing photo and evidence folders, because those files are not contained in the SQLite snapshot.
- Existing database and photo assets are preserved on upgrade.
- Automated test suite and HTTP integration tests completed. Windows UI not manually tested. Design is screenshot-inspired, not a pixel-identical reproduction.

## v1.5.0
- Per-user profile photo uploads (self-service and admin), circular display in dashboard header and Users list, 10 MiB image cap.
- Bulk serialized device placeholders after stock receipt, later MAC/serial assignment with normalization and duplicate checks.
- Bulk customer returns without identifiers, later bulk or individual editing; existing individual returns form retained.
- Profile pictures included in backup and restore.
- Six automated tests passed; HTTP integration verified 15-device MAC assignment, returns without identifiers, duplicate detection, photo upload and backup.
- Headless browser access was blocked by the execution environment, so visual UI testing on Windows remains outstanding.

## v1.4.0
- Dashboard restyled to match approved futuristic screenshot more closely, including donut/category, team and warehouse charts and interactive navigation.
- Streamed logo upload up to 50 MiB; automatic aspect-ratio fit and max height 32–320 px.
- Logo assets included in backup/restore.
- Passed six automated tests, syntax checks and HTTP integration for 24 MB logo upload/retrieval/backup.
- Headless browser testing blocked by the execution environment; verify UI visually on Windows.

## v1.2.0
- Added interactive dashboard stock charts, team-material charts, low-stock alerts and navigation from all KPI cards.
- Dashboard low-stock click filters Inventory; team chart click filters Balances.
- Team and warehouse edit/delete with safety checks (carried forward from v1.1).
- Removed "Development beta" sidebar label.
- All six automated tests passed; API integration tests verified warehouse deletion, team editing, dashboard counts, team holdings and low-stock alerts.
- Browser automation unavailable due to environment restrictions; Windows manual UI validation remains outstanding.

## 1.1.0 — Teams and warehouses management (2026-10-27)
- Added Edit and Delete actions to the Teams and Warehouses tabs (administrator only).
- Editing supports team name, leader, phone and active status; warehouse name and kind.
- Renaming a team/warehouse migrates current stock balances, device locations, stocktake locations and pending sign-off sources. Historical append-only movement entries retain their original names.
- Deleting is blocked when the record has stock, linked users, assignments, movements or other historical references.
- Removed the “Development beta” sidebar subtitle.
- Fixed default warehouse seeding: deleting unused Quarantine, Defective or Repair does not recreate it on restart.
- Existing data and source code remain editable.

# ISP Inventory — Change Log

## 1.0 Release Candidate (2026-10-26)
- Consolidated the editable Windows app and its previous features.
- Fixed team issuance rejecting valid lines due to a non-existent source field.
- Validated source warehouses on receipts and team loading.
- Technical sign-off line uniqueness now supports the same material from separate stock sources. Existing databases migrate automatically.
- Stocktaking adjustments are committed atomically.
- Viewer accounts require a team link and remain read-only.
- Added Windows system-check helper and a source-control ignore file.
- Tested end-to-end API workflow: supplier receipt, team loading, multi-source sign-off approval, material editing and backup.

This is a release candidate, not a certified production system. Full Windows browser testing,
restore drills, concurrent-user load tests, and independent security review remain necessary.
