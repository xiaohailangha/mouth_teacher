$ErrorActionPreference = 'Stop'
# DPAPI encrypts for the current Windows user. Never put the key in source/chat.
$configDir = Join-Path $env:LOCALAPPDATA 'MouthTeacher'
New-Item -ItemType Directory -Force -Path $configDir | Out-Null
$configFile = Join-Path $configDir 'speech.json'
$previous = if (Test-Path -LiteralPath $configFile) { Get-Content -Raw -LiteralPath $configFile | ConvertFrom-Json } else { $null }
$defaultRegion = if ($previous) { $previous.region } else { 'eastasia' }
$defaultVoice = if ($previous) { $previous.voice } else { 'zh-CN-YunxiNeural' }
$region = Read-Host "Azure Speech region [$defaultRegion] (Enter to keep)"
$voice = Read-Host "Mandarin voice [$defaultVoice] (Enter to keep)"
if ([string]::IsNullOrWhiteSpace($region)) { $region = $defaultRegion }
if ([string]::IsNullOrWhiteSpace($voice)) { $voice = $defaultVoice }
if ($region -notmatch '^[a-z0-9]+$' -or $voice -notmatch '^zh-CN-[A-Za-z0-9-]+$') { throw 'Invalid region or voice name' }
Write-Host 'Reading Azure Key 1 from the clipboard...'
$keyText = Get-Clipboard -Raw
if ([string]::IsNullOrWhiteSpace($keyText)) { throw "Clipboard is empty. Click the Copy icon next to Azure Key 1 and rerun this script." }
$keyText = $keyText.Trim()
if ($keyText.Length -lt 32 -or $keyText -cnotmatch '^[A-Za-z0-9+/=]+$') { throw "Clipboard does not contain a complete Azure Speech key (length $($keyText.Length); key must contain ASCII letters, digits, +, /, or = only). Click the Copy icon next to Azure Key 1 and rerun this script." }
$speechSecret = ConvertTo-SecureString $keyText -AsPlainText -Force
$keyText = $null
$encrypted = ConvertFrom-SecureString $speechSecret
$role = if ($voice -eq 'zh-CN-YunxiNeural') { 'Boy' } elseif ($previous -and $voice -eq $previous.voice) { $previous.role } else { '' }
$style = if ($voice -eq 'zh-CN-YunxiNeural') { 'cheerful' } elseif ($previous -and $voice -eq $previous.voice) { $previous.style } else { '' }
@{ region=$region; voice=$voice; role=$role; style=$style; protectedKey=$encrypted } | ConvertTo-Json | Set-Content -Encoding utf8 $configFile
try {
    # Windows PowerShell 5.1 rejects an empty string; overwrite the copied key instead.
    Set-Clipboard -Value ' ' -ErrorAction Stop
    Write-Host 'Saved with Windows DPAPI; clipboard overwritten. Run tools/start_teacher.ps1 -Restart to apply. Connection is not yet verified.'
} catch {
    Write-Warning 'Config saved, but clipboard could not be overwritten. Clear it manually.'
}
