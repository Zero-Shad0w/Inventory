<div align="center">

# ⚡ ISP INVENTORY

### Fiber • Coax • Equipment • Field Teams

**Dark-themed inventory and operations management for Internet Service Providers**

![ISP Inventory dashboard concept](docs/images/dashboard-concept.svg)

*Illustrative dark UI concept — not an application screenshot. Sample values are fictional.*

![Current](https://img.shields.io/badge/Current-v1.8.4-ea3355?style=for-the-badge)
![Platform](https://img.shields.io/badge/Platform-Windows-222838?style=for-the-badge)
![Database](https://img.shields.io/badge/Database-SQLite-222838?style=for-the-badge)
![Stack](https://img.shields.io/badge/Stack-Node.js%20%2B%20Electron-222838?style=for-the-badge)

[**Download v1.8.4 Source ZIP**](./ISP-Inventory-1.8.4.zip) · [**Browse v1.8.4 Source**](./ISP-Inventory-v1.8.4) · [**Report an Issue**](https://github.com/Zero-Shad0w/Inventory/issues)

</div>

---

## Overview

ISP Inventory brings warehouse stock, technician allocations, customer equipment returns and operational records into one system. It is designed for ISP workflows involving **fiber optic, coaxial and network equipment**.

> **Release status:** v1.8.4 source ZIP and editable project files are published. This is an **installer build kit**, not a precompiled Windows EXE. Windows installer compilation and manual Windows UI testing have not been verified.

## ✨ Core features

| Module | What it helps you manage |
| :-- | :-- |
| 📦 **Materials & categories** | Register and organize ISP materials by SKU, model and category |
| 🏬 **Warehouse inventory** | Review quantities, locations and stock history |
| 🚐 **Field teams** | Issue stock to teams and track allocated materials |
| 🔄 **Stock movements** | Record receipts, transfers, consumption and returns |
| 📡 **Customer equipment** | Track returned modems, ONTs, receivers and related devices |
| 🛠️ **Operations** | Work orders, repairs and technical sign-offs |
| 👥 **Users & roles** | Control access by account and permission |
| 🗄️ **Backups** | Protect SQLite data and associated files |
| 🎨 **Branding** | Dark interface with configurable company appearance |

Actual availability and behavior depend on the downloaded release; consult its included documentation.

## 🖥️ Interface preview

The image above is a **design illustration**, not a capture of the running application. A real dashboard screenshot will be added after the Windows build and UI are verified. This avoids presenting fictional inventory counts or an untested layout as actual software output.

## 🆕 What's new in v1.8.4

- **Administrator user controls:** delete (deactivate and revoke access), disable/enable accounts, and reset passwords. Historical stock movements and audit references remain intact.
- **Login fixes:** errors display inline and users can retry immediately without restarting the application.
- **Local/shared connection controls:** configure the local application port or enter a shared server IP/hostname and port separately. Server listening-port changes require a restart.
- **Custom S.ico:** retained for the Windows application, installer, and shortcuts.

See the [v1.8.4 changelog](./ISP-Inventory-v1.8.4/CHANGELOG.md) for details.

## 📊 Version comparison

| Capability | v1.8.3 (previous) | v1.8.4 (current source) |
| :-- | :--: | :--: |
| Inventory and materials management | ✅ | ✅ |
| Team stock allocation and returns | ✅ | ✅ |
| Local / shared database connection | ✅ | ✅ |
| Custom red S icon | ✅ | ✅ |
| Separate connection port controls | ✅ | ✅ |
| Admin disable/delete user and password reset | — | ✅ Documented |
| Improved login retry/error feedback | — | ✅ Documented |
| Automated Windows installer build | — | Workflow present; EXE not verified |

The v1.8.4 column reflects the published source and changelog. It does not imply independent Windows runtime verification.

## 🔑 Latest login improvements (updated source)

- **Remember username and password:** Optional checkbox on the Electron desktop login screen. Saved credentials use Electron's encrypted safeStorage on Windows and are associated with the selected local/shared database connection. Passwords are not stored in plain text.
- **Minimum password length: 6 characters:** Applies to first-run administrator setup, creating users and resetting passwords. Longer unique passwords remain recommended.
- These improvements are in the [editable v1.8.4 source folder](./ISP-Inventory-v1.8.4), **not** the previously uploaded `ISP-Inventory-1.8.4.zip` snapshot. The [Windows build workflow](./.github/workflows/build-windows-installer.yml) now uses the latest source folder. Check for a successful workflow artifact before downloading an EXE.

## 🚀 Getting started on Windows

1. **Download** [ISP-Inventory-1.8.4.zip](./ISP-Inventory-1.8.4.zip).
2. **Extract** the ZIP to a writable location.
3. **Read** the build and network instructions inside the extracted package.
4. On a Windows build computer with Node.js 22.5+ and internet access, run `powershell -ExecutionPolicy Bypass -File .\\BUILD-ONE-CLICK-INSTALLER.ps1` from the extracted project folder. The ZIP is editable source/build material, **not** a precompiled EXE.
5. **Back up your existing data** before upgrading from an earlier version.

### Local vs shared database

| Local mode | Shared mode |
| :-- | :-- |
| Database is hosted on the individual PC | A central host serves the shared database |
| Useful for one-PC installations | Useful for several staff computers |
| Accounts and inventory stay local | Clients use the same server-side accounts and inventory |

Shared clients connect to the application server over the LAN — **not directly to a SQLite file on a network drive**. Follow the included network setup guide, configure firewall rules carefully and do not expose the service directly to the public internet.

## 🔐 Preserve your inventory data

> [!IMPORTANT]
> **Never overwrite or delete an existing `data/` directory when upgrading.** Back up the database, evidence, material images and related attachment folders. Confirm the actual data path for your installation and test a restore before production use.

Do not commit customer data, passwords, production databases, backup files or secrets to this public repository.

## 🏗️ Windows EXE build status

The repository contains the [v1.8.4 source ZIP](./ISP-Inventory-1.8.4.zip) and a [GitHub Actions installer workflow](./.github/workflows/build-windows-installer.yml). A successful workflow run should publish its Windows installer under **Actions → Artifacts**. Check the workflow run logs and artifact availability before assuming an EXE was built successfully.

**A successful Windows installer build has not been independently verified here.**

## 🧭 Roadmap

- Validate the published v1.8.4 source package
- Test user management, login and port settings on Windows
- Build and verify the installer using GitHub Actions
- Add genuine application screenshots from a clean demo database
- Improve release documentation and versioned changelogs

---

<div align="center">

**Built for ISP warehouse and field operations**

*ISP Inventory • Zero-Shad0w*

</div>
