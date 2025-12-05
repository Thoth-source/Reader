# GitHub Setup for Reader App

**Account:** Thoth-source  
**Email:** readerappdev@proton.me  
**Repository:** https://github.com/Thoth-source/Reader

---

## Quick Setup (Automated)

**Right-click** on `setup-github.ps1` and select **"Run with PowerShell"**, or open PowerShell and run:
```powershell
.\setup-github.ps1
```

This will:
1. Generate SSH key
2. Configure SSH for this GitHub account
3. Initialize Git repository
4. Set up remote

---

## Manual Steps Required

### 1. Create Repository on GitHub

1. Go to https://github.com/new
2. Repository name: `Reader`
3. Description: `A beautiful EPUB/PDF reader with AI TTS and audiobook creation`
4. Choose Public or Private
5. **Do NOT** initialize with README
6. Click "Create repository"

### 2. Add SSH Key to GitHub

1. Go to https://github.com/settings/keys
2. Click "New SSH key"
3. Title: `Reader App`
4. Paste the key shown by setup-github.ps1
5. Click "Add SSH key"

### 3. Push Code

**Right-click** on `push-to-github.ps1` and select **"Run with PowerShell"**, or open PowerShell and run:
```powershell
.\push-to-github.ps1
```

Or manually:
```powershell
git add .
git commit -m "Initial commit: Reader app"
git push -u origin main
```

---

## Future Updates

To push updates, just run:
```powershell
.\push-to-github.ps1
```

Or:
```powershell
git add .
git commit -m "Your message"
git push
```

---

## Troubleshooting

**"Permission denied (publickey)"**
- Make sure SSH key is added to GitHub
- Run: `ssh -T git@github-reader` to test

**"Repository not found"**
- Create the repo on GitHub first
- Check remote: `git remote -v`

**"Updates were rejected"**
- Run: `git pull origin main --rebase`
- Then push again
