# ISP Inventory v1.7 — One-click installer + dedicated desktop window (Windows build kit)

This package contains the complete v1.6 inventory application and a new Electron desktop host. It is **source/build kit**, not a compiled Windows installer. The final Windows `.exe` must be built and tested on Windows.

## Build the one-click installer

1. Use a Windows 10/11 x64 computer with Node.js **22.5 or later** and internet access.
2. Extract the ZIP to a writable directory (not Program Files).
3. In PowerShell, from the extracted folder, run `powershell -ExecutionPolicy Bypass -File .\BUILD-ONE-CLICK-INSTALLER.ps1`.
4. Wait for Electron and electron-builder downloads to finish.
5. Find `installer-output\ISP-Inventory-Setup-1.7.0.exe` and double-click it.
6. The installer installs per-user, creates Desktop/Start Menu shortcuts, and opens the app in its own desktop window, **without opening the default browser**.

For a preview before building, run `START-DESKTOP-DEV.ps1`.

## Data and upgrades

The Electron desktop build stores its SQLite database and photos in Electron's userData folder, typically `%APPDATA%\isp-inventory-desktop\data` (actual location depends on Electron application identity). For a new installation, start once and check the actual folder before migrating. **Do not assume that your previous `data` directory is automatically imported.** Back up the existing inventory `data` directory and copy it to the new location **with the application closed**. Keep the existing `data` folder for rollback.

The installer does not intentionally remove the user data directory on uninstall. Do not install over or remove your existing app before confirming data migration.

## Technical details

- Electron provides a native desktop window, taskbar and Start Menu shortcut. The existing HTML/CSS/JavaScript interface runs inside Electron, **not in a separate browser**.
- A bundled `node.exe` runs the existing Node.js/SQLite backend on a dynamically selected localhost port. The port is not exposed to other network devices.
- Electron disables renderer Node integration, enables context isolation and sandboxing, and blocks external navigation inside the app.
- No admin privileges required to install (per-user NSIS one-click).
- The app remains fully editable; the existing server and frontend source files are included.
- Building requires internet to download Electron/electron-builder; running the installed application does not.
- The installer is unsigned. Windows SmartScreen may warn until it is code-signed.
- The build is **not yet verified on Windows**. Verify installation, launch, printing, photos, backups, and updates on a test PC before deploying to users.

## Note on multi-user use

This packaging runs a localhost-only service and is designed for a single Windows PC. If you need several other computers to connect simultaneously, a separate shared server/deployment design is required.
