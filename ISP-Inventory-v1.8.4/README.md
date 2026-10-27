# ISP Inventory v1.8.2 — Red Company Icon Edition

Your uploaded red S logo is now the **default embedded Windows EXE icon**, NSIS setup/uninstaller icon, Windows taskbar/window icon and default shortcut icon. The image is preserved in `desktop/assets/company-logo.png` and Windows ICO format in `desktop/assets/company-icon.ico`.

This is the **complete editable Windows installer build kit**, not a prebuilt executable.

## Build an EXE installer on Windows
1. Extract the ZIP. Install Node.js 22.5+ and have internet access on the build computer.
2. Open PowerShell in the extracted folder and run `powershell -ExecutionPolicy Bypass -File .\BUILD-ONE-CLICK-INSTALLER.ps1`.
3. The installer should be generated as `installer-output\ISP-Inventory-Setup-1.8.1.exe`.
4. Copy that installer to other Windows computers and install. Destination PCs should not need Node.js.
5. Back up your old database and attachments before upgrading. Do not delete the existing data folder.

## Logo notes
The default Windows application icon is your red S. The in-app software logo remains customizable in Settings; changing it there does not modify the already compiled EXE icon. To change the embedded icon again, replace `desktop/assets/company-icon.ico` and rebuild.

## Local and shared database
Both connection modes remain available, with admin-only settings. See `NETWORK-SETUP.md` for central server setup.

## Testing
Build configuration and JavaScript syntax were checked in this environment. The actual Windows installer must still be compiled and tested on a Windows machine.

# ISP Inventory v1.8 — Desktop Local / Shared Database Edition

Full editable source code and Windows one-click installer **build kit**. A precompiled installer is not included.

## New feature
Administrators can choose **Local database** or **Shared network database** from **Settings → Database connection** or the **⇄ Database** button in the desktop top bar.

In shared mode, the desktop app connects to a central ISP Inventory server, not to a shared SQLite file. All connected computers see the same live inventory, stock movements, users, returns, photos and backups. Switching modes never merges or copies records. Local data stays on each PC.

**See `NETWORK-SETUP.md` for complete server, client and firewall instructions.**

## Build desktop installer on Windows
1. Install Node.js 22.5+ on the build computer.
2. Extract this ZIP.
3. Run `BUILD-ONE-CLICK-INSTALLER.ps1` in PowerShell.
4. Find `installer-output/ISP-Inventory-Setup-1.8.0.exe` and install on Windows clients.
5. Back up your existing data before upgrading.

## Run a shared host
On a dedicated LAN Windows PC with Node.js installed, run `START-SHARED-SERVER.bat` and follow `NETWORK-SETUP.md`. Configure Windows Firewall for TCP 3000 on Private LAN only.

## Security
Do not put the SQLite file on a network drive, do not expose the shared service to the public internet, and use HTTPS/VPN outside a trusted LAN. Admin role is verified by the desktop application before allowing connection settings to change. Windows installer compilation and visual desktop testing remain unverified.

### Network and port controls (v1.8.2)
Administrators can change the desktop local port (Automatic or custom) from **Settings > Database Connection**. Administrators can also save the shared server listening port from **Settings > Network & Server Port**. Shared server port changes take effect after restarting the server, updating the firewall and client connection URLs. See `NETWORK-SETUP.md`.

If electron-builder fails with `Cannot create symbolic link`, enable Windows Developer Mode or run PowerShell as Administrator, clear `%LOCALAPPDATA%\\electron-builder\\Cache\\winCodeSign`, and rebuild.

### Default Windows icon
The default EXE, installer, uninstall and shortcut icon uses the exact user-supplied `S icon.jpg`, converted to `desktop/assets/company-icon.ico`. The original JPG is also included in `desktop/assets/`. Note: the checkerboard pattern is part of the provided JPEG image, not true transparency.

### v1.8.4: exact user-provided S.ico and separate port controls
The Windows executable, installer, shortcuts, and Electron window use `desktop/assets/company-icon.ico`, copied byte-for-byte from the uploaded `S.ico`.
Admin Settings > Database Connection: select Local to enter a local port or leave blank for Automatic; select Shared to enter the server IP/hostname and **Shared server port** separately. Test, Save & Restart.
Admin Settings > Network & Server Port on the shared server: save the host's listening port, restart the server and update firewall/client URLs. A local desktop service uses its separate desktop connection port and ignores the shared server port setting.

### User account fixes (v1.8.4)
Administrators can **Delete**, **Disable/Enable**, and **Reset password** for users on the Users page. Delete revokes access and removes the user from active management while keeping historical inventory and audit references. An administrator cannot delete their own account or remove the final active administrator.

Login errors now appear inside the login form and can be corrected without restarting. If a user works on another PC, select **Shared Database** and point both PCs at the same host/port; users created in one computer's local database are not automatically available in a different local database. Viewer / Auditor users must be assigned to a team.
