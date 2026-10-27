<div align="center">

# ⚡ ISP INVENTORY

### Fiber • Coax • Equipment • Field Teams

**Dark-themed inventory and operations management for Internet Service Providers**

![ISP Inventory dashboard concept](docs/images/dashboard-concept.svg)

*Illustrative dark UI concept — not an application screenshot. Sample values are fictional.*

![Current](https://img.shields.io/badge/Current-v1.8.3-ea3355?style=for-the-badge)
![Platform](https://img.shields.io/badge/Platform-Windows-222838?style=for-the-badge)
![Database](https://img.shields.io/badge/Database-SQLite-222838?style=for-the-badge)
![Stack](https://img.shields.io/badge/Stack-Node.js%20%2B%20Electron-222838?style=for-the-badge)

[**Download v1.8.3 Source ZIP**](./ISP-Inventory-v1.8.3.zip) · [**Installer Build PR**](https://github.com/Zero-Shad0w/Inventory/pull/1) · [**Report an Issue**](https://github.com/Zero-Shad0w/Inventory/issues)

</div>

---

## Overview

ISP Inventory brings warehouse stock, technician allocations, customer equipment returns and operational records into one system. It is designed for ISP workflows involving **fiber optic, coaxial and network equipment**.

> **Release status:** v1.8.3 is the latest source ZIP currently published in this repository. v1.8.4 and a prebuilt Windows installer are **not yet published**. This repository's source ZIP should not be mistaken for an installable EXE.

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

## 📊 Version comparison

| Capability | v1.8.3 (published) | v1.8.4 (planned publication) |
| :-- | :--: | :--: |
| Inventory and materials management | ✅ | ✅ |
| Team stock allocation and returns | ✅ | ✅ |
| Local / shared database connection | ✅ | ✅ |
| Custom red S icon | ✅ | ✅ |
| Separate connection port controls | Included in v1.8.3 release notes | Planned to retain |
| Admin disable/delete user and password reset | Not verified | Planned |
| Improved login retry/error feedback | Not verified | Planned |
| Automated Windows installer build | Not published | Proposed workflow |

The v1.8.4 column describes **planned GitHub release contents**, not a published or validated installer.

## 🚀 Getting started on Windows

1. **Download** [ISP-Inventory-v1.8.3.zip](./ISP-Inventory-v1.8.3.zip).
2. **Extract** the ZIP to a writable location.
3. **Read** the README, quick-start and build instructions inside the extracted package.
4. **Follow** that version's Windows startup or installer-building steps. The ZIP is editable source/build material, **not** a precompiled EXE.
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

[Pull Request #1](https://github.com/Zero-Shad0w/Inventory/pull/1) proposes a GitHub Actions workflow for building a Windows installer. The workflow requires the **v1.8.4 source ZIP** in the repository first. After the prerequisite is met, a successful workflow run can publish the generated EXE under **Actions → Artifacts**.

**No successful Windows installer build is claimed yet.**

## 🧭 Roadmap

- Publish and validate the v1.8.4 source package
- Test user management, login and port settings on Windows
- Build and verify the installer using GitHub Actions
- Add genuine application screenshots from a clean demo database
- Improve release documentation and versioned changelogs

---

<div align="center">

**Built for ISP warehouse and field operations**

*ISP Inventory • Zero-Shad0w*

</div>
