# Build on Windows PowerShell 5.1 with Node.js 22.5+ installed.
# Creates dist/ISP-Inventory.exe plus portable Node runtime and application files.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root
$node = (Get-Command node.exe -ErrorAction Stop).Source
$major = [int]((& $node --version).TrimStart('v').Split('.')[0])
if ($major -lt 22) { throw 'Install Node.js 22.5 or later before building.' }
$dist = Join-Path $root 'dist'
if (Test-Path $dist) { Remove-Item $dist -Recurse -Force }
New-Item -ItemType Directory -Path $dist | Out-Null
Copy-Item $node (Join-Path $dist 'node.exe')
Copy-Item (Join-Path $root 'server') (Join-Path $dist 'server') -Recurse
Copy-Item (Join-Path $root 'public') (Join-Path $dist 'public') -Recurse
Copy-Item (Join-Path $root 'README.md') (Join-Path $dist 'README.md')
$source = @'
using System;
using System.Diagnostics;
using System.IO;
using System.Threading;
using System.Windows.Forms;
public class Program {
  static Process backend, frontend;
  static string Dir { get { return AppDomain.CurrentDomain.BaseDirectory; } }
  static Process Start(string script, string data) {
    var info = new ProcessStartInfo(Path.Combine(Dir,"node.exe"), "\"" + Path.Combine(Dir,"server",script) + "\"");
    info.WorkingDirectory=Dir;
    info.UseShellExecute=false;
    info.CreateNoWindow=true;
    info.EnvironmentVariables["ISP_DATA_DIR"]=data;
    info.EnvironmentVariables["ISP_SERVER_PORT"]="3000";
    info.EnvironmentVariables["ISP_FRONTEND_PORT"]="3001";
    return Process.Start(info);
  }
  [STAThread] public static void Main() {
    string data=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"ISP-Inventory","data");
    Directory.CreateDirectory(data);
    try {
      backend=Start("index.js",data);
      frontend=Start("frontend.js",data);
      Thread.Sleep(1600);
      if (backend.HasExited || frontend.HasExited) throw new Exception("A server could not start. Check whether ports 3000/3001 are in use.");
      Process.Start(new ProcessStartInfo("http://127.0.0.1:3001") { UseShellExecute=true });
      MessageBox.Show("ISP Inventory is running in your browser.\n\nClick OK to stop the application.\nYour database is stored in:\n"+data,"ISP Inventory",MessageBoxButtons.OK,MessageBoxIcon.Information);
    } catch (Exception ex) { MessageBox.Show(ex.Message,"ISP Inventory error",MessageBoxButtons.OK,MessageBoxIcon.Error); }
    finally { try { if (frontend!=null&&!frontend.HasExited) frontend.Kill(); } catch {} try { if (backend!=null&&!backend.HasExited) backend.Kill(); } catch {} }
  }
}
'@
Add-Type -TypeDefinition $source -ReferencedAssemblies 'System.Windows.Forms' -OutputAssembly (Join-Path $dist 'ISP-Inventory.exe') -OutputType WindowsApplication
Write-Host "Built: $dist\ISP-Inventory.exe" -ForegroundColor Green
Write-Host 'Keep node.exe, server/ and public/ next to the EXE. Copy the entire dist folder to the destination PC.'
Write-Host 'Existing databases: copy your old data folder to %LOCALAPPDATA%\ISP-Inventory\data before launching.'
