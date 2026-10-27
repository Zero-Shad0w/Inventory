# Windows installer builds

The editable v1.8.4 project is in `ISP-Inventory-v1.8.4/`. The original ZIP is preserved as `ISP-Inventory-1.8.4.zip`; older version archives and the existing README remain unchanged.

The **Build Windows EXE** GitHub Actions workflow runs on source or workflow changes pushed to main, matching pull requests, version tags, and manually through **Actions → Build Windows EXE → Run workflow**.

To download the installer, open a successful run and download **ISP-Inventory-Windows-x64-[run number]** from **Artifacts**. Extract it and run `ISP-Inventory-Setup-1.8.4.exe`. A SHA-256 checksum is included. Artifacts are retained for 90 days; download a copy for permanent storage.

The Windows x64 build runs the project tests, bundles Node.js 22 for SQLite, and packages the existing Electron/NSIS one-click installer with the S icon. Node.js is not required on the target computer. Existing application data is kept by the installer configuration.

The installer is unsigned; Windows may show an unknown-publisher or SmartScreen prompt. Builds do not publish releases automatically. Dependencies currently use the version ranges supplied in the project; no lockfile was included in the original archive.

For a future source version in another folder, update the workflow paths and working directories together.
