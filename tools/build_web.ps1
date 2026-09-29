$ErrorActionPreference = 'Stop'
$projectDir = Split-Path $PSScriptRoot -Parent
$buildDir = Join-Path $env:LOCALAPPDATA 'MouthTeacher\web-build'
$env:GIT_CONFIG_COUNT='1'
$env:GIT_CONFIG_KEY_0='safe.directory'
$env:GIT_CONFIG_VALUE_0='D:/flutter'
Push-Location $projectDir
try {
  & 'D:\flutter\bin\flutter.bat' build web --output $buildDir
  if ($LASTEXITCODE) { throw 'Flutter build failed' }
  Write-Host "Built to $buildDir"
  Write-Host "Serve this directory on port 8844, and start tools/start_teacher.ps1 separately."
} finally { Pop-Location }
