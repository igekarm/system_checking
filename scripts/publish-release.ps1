[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^\d+\.\d+\.\d+$')]
  [string]$Version,

  [string]$CommitMessage
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$releaseTag = "app-v$Version"

function Invoke-Checked {
  param(
    [Parameter(Mandatory = $true)][string]$FilePath,
    [Parameter(Mandatory = $true)][string[]]$ArgumentList
  )
  & $FilePath @ArgumentList
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed ($LASTEXITCODE): $FilePath $($ArgumentList -join ' ')"
  }
}

Set-Location -LiteralPath $repositoryRoot

if (-not (Test-Path -LiteralPath (Join-Path $repositoryRoot '.git'))) {
  throw "Release script must be located in the repository root."
}

$branch = (& git branch --show-current).Trim()
if ($LASTEXITCODE -ne 0 -or $branch -ne 'master') {
  throw "Release must be created from the master branch. Current branch: $branch"
}

Write-Host "Checking release version $Version..." -ForegroundColor Cyan
Invoke-Checked -FilePath 'git' -ArgumentList @('fetch', 'origin', '--tags')
$existingTag = [string](& git tag --list $releaseTag)
if (-not [string]::IsNullOrWhiteSpace($existingTag)) {
  throw "Tag $releaseTag already exists. Choose the next semantic version."
}

Write-Host "[1/7] Updating master..." -ForegroundColor Cyan
Invoke-Checked -FilePath 'git' -ArgumentList @('pull', '--ff-only', 'origin', 'master')

Write-Host "[2/7] Installing locked dependencies..." -ForegroundColor Cyan
Push-Location -LiteralPath (Join-Path $repositoryRoot 'JS_project')
try {
  Invoke-Checked -FilePath 'npm.cmd' -ArgumentList @('ci')

  Write-Host "[3/7] Running tests and production builds..." -ForegroundColor Cyan
  Invoke-Checked -FilePath 'npm.cmd' -ArgumentList @('run', 'check')
}
finally {
  Pop-Location
}

Write-Host "[4/7] Preparing project changes..." -ForegroundColor Cyan
Invoke-Checked -FilePath 'git' -ArgumentList @('add', '--', 'JS_project', '.github/workflows', 'scripts', 'docs', 'release.cmd')
Invoke-Checked -FilePath 'git' -ArgumentList @('diff', '--cached', '--check')

& git diff --cached --quiet
$hasStagedChanges = $LASTEXITCODE -eq 1
if ($LASTEXITCODE -notin 0, 1) {
  throw "Unable to inspect staged changes."
}

if ($hasStagedChanges) {
  if ([string]::IsNullOrWhiteSpace($CommitMessage)) {
    $CommitMessage = "Release DB Tools $Version"
  }
  Write-Host "[5/7] Creating commit: $CommitMessage" -ForegroundColor Cyan
  Invoke-Checked -FilePath 'git' -ArgumentList @('commit', '-m', $CommitMessage)
}
else {
  Write-Host "[5/7] No new files to commit; releasing current master." -ForegroundColor DarkGray
}

Write-Host "[6/7] Publishing master..." -ForegroundColor Cyan
Invoke-Checked -FilePath 'git' -ArgumentList @('pull', '--rebase', 'origin', 'master')
Invoke-Checked -FilePath 'git' -ArgumentList @('push', 'origin', 'master')

$localHead = (& git rev-parse HEAD).Trim()
$remoteHead = (& git rev-parse origin/master).Trim()
if ($localHead -ne $remoteHead) {
  throw "Local master does not match origin/master after push."
}

Write-Host "[7/7] Creating $releaseTag and starting GitHub Actions..." -ForegroundColor Cyan
Invoke-Checked -FilePath 'git' -ArgumentList @('tag', '-a', $releaseTag, '-m', "DB Tools $Version")
Invoke-Checked -FilePath 'git' -ArgumentList @('push', 'origin', $releaseTag)

Write-Host ""
Write-Host "Release $releaseTag has been started successfully." -ForegroundColor Green
Write-Host "Open: https://github.com/igekarm/system_checking/actions"
