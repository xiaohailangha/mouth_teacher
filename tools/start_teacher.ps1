param([switch]$Restart,[switch]$Lan)
$ErrorActionPreference = 'Stop'
$servicePort = if ($env:PORT) { [int]$env:PORT } else { 8787 }
$listener = Get-NetTCPConnection -LocalPort $servicePort -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($listener) {
  try { $running = Invoke-RestMethod -Uri "http://127.0.0.1:$servicePort/api/status" -TimeoutSec 3 } catch { throw "Port $servicePort is occupied by an unrecognized service." }
  if ($running.application -ne 'mouth-teacher') { throw "Port $servicePort is occupied by an unrecognized service. Stop the old teacher terminal first." }
  if (-not $Restart) { Write-Host "Teacher already running: http://127.0.0.1:$servicePort . Use -Restart after changing configuration."; return }
  Stop-Process -Id $listener.OwningProcess -ErrorAction Stop
}
$projectDir = Split-Path $PSScriptRoot -Parent
$env:TEACHER_LAN = if ($Lan) { '1' } else { '0' }
$configFile = Join-Path $env:LOCALAPPDATA 'MouthTeacher\speech.json'
if (Test-Path -LiteralPath $configFile) {
  $settings = Get-Content -Raw -LiteralPath $configFile | ConvertFrom-Json
  $secureKey = ConvertTo-SecureString $settings.protectedKey
  $credential = New-Object System.Net.NetworkCredential('', $secureKey)
  $env:AZURE_SPEECH_KEY = $credential.Password
  $env:AZURE_SPEECH_REGION = $settings.region
  $env:AZURE_SPEECH_VOICE = $settings.voice
  $env:AZURE_SPEECH_ROLE = $settings.role
  $env:AZURE_SPEECH_STYLE = $settings.style
}
if (-not $env:AZURE_SPEECH_PROXY) {
  $internetSettings = Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings' -ErrorAction SilentlyContinue
  if ($internetSettings.ProxyEnable -eq 1 -and $internetSettings.ProxyServer -match '^(?:https?=)?([A-Za-z0-9.-]+):(\d{1,5})$') {
    $env:AZURE_SPEECH_PROXY = "$($Matches[1]):$($Matches[2])"
    Write-Host "Azure Speech proxy: $env:AZURE_SPEECH_PROXY"
  }
}
try {
  Push-Location (Join-Path $projectDir 'runtime')
  if (!(Test-Path 'node_modules')) { & npm.cmd ci --no-audit --no-fund; if ($LASTEXITCODE) { throw 'npm ci failed' } }
  & node server.mjs
} finally {
  Pop-Location
  Remove-Item Env:AZURE_SPEECH_KEY -ErrorAction SilentlyContinue
  Remove-Item Env:AZURE_SPEECH_PROXY -ErrorAction SilentlyContinue
  Remove-Item Env:AZURE_SPEECH_ROLE -ErrorAction SilentlyContinue
  Remove-Item Env:AZURE_SPEECH_STYLE -ErrorAction SilentlyContinue
  Remove-Item Env:TEACHER_LAN -ErrorAction SilentlyContinue
}
