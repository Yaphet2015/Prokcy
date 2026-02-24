# GitHub Actions Setup Guide

This guide will help you set up automated builds and releases for Prokcy using GitHub Actions.

## 📋 What's Been Configured

Three GitHub Actions workflows have been created in `.github/workflows/`:

### 1. **CI Workflow** (`ci.yml`)
- **Runs on:** Every push to `main`/`develop` and pull requests
- **Does:** Type checking, linting, tests, and build verification
- **Purpose:** Catch errors early before they reach production

### 2. **Build Workflow** (`build.yml`)
- **Runs on:** Push to `main`, tags, or manual trigger
- **Does:** Builds for macOS, Windows, and Linux
- **Purpose:** Create build artifacts automatically

### 3. **Release Workflow** (`release.yml`)
- **Runs on:** Git tags like `v1.5.6`
- **Does:** Builds and creates GitHub releases
- **Purpose:** Automated release publishing

## 🚀 Quick Start

### Option 1: Automatic Release (Recommended)

1. **Update the version:**
   ```bash
   npm version patch  # or minor, or major
   ```
   This updates `package.json` and creates a git tag.

2. **Push to GitHub:**
   ```bash
   git push && git push --tags
   ```

3. **Wait for the build:**
   - GitHub Actions will start automatically
   - Builds for all 3 platforms (macOS, Windows, Linux)
   - Creates a draft release with all binaries

4. **Publish the release:**
   - Go to: https://github.com/Yaphet2015/Prokcy/releases
   - Find the draft release
   - Review and add release notes
   - Click "Publish release"

### Option 2: Manual Build Trigger

1. Go to: https://github.com/Yaphet2015/Prokcy/actions
2. Click on "Build" or "Release" workflow
3. Click "Run workflow"
4. Select the branch and click "Run workflow"

## 📦 What Gets Built

Each release includes:

### macOS
- **Format:** `.dmg` disk image
- **Architecture:** Universal (Intel + Apple Silicon)
- **File:** `Prokcy-v1.5.5-mac-arm64.dmg` / `Prokcy-v1.5.5-mac-x64.dmg`

### Windows
- **Format:** `.exe` installer
- **Architecture:** x64
- **File:** `Prokcy-v1.5.5-win-x64.exe`

### Linux
- **Format:** `.AppImage` (portable executable)
- **Architecture:** x64 and arm64
- **File:** `Prokcy-v1.5.5-linux-x86_64.AppImage`

## 🔐 Permissions

The workflows use GitHub's built-in `GITHUB_TOKEN`, which automatically has:
- ✅ Repository read access
- ✅ Artifact write access
- ✅ Release creation access

**No additional secrets needed!**

## 📊 Workflow Status

You can monitor workflow runs at:
https://github.com/Yaphet2015/Prokcy/actions

Each workflow run shows:
- Build logs for each platform
- Success/failure status
- Artifacts (for Build workflow)
- Release creation (for Release workflow)

## 🛠️ Troubleshooting

### Build Fails on CI
```bash
# Test locally first
npm run build:lib
npm run build:react
npm run build:mac  # or build:win, build:linux
```

### Release Not Created
- Ensure tag format: `v1.5.6` (must start with `v`)
- Check Actions tab for error logs
- Verify `publish` config in `package.json`

### Platform-Specific Issues
- **macOS:** Needs macOS runner (automatic)
- **Windows:** Paths use backslashes
- **Linux:** Uses AppImage format

## 📝 Release Checklist

Before publishing a release:

- [ ] Version updated in `package.json`
- [ ] All tests passing locally
- [ ] TypeScript compiles without errors
- [ ] Changelog updated
- [ ] Git tag pushed
- [ ] GitHub Actions build succeeded
- [ ] Release notes reviewed
- [ ] Binaries tested (if possible)

## 🔗 Useful Links

- **Actions Dashboard:** https://github.com/Yaphet2015/Prokcy/actions
- **Releases Page:** https://github.com/Yaphet2015/Prokcy/releases
- **Workflow Logs:** https://github.com/Yaphet2015/Prokcy/commits/main

## 💡 Tips

1. **Draft Releases:** All releases are created as drafts by default
2. **Rollback:** Delete the release and tag, then create a new one
3. **Artifacts:** Build artifacts are kept for 30 days
4. **Notifications:** You'll get email notifications for workflow failures

## 🎯 Next Steps

1. **Test the workflow:** Push a small change to verify CI works
2. **Create a test release:** Use `npm version patch` to test the full release process
3. **Set up branch protection:** Require CI checks before merging (optional)
4. **Configure notifications:** Set up Slack/Discord webhooks (optional)

---

Need help? Check the detailed documentation in `.github/workflows/README.md`
