# ISP Inventory

A dark-themed inventory management application designed for ISP operations, including fiber and coaxial materials, field teams, and returned customer equipment.

> **Current repository version: v1.8.3.** This repository currently distributes the application as a source ZIP, **not** a ready-to-install Windows EXE. Version 1.8.4 is planned but has **not** been uploaded or released here.

## Download the current version

**[ISP-Inventory-v1.8.3.zip](./ISP-Inventory-v1.8.3.zip)**

An older v1.8.2 installer kit and the original v1.0 release candidate are also retained in the repository for reference. For a new installation, start with v1.8.3 rather than the older archives.

## What the application manages

- ISP material catalog, categories, suppliers and warehouses
- Fiber and coax stock, quantities and movement history
- Materials issued to field teams and returned to inventory
- Customer-returned equipment such as modems, receivers and ONTs
- Technical sign-offs, repairs, stocktaking and audit history
- User accounts with role-based access
- SQLite database and backup/restore workflows
- Dark-themed interface and configurable branding

Features can vary by ZIP version. See the included documentation and source code for the exact behavior of the version you install.

## Windows setup

1. Download the v1.8.3 ZIP above and extract it into a writable folder.
2. Read the **README**, **QUICK-START**, and any installer/build instructions *inside that ZIP* before running it.
3. Follow the version-specific startup or installer-building instructions. A source ZIP is **not** a prebuilt EXE.
4. Before upgrading an existing installation, stop the application and make a separate backup of the entire data directory, including attachments and images.

**Do not overwrite or delete your existing `data/` folder during an upgrade.** Database and backup locations may depend on the installation mode. Verify them before replacing any files.

## Local and shared-server use

The application uses a Node.js backend and SQLite. For multi-PC use, the shared server should own the database and clients should connect to the server; do not open the same SQLite database file directly from multiple PCs over a network share. Configure ports and firewall rules using the instructions shipped with your exact release. Do not expose the server directly to the public internet.

## Upcoming: v1.8.4

The intended next update includes:

- Administrator user-management improvements (disable/delete users and reset passwords)
- Login retry and error-handling fixes
- Local application port and shared-server connection settings
- Continued use of the custom `S.ico` branding
- A Windows installer built through GitHub Actions

**Status:** These changes are planned for GitHub publication. Their presence in the existing v1.8.3 archive has not been verified, and no v1.8.4 source package or Windows EXE is currently published here.

## Windows installer builds

A GitHub Actions workflow is being proposed in [Pull Request #1](https://github.com/Zero-Shad0w/Inventory/pull/1). It requires a v1.8.4 source ZIP with the expected build script before it can successfully create an installer.

After that prerequisite is met and the workflow is merged, installers will be available from the successful run's **Actions → Artifacts** section. Until then, there is **no verified downloadable v1.8.4 installer**.

## Data safety and security

- Keep inventory databases, backups, customer information, credentials, and local configuration secrets **out of GitHub commits**.
- Keep independent backups before every update; test restoring a backup before relying on it.
- Change initial/default credentials immediately, if supplied by a particular release.
- Validate login, user permissions, stock movements and backup/restore in a test environment before production deployment.

## Repository

This repository preserves older release archives while the source distribution and automated Windows build process are being improved. Contributions and issue reports can be submitted through GitHub.
