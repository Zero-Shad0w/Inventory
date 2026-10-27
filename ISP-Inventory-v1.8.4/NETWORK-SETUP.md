# ISP Inventory v1.8 — Local and shared database

## Overview
**Local**: The Electron desktop app starts a private Node.js service and stores data under the current user's `%APPDATA%/isp-inventory-desktop/data` (Electron userData folder).

**Shared**: The desktop app connects over HTTP(S) to a **single central ISP Inventory Node.js server** on a trusted network. The central server exclusively manages the SQLite database on its own local disk. Each connected PC sees the same live stock, devices, returns, users and audit history. No direct SQLite file sharing over SMB/UNC paths is supported: this is unsafe for concurrent writes and WAL mode.

## Set up a server on the LAN
1. Choose a reliable Windows PC with a static or reserved LAN IP (example `192.168.1.20`). Back up its data.
2. Install Node.js 22.5+ on this host, extract the project, and run `START-SHARED-SERVER.bat`. The shared server runs on port **3000** and stores data in `data/`.
3. On the host PC, open `http://127.0.0.1:3000` to create the first Administrator account. Do this **before opening the port to other PCs**.
4. On the host, run PowerShell **as Administrator** and execute `ALLOW-SHARED-SERVER-FIREWALL.ps1` to allow inbound TCP 3000 only from the local subnet, Private profile.
5. On a client PC, install ISP Inventory Desktop and sign in to the **local** installation as an Administrator first. Click **⇄ Database** in the top bar, select **Shared network database**, and enter `http://192.168.1.20:3000` (replace with the actual LAN IP). Click **Test connection**, then **Save & restart**.
6. Sign in with an account created on the **shared server**. Each desktop client must be configured separately. Administrator permissions are enforced against whichever database is currently connected.

## Switching modes
The connection setting is visible only to authenticated Administrator users, and the desktop IPC handler checks the Administrator role against the active server. Local and shared databases are **separate**. Switching does not copy, merge or sync records. Local data remains intact when using shared mode. To switch back, an Administrator on the shared server uses **⇄ Database** > Local.

If the shared server is offline at startup, the desktop app offers **Retry / Switch to Local / Exit**. Switching to local is a recovery option, not a merge or sync.

## Security and limitations
- Shared LAN HTTP is **unencrypted**; use only on a trusted, isolated LAN. For Wi-Fi, remote sites or the internet, deploy HTTPS through a properly configured reverse proxy or VPN.
- Never expose TCP 3000 directly to the public internet. A firewall/VPN and security review are required for sensitive business deployments.
- The shared server requires reliable backups, patching, and a stable host. If the host is off, shared mode cannot operate.
- The desktop app does not auto-start or install the shared server as a Windows Service. The provided batch file must remain running. Production use would benefit from a service wrapper and additional security hardening.
- Do not point multiple server processes at the same SQLite database.
- Existing inventory permissions, stock movements, photo uploads, backup and restore operate against the selected server.
- The Windows NSIS installer must still be built and tested on Windows. No compiled installer is included.

## Changing ports after installation (v1.8.2)
- **Desktop local mode**: Sign in as Administrator, open Settings > Database Connection, choose Local, set a custom port 1024–65535 or leave it empty for Automatic, Test connection, Save & restart. The local server stays bound to `127.0.0.1`.
- **Shared server**: On the server's ISP Inventory Settings page, use **Network & Server Port**, choose a port and save. Restart `START-SHARED-SERVER.bat`. Update the Windows Firewall rule and every client's shared server URL. The `ISP_SERVER_PORT` environment variable overrides the saved port; the shared-server script no longer sets it.
- Do not change the port on a client expecting it to reconfigure the shared host automatically.
- Changing ports does not move, copy, or reset inventory data.

### v1.8.4 client connection port
In the installed desktop application, Administrator > Settings > Database Connection provides **Local application port** (Automatic or custom) and **Shared server port** (custom). The latter is the port this client connects to, not a remote reconfiguration command. To change the shared server's listening port, change Network & Server Port on the server and restart the host process.
