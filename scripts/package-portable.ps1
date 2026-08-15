[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$dist = Join-Path $root 'dist'
$stage = Join-Path $dist 'skk-gal'
$zip = Join-Path $dist 'skk-gal-portable.zip'
New-Item -ItemType Directory -Force -Path $dist | Out-Null
if (Test-Path -LiteralPath $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
if (Test-Path -LiteralPath $zip) { Remove-Item -LiteralPath $zip -Force }
New-Item -ItemType Directory -Force -Path $stage | Out-Null
$items = @('.dsh-plugin','assets','scripts','tests','package.json','cordis.patch.yml','install.ps1','uninstall.ps1','README.md','CONFIGURATION.md','LICENSE')
foreach ($item in $items) { Copy-Item -LiteralPath (Join-Path $root $item) -Destination $stage -Recurse -Force }
Compress-Archive -LiteralPath $stage -DestinationPath $zip -CompressionLevel Optimal
Write-Host 'Portable package created:'
Write-Host $zip
