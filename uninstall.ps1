[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$dshRoot = Join-Path $env:USERPROFILE '.dsh'
$profile = Join-Path $dshRoot 'profiles\web'
$pluginStore = Join-Path $dshRoot 'plugins\skk-gal'
$profilePackage = Join-Path $profile 'package.json'

if (Test-Path -LiteralPath $profilePackage) {
  $json = Get-Content -LiteralPath $profilePackage -Raw | ConvertFrom-Json
  if ($null -ne $json.dependencies) { $json.dependencies.PSObject.Properties.Remove('skk-gal') }
  if ($null -ne $json.dsh.profile.bundles) { $json.dsh.profile.bundles = @($json.dsh.profile.bundles | Where-Object { $_ -ne 'skk-gal' }) }
  $jsonText = $json | ConvertTo-Json -Depth 20
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($profilePackage, $jsonText, $utf8NoBom)
  Push-Location $profile
  try { npm install --ignore-scripts } finally { Pop-Location }
}
if (Test-Path -LiteralPath $pluginStore) { Remove-Item -LiteralPath $pluginStore -Recurse -Force }
Write-Host 'skk-gal uninstalled.' -ForegroundColor Green
