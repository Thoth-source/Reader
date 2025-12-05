Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Reader App - GitHub Setup Script" -ForegroundColor Cyan
Write-Host "  Account: Thoth-source" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if Git is installed
Write-Host "Checking for Git..." -ForegroundColor Yellow
try {
    $gitVersion = git --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Git found: $gitVersion" -ForegroundColor Green
    } else {
        throw "Git not found"
    }
} catch {
    Write-Host "ERROR: Git is not installed or not in PATH!" -ForegroundColor Red
    Write-Host "Please install Git for Windows from: https://git-scm.com/download/win" -ForegroundColor Yellow
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Set variables
$GITHUB_USERNAME = "Thoth-source"
$GITHUB_EMAIL = "readerappdev@proton.me"
$REPO_NAME = "Reader"
$SSH_KEY_PATH = "$env:USERPROFILE\.ssh\reader_github_key"

# Step 1: Create .ssh directory
Write-Host ""
Write-Host "[1/6] Creating .ssh directory..." -ForegroundColor Yellow
if (-not (Test-Path "$env:USERPROFILE\.ssh")) {
    New-Item -ItemType Directory -Path "$env:USERPROFILE\.ssh" -Force | Out-Null
    Write-Host "SSH directory created." -ForegroundColor Green
} else {
    Write-Host "SSH directory already exists." -ForegroundColor Gray
}

# Step 2: Generate SSH key
Write-Host ""
Write-Host "[2/6] Generating SSH key..." -ForegroundColor Yellow
if (Test-Path "$SSH_KEY_PATH") {
    Write-Host "SSH key already exists, skipping..." -ForegroundColor Gray
} else {
    try {
        ssh-keygen -t ed25519 -C "$GITHUB_EMAIL" -f "$SSH_KEY_PATH" -N '""' -q
        if ($LASTEXITCODE -eq 0) {
            Write-Host "SSH key generated!" -ForegroundColor Green
        } else {
            throw "ssh-keygen failed"
        }
    } catch {
        Write-Host "ERROR: Failed to generate SSH key!" -ForegroundColor Red
        Write-Host "Press any key to exit..."
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        exit 1
    }
}

# Step 3: Configure SSH
Write-Host ""
Write-Host "[3/6] Configuring SSH..." -ForegroundColor Yellow
$sshConfigPath = "$env:USERPROFILE\.ssh\config"
$configEntry = @"

# Reader App - GitHub Account
Host github-reader
    HostName github.com
    User git
    IdentityFile ~/.ssh/reader_github_key
    IdentitiesOnly yes
"@

# Check if entry already exists
$configContent = ""
if (Test-Path $sshConfigPath) {
    $configContent = Get-Content $sshConfigPath -Raw
}

if ($configContent -notmatch "github-reader") {
    Add-Content -Path $sshConfigPath -Value $configEntry
    Write-Host "SSH config updated!" -ForegroundColor Green
} else {
    Write-Host "SSH config already contains github-reader entry." -ForegroundColor Gray
}

# Step 4: Display public key
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "[4/6] YOUR SSH PUBLIC KEY (copy this):" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
$publicKey = Get-Content "$SSH_KEY_PATH.pub"
Write-Host $publicKey -ForegroundColor Yellow
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANT: Copy the key above and add it to GitHub:" -ForegroundColor Yellow
Write-Host "  1. Go to: https://github.com/settings/keys" -ForegroundColor White
Write-Host "  2. Click 'New SSH key'" -ForegroundColor White
Write-Host "  3. Title: 'Reader App'" -ForegroundColor White
Write-Host "  4. Paste the key and click 'Add SSH key'" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to continue after adding the key to GitHub..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
Write-Host ""

# Step 5: Initialize Git repo
Write-Host "[5/6] Initializing Git repository..." -ForegroundColor Yellow
$repoPath = $PSScriptRoot
Set-Location $repoPath

if (Test-Path ".git") {
    Write-Host "Git repo already exists, updating config..." -ForegroundColor Gray
} else {
    git init
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to initialize Git repository!" -ForegroundColor Red
        Write-Host "Press any key to exit..."
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        exit 1
    }
    Write-Host "Git repo initialized!" -ForegroundColor Green
}

# Set Git config
git config user.name "$GITHUB_USERNAME"
git config user.email "$GITHUB_EMAIL"
Write-Host "Git config set for $GITHUB_USERNAME" -ForegroundColor Green

# Step 6: Setup remote
Write-Host ""
Write-Host "[6/6] Setting up remote..." -ForegroundColor Yellow
git remote remove origin 2>$null
git remote add origin "git@github-reader:$GITHUB_USERNAME/$REPO_NAME.git"
Write-Host "Remote configured!" -ForegroundColor Green

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Before pushing, make sure you:" -ForegroundColor Yellow
Write-Host "  1. Created the repo on GitHub (https://github.com/new)" -ForegroundColor White
Write-Host "     - Name: $REPO_NAME" -ForegroundColor White
Write-Host "     - Do NOT initialize with README" -ForegroundColor White
Write-Host "  2. Added the SSH key to GitHub (shown above)" -ForegroundColor White
Write-Host ""
Write-Host "Then run: push-to-github.ps1" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
