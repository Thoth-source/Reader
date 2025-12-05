Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Pushing Reader to GitHub..." -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if Git is installed
try {
    $null = git --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Git not found"
    }
} catch {
    Write-Host "ERROR: Git is not installed or not in PATH!" -ForegroundColor Red
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Change to script directory
Set-Location $PSScriptRoot

# Check current branch and rename to main if needed
Write-Host "Checking branch..." -ForegroundColor Yellow
$currentBranch = git branch --show-current 2>&1
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($currentBranch)) {
    # No branch exists yet, create main
    Write-Host "Creating main branch..." -ForegroundColor Yellow
    git checkout -b main 2>&1 | Out-Null
} elseif ($currentBranch.Trim() -ne "main") {
    # Branch exists but isn't main, rename it
    Write-Host "Renaming branch from '$($currentBranch.Trim())' to 'main'..." -ForegroundColor Yellow
    git branch -M main
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to rename branch!" -ForegroundColor Red
        Write-Host "Press any key to exit..."
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        exit 1
    }
} else {
    Write-Host "Already on main branch." -ForegroundColor Green
}

# Add all files
Write-Host ""
Write-Host "Adding files..." -ForegroundColor Yellow
git add .
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to add files!" -ForegroundColor Red
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Check if there are changes to commit
$status = git status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "No changes to commit." -ForegroundColor Gray
} else {
    # Commit
    Write-Host ""
    $commitMsg = Read-Host "Enter commit message (or press Enter for default)"
    if ([string]::IsNullOrWhiteSpace($commitMsg)) {
        $commitMsg = "Initial commit: Reader app"
    }

    git commit -m "$commitMsg"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to commit!" -ForegroundColor Red
        Write-Host "Press any key to exit..."
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        exit 1
    }
    Write-Host "Committed successfully!" -ForegroundColor Green
}

# Push
Write-Host ""
Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
git push -u origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to push!" -ForegroundColor Red
    Write-Host "Make sure:" -ForegroundColor Yellow
    Write-Host "  1. The repository exists on GitHub" -ForegroundColor White
    Write-Host "  2. Your SSH key is added to GitHub" -ForegroundColor White
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Done! Check https://github.com/Thoth-source/Reader" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
