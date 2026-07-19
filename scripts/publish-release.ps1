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
    [Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments
  )
  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed ($LASTEXITCODE): $FilePath $($Arguments -join ' ')"
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

Write-Host "[1/7] Updating master..." -ForegroundColor Cyan
Invoke-Checked git pull --ff-only origin master

Write-Host "[2/7] Installing locked dependencies..." -ForegroundColor Cyan
Push-Location -LiteralPath (Join-Path $repositoryRoot 'JS_project')
try {
  Invoke-Checked npm.cmd ci

  Write-Host "[3/7] Running tests and production builds..." -ForegroundColor Cyan
  Invoke-Checked npm.cmd run check
}
finally {
  Pop-Location
}

Write-Host "[4/7] Preparing project changes..." -ForegroundColor Cyan
Invoke-Checked git add -- JS_project .github/workflows scripts docs release.cmd
Invoke-Checked git diff --cached --check

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
  Invoke-Checked git commit -m $CommitMessage
}
else {
  Write-Host "[5/7] No new files to commit; releasing current master." -ForegroundColor DarkGray
}

Write-Host "[6/7] Publishing master..." -ForegroundColor Cyan
Invoke-Checked git pull --rebase origin master
Invoke-Checked git push origin master
Invoke-Checked git fetch origin --tags

if ((& git tag --list $releaseTag).Trim()) {
  throw "Tag $releaseTag already exists. Choose the next semantic version."
}

& git ls-remote --exit-code --tags origin "refs/tags/$releaseTag" *> $null
if ($LASTEXITCODE -eq 0) {
  throw "Tag $releaseTag already exists on GitHub. Choose the next semantic version."
}
if ($LASTEXITCODE -ne 2) {
  throw "Unable to check release tag on GitHub."
}

$localHead = (& git rev-parse HEAD).Trim()
$remoteHead = (& git rev-parse origin/master).Trim()
if ($localHead -ne $remoteHead) {
  throw "Local master does not match origin/master after push."
}

Write-Host "[7/7] Creating $releaseTag and starting GitHub Actions..." -ForegroundColor Cyan
Invoke-Checked git tag -a $releaseTag -m "DB Tools $Version"
Invoke-Checked git push origin $releaseTag

Write-Host ""
Write-Host "Release $releaseTag has been started successfully." -ForegroundColor Green
Write-Host "Open: https://github.com/igekarm/system_checking/actions"
