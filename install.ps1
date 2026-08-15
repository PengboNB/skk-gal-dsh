[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$source = Split-Path -Parent $MyInvocation.MyCommand.Path
$dshRoot = Join-Path $env:USERPROFILE '.dsh'
$profile = Join-Path $dshRoot 'profiles\web'
$pluginStore = Join-Path $dshRoot 'plugins\skk-gal'
$profilePackage = Join-Path $profile 'package.json'

if (-not (Test-Path -LiteralPath $profilePackage)) {
  throw "DSH Web profile not found: $profilePackage. Run npx @deepseek-ai/dsh web once first."
}

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $pluginStore) | Out-Null
if (Test-Path -LiteralPath $pluginStore) {
  Remove-Item -LiteralPath $pluginStore -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $pluginStore | Out-Null
$runtimeItems = @('.dsh-plugin', 'assets', 'package.json', 'cordis.patch.yml', 'README.md', 'CONFIGURATION.md', 'LICENSE')
foreach ($item in $runtimeItems) {
  $itemPath = Join-Path $source $item
  if (-not (Test-Path -LiteralPath $itemPath)) { throw "Plugin file missing: $itemPath" }
  Copy-Item -LiteralPath $itemPath -Destination $pluginStore -Recurse -Force
}

$json = Get-Content -LiteralPath $profilePackage -Raw | ConvertFrom-Json
if ($null -eq $json.dependencies) { $json | Add-Member -NotePropertyName dependencies -NotePropertyValue ([pscustomobject]@{}) }
$json.dependencies | Add-Member -NotePropertyName 'skk-gal' -NotePropertyValue 'file:../../plugins/skk-gal' -Force
if ($null -eq $json.dsh.profile.bundles) { throw 'DSH profile bundles configuration is missing.' }
$bundles = @($json.dsh.profile.bundles)
if ($bundles -notcontains 'skk-gal') { $json.dsh.profile.bundles = @($bundles + 'skk-gal') }
$jsonText = $json | ConvertTo-Json -Depth 20
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($profilePackage, $jsonText, $utf8NoBom)

Push-Location $profile
try {
  npm install --ignore-scripts
  if ($LASTEXITCODE -ne 0) { throw "npm install failed with exit code $LASTEXITCODE" }
} finally {
  Pop-Location
}

Write-Host ''
Write-Host 'skk-gal installed. Restart DSH with:' -ForegroundColor Green
Write-Host '  npx @deepseek-ai/dsh web'
Write-Host 'Then select the Skirk Theater conversation tab.'
