# ISP Inventory — Windows Release Candidate 1.0

**Start here:** `QUICK-START.txt` has Windows setup, data preservation and operational instructions. `CHANGELOG.md` summarizes changes and known verification gaps.

**Editable project:** All Node.js backend, SQLite schema, frontend HTML/CSS/JS and tests remain included. This is not a compiled EXE. Use Node.js 22.5+ and `START-ISP-INVENTORY.bat`.

**Data safety:** The app creates its local `data/` directory on first run. Never replace an existing `data/` directory during an update. Copy backups (including companion `.files` and `.images` directories) to another drive. For a restore, stop all users and restart the backend after staging the restore in the Backups tab.

**Security boundary:** Both services listen only on 127.0.0.1. The ZIP is not hardened for exposure to the Internet or multi-PC network access.

**Verification:** Six automated tests passed; HTTP integration scenarios checked receiving stock, loading a team, accepting a mixed warehouse/team sign-off, editing a material, backups and restore on restart. The browser interface and Windows BAT files were not executed in a Windows environment, and concurrent-user/load/security testing is incomplete.

---

# ISP Inventory — editable development beta (0.3.0)

## Start on Windows

1. Install Node.js 22.13+ (22 LTS or newer). No npm packages need to be downloaded.
2. Extract the ZIP to a writable directory.
3. Double-click `START-ISP-INVENTORY.bat`.
4. Visit `http://127.0.0.1:3000` and create an administrator account with a password of at least 12 characters.
5. Keep the server console running. Close it to stop the software.

Run `npm test` to run automated checks. Data is stored in `data/inventory.sqlite` alongside the extracted application; do not delete it when updating. Backups are created in `data/backups/` and should also be copied to a different disk.

## Implemented in this beta

- First-run administrator setup, password hashing, login/logout, 8-hour sessions, five named roles (partial permission mapping)
- Dark responsive browser UI and dashboard with live database counts
- Materials, categories, warehouses, teams, suppliers, work orders, serialized devices
- Stock receipts, transfers, team allocation by location name, consumption, returns to stock, append-only movement ledger and nonnegative balances
- Customer return records, repair records, stocktaking sessions/counts and manager approval
- Audit log, CSV exports, manual SQLite database snapshots, company-name setting
- Windows double-click BAT launcher, editable source code

## Important gaps — NOT production ready

This is a broad **beta scaffold**, not the fully specified enterprise application. Stock issuance and consumption do not yet enforce serialized device transitions. Customer return status changes do not automatically perform quarantine/release ledger transactions. Stocktake approvals do not yet handle simultaneous updates as one atomic batch. Roles need finer-grained server-side enforcement, especially team-specific access. There is no login throttling, no HTTPS/LAN setup, no secure attachment upload, no PDF/Excel exports, no scheduled backup/restore wizard, no multi-line transaction documents, and no complete work-order stock attribution. The frontend currently creates records but does not offer edit controls for all modules (API updates exist). Backups cover the SQLite file only. Test coverage is partial and Windows launcher has not been executed on a Windows test machine.

**Use test data only. Do not deploy to your ISP staff or expose this beta on a LAN or the internet.**

## Development

The application uses Node.js built-in `node:sqlite`, `node:http`, and browser JavaScript; no npm install is required. Backend code is under `server/`, frontend under `public/`, tests under `test/`. The app listens only on 127.0.0.1 by design. `npm start` also starts the server. Stop the server before replacing files during updates and preserve the `data/` directory.

## Material registration and supplier receipts (v0.4 beta)

1. Open **Materials** and register each distinct material type once (SKU, name, category, unit).
2. Open **Supplier Receipts**, select a supplier (create one under Suppliers if needed), enter the supplier bill or delivery-document number and date, and choose **Main Warehouse**.
3. Add one or more existing materials with quantities and save. Stock is credited only when the complete receipt succeeds.
4. Use **Supplier Receipts** history to locate document numbers and use **Stock Movements** to inspect linked ledger entries.

The same supplier cannot have two receipts with the same document number; different suppliers may reuse a document number. Existing inventory data is kept in the same local database folder when upgrading, but **make a backup before replacing the app**.

**Development limitations:** This beta does not yet attach invoice scans, manage purchase prices, or support reversing a supplier receipt through the UI. Serialized-device receipt handling is not fully implemented. Use only sample data for evaluation.

## v0.5 SKU stock movements
The Stock Movements form selects materials by SKU rather than numeric database ID. Movement history, dashboard recent movements and exported movement CSV show SKU and material name. Existing ledger rows are unchanged and resolve SKU through the materials catalog.

## v0.6: Load Teams
Use **Load Teams** in the sidebar to choose a field team and source warehouse, search by SKU/name, add multiple material lines, see available stock, and confirm one atomic issuance. Warehouse quantities decrease and team-held stock increases. Back up your `data` directory before upgrading.


## v0.7 Inventory tab
View current stock by SKU, material, category and unit. Search and filter by location or stock status; export the displayed inventory to CSV. Main Warehouse, other warehouses, and team holdings are separated. Back up your existing data folder before upgrading.


## v0.8 Technical Sign-off
A new Technical Sign-off tab lets users register accepted work with a document number, work reference, team, material SKU and quantity lines, and optional JPG/PNG/PDF evidence up to 500 KB. Submissions remain Pending until approved by an Administrator or Warehouse Manager. Approval atomically deducts all listed materials from the issuing team's holdings and creates ledger movements; rejection does not change stock. Evidence can be downloaded by authenticated authorized users. Back up the existing data directory before replacing this beta. This feature has not been Windows browser-tested.


## v0.9 — Create materials during supplier receiving
On Supplier Receipts, click **+ Register new material**, fill in the SKU and details, and save. The new material is automatically selected on a receipt line while the supplier and bill fields stay intact. Enter its quantity and save the receipt to add stock. Duplicate SKUs are checked; the backend still enforces database uniqueness.

## v0.10 — Technical Sign-off stock source
Each material line in Technical Sign-off now has a **Deduct from** selector. Select the field team's stock or a warehouse (including Main Warehouse). A single acceptance document can contain materials from different sources. The available quantity shown reflects the selected source. On approval, the selected sources are deducted atomically, and stock movements preserve the source and document number. Warehouse stock can only be submitted for deduction by warehouse staff or administrators; Field Team Leaders may submit deductions from their own team stock only. Existing sign-off records retain their original team-stock source. The schema automatically adds the new source column to existing databases. Back up your data directory before upgrading.

## Beta v0.11 — Technical Sign-off attachments, team viewers, branding, restore
- Technical Sign-off accepts streamed PDF/JPG/PNG evidence without an application-defined file-size limit. Available disk space, network interruptions, and operating-system limits still apply. Evidence is stored in `data/signoff-evidence` rather than in the SQLite database. Do not expose this beta to the public internet.
- Administrator can link users to teams under **Users**. For team-linked **Viewer / Auditor** accounts, the UI and backend restrict access to read-only team inventory, movements and sign-offs. Other roles retain their previous permissions. To create a strictly read-only team account, choose **Viewer / Auditor** and a team.
- Administrator-only **Settings** changes the displayed software name, logo, accent and background. The logo is limited to 1.5 MB (independent of technical sign-off evidence limits).
- **Backups** captures SQLite (including users and settings) and sign-off evidence. Keep both the `.sqlite` file and its `.sqlite.files` folder. To restore, choose the snapshot, type `RESTORE DATABASE`, and restart the server. A pre-restore safety snapshot is made. Do not let anyone use the server between staging and restarting.
- These are development features, not a production deployment. Back up your original `data` folder before upgrading. This beta does not include a Windows EXE.


## v0.12 — Configurable backend and frontend ports
Run `CONFIGURE-PORTS.bat` and choose two **different** free TCP ports (1–65535). The defaults are **3000** for the backend/API and **3001** for the frontend website. Settings are saved in `ports.cmd` and read by `START-ISP-INVENTORY.bat`. Both servers bind to `127.0.0.1` (local PC only). The frontend transparently proxies `/api` calls to the backend, including streamed attachments, so the login and API work through the frontend port. Close both running server windows before changing ports, then restart using the launcher. `ports.cmd` is intentionally local configuration; do not run files supplied by untrusted parties. You may also set `ISP_SERVER_PORT` and `ISP_FRONTEND_PORT` environment variables. `PORT` is supported as a legacy backend override if `ISP_SERVER_PORT` is not set. Keep the `data` folder when updating.

## v0.13: Categorized navigation
The sidebar now has seven collapsible categories with submenus, exactly matching the requested groupings:
1. Dashboard & Analytics — Dashboard, Reports, Audit Log
2. Inventory & Stock Management — Inventory, Stock Movements, Balances, Stocktaking, Customer Returns
3. Supply Chain & Materials — Materials, Supplier Receipts, Suppliers
4. Operations & Maintenance — Work Orders, Repairs, Technical Sign-off
5. Logistics & Personnel — Load Teams, Teams, Users
6. System Assets & Configuration — Warehouses, Categories, Devices
7. Administration & Infrastructure — Settings, Backups

Navigation still honors user permissions: admin-only pages are hidden from non-admins, and team-linked viewers see only their authorized read-only pages. The navigation change does not replace any database tables or remove functionality.

Validation: six automated tests and an HTTP smoke test of all 20 page API endpoints using a temporary database. These checks do not establish that every create/edit/approve/restore workflow works end-to-end. Keep backups and test critical workflows before production use.

## v0.14 — Material photos and persistent diagnostic windows
- Upload a JPG, PNG or WebP photo (up to 10 MB) when registering a material, or later via **Materials → Add or replace a material photo**.
- Supplier Receipts' quick-register form also accepts an optional material photo.
- Inventory and Materials tables display a thumbnail beside each material. Existing records without a photo show a placeholder.
- Material photos are saved in `data/material-images` and are included in database backups/restores (as companion `.images` directories).
- Windows launcher now starts `RUN-SERVER.bat` and `RUN-FRONTEND.bat`. If a Node service exits, its command window stays open with the error and a restart prompt. The initial launcher also stays open.
- This does not eliminate underlying crashes: review the displayed error or port conflicts if a service stops.
- Back up the entire `data` folder before upgrading. Do not overwrite your live database with the sample files.

## v0.15 — Edit materials
The Materials tab now includes Edit buttons for authorized inventory staff. You can update SKU, name, category, unit, technology, model, minimum-stock threshold, tracking and active status. Existing stock quantities and movement history remain unchanged. Unit/tracking changes are blocked for materials with movements. Updates are audited and duplicate SKUs are rejected.
