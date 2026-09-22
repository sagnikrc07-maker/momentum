<#
.SYNOPSIS
    Cleans up old/preview deployments from GitHub while preserving the Production deployment.

.DESCRIPTION
    Queries the GitHub Deployments API for 'sagnikrc07-maker/momentum', keeps the active Production
    deployment safe, sets older/preview deployments to 'inactive', and permanently deletes them.

.PARAMETER Token
    GitHub Personal Access Token (classic with 'repo' / 'repo_deployment' scope, or fine-grained with Deployments read/write).
    If not specified, reads from $env:GITHUB_TOKEN or prompts securely.

.PARAMETER Repo
    Target repository in 'owner/repo' format. Defaults to 'sagnikrc07-maker/momentum'.

.PARAMETER DryRun
    If set, only inspects and lists deployments without deleting anything.

.EXAMPLE
    .\scripts\clean-deployments.ps1 -DryRun
    .\scripts\clean-deployments.ps1 -Token "ghp_yourTokenHere"
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$Token,

    [Parameter(Mandatory = $false)]
    [string]$Repo = "sagnikrc07-maker/momentum",

    [Parameter(Mandatory = $false)]
    [switch]$DryRun
)

# 1. Resolve Token
if (-not $Token) {
    if ($env:GITHUB_TOKEN) {
        $Token = $env:GITHUB_TOKEN
    } else {
        Write-Host "============================================================" -ForegroundColor Cyan
        Write-Host " GitHub Deployment Cleaner for $Repo" -ForegroundColor Cyan
        Write-Host "============================================================" -ForegroundColor Cyan
        Write-Host "Please enter your GitHub Personal Access Token (PAT)."
        Write-Host "Required scope: 'repo' or 'repo_deployment'."
        Write-Host "(Generate one at: https://github.com/settings/tokens)`n"
        $secureInput = Read-Host -Prompt "Enter GitHub PAT" -AsSecureString
        $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureInput)
        $Token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
        [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
    }
}

if (-not $Token) {
    Write-Error "A GitHub Personal Access Token is required to authenticate with the GitHub API."
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $Token"
    "Accept"        = "application/vnd.github.v3+json"
    "User-Agent"    = "Momentum-Deployment-Cleaner"
}

Write-Host "`n[1/3] Fetching deployments for $Repo..." -ForegroundColor Cyan

$deploymentsUri = "https://api.github.com/repos/$Repo/deployments?per_page=100"

try {
    $deployments = Invoke-RestMethod -Uri $deploymentsUri -Headers $headers -Method Get
} catch {
    Write-Error "Failed to fetch deployments. Check your token and repository permissions: $_"
    exit 1
}

if (-not $deployments -or $deployments.Count -eq 0) {
    Write-Host "No deployments found for $Repo. Nothing to clean!" -ForegroundColor Green
    exit 0
}

Write-Host "Found $($deployments.Count) total deployment(s).`n" -ForegroundColor Yellow

# Sort deployments by created_at descending (latest first)
$sortedDeployments = $deployments | Sort-Object { [DateTime]$_.created_at } -Descending

$productionDeployments = @()
$cleanupDeployments = @()
$latestProductionFound = $false

foreach ($dep in $sortedDeployments) {
    $envName = if ($dep.environment) { $dep.environment.ToString().Trim() } else { "unknown" }
    # Preserve the single latest active Production deployment
    if ($envName -match "^(?i)(production|prod)$" -and -not $latestProductionFound) {
        $productionDeployments += $dep
        $latestProductionFound = $true
    } else {
        # All older/previous deployments are marked for deletion
        $cleanupDeployments += $dep
    }
}

Write-Host "============================================================" -ForegroundColor DarkGray
Write-Host " Production Deployments (PRESERVED): $($productionDeployments.Count)" -ForegroundColor Green
foreach ($p in $productionDeployments) {
    Write-Host "   - [KEEP] ID: $($p.id) | Env: $($p.environment) | Created: $($p.created_at) | Ref: $($p.ref)" -ForegroundColor Green
}

Write-Host "`n Non-Production / Preview Deployments (TO DELETE): $($cleanupDeployments.Count)" -ForegroundColor Magenta
foreach ($c in $cleanupDeployments) {
    Write-Host "   - [DELETE] ID: $($c.id) | Env: $($c.environment) | Created: $($c.created_at) | Ref: $($c.ref)" -ForegroundColor DarkYellow
}
Write-Host "============================================================`n" -ForegroundColor DarkGray

if ($DryRun) {
    Write-Host "[DRY RUN] Completed. No deployments were modified or deleted." -ForegroundColor Cyan
    exit 0
}

if ($cleanupDeployments.Count -eq 0) {
    Write-Host "No preview or non-production deployments to clean up." -ForegroundColor Green
    exit 0
}

Write-Host "[2/3] Deleting $($cleanupDeployments.Count) non-production deployment(s)..." -ForegroundColor Cyan

$deletedCount = 0
$errorCount = 0

foreach ($dep in $cleanupDeployments) {
    $depId = $dep.id
    Write-Host "  -> Processing Deployment #$depId (Env: $($dep.environment))..." -NoNewline

    try {
        # Step A: Inactive status is required by GitHub before deletion
        $statusUri = "https://api.github.com/repos/$Repo/deployments/$depId/statuses"
        $statusBody = @{ state = "inactive" } | ConvertTo-Json
        $null = Invoke-RestMethod -Uri $statusUri -Headers $headers -Method Post -Body $statusBody -ContentType "application/json" -ErrorAction SilentlyContinue

        # Step B: Delete the deployment
        $deleteUri = "https://api.github.com/repos/$Repo/deployments/$depId"
        $null = Invoke-RestMethod -Uri $deleteUri -Headers $headers -Method Delete

        Write-Host " DELETED" -ForegroundColor Green
        $deletedCount++
    } catch {
        Write-Host " FAILED: $($_.Exception.Message)" -ForegroundColor Red
        $errorCount++
    }

    # Small delay to respect GitHub API rate limits
    Start-Sleep -Milliseconds 250
}

Write-Host "`n[3/3] Cleanup Complete!" -ForegroundColor Cyan
Write-Host "Summary: $deletedCount deleted, $errorCount errors, $($productionDeployments.Count) production deployment(s) preserved." -ForegroundColor Green
