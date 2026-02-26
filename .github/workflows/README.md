# GitHub Actions Workflows

This directory contains automated CI/CD workflows for Prokcy.

## Workflows

### 1. CI Workflow (`.github/workflows/ci.yml`)
**Trigger:** Push to `main`/`develop` branches, or pull requests

**Jobs:**
- **Lint:** TypeScript type checking and ESLint
- **Test:** Run test suite
- **Build Check:** Verify builds on all platforms (macOS, Windows, Linux)

**Purpose:** Continuous integration to catch errors early

### 2. Build Workflow (`.github/workflows/build.yml`)
**Trigger:** Push to `main` branch, pull requests to `main`, or manual workflow dispatch

**Jobs:**
- **Build:** Builds application for all platforms (macOS, Windows, Linux)

**Artifacts:** Uploads built executables as GitHub artifacts (30-day retention)

**Purpose:** Automated building and artifact generation

### 3. Release Workflow (`.github/workflows/release.yml`)
**Trigger:** Push tags matching `v*` (e.g., `v1.5.6`)

**Jobs:**
- **Release:** Builds and publishes GitHub releases for all platforms

**Purpose:** Automated release creation with binaries

## How to Use

### Creating a New Release

1. **Update version in package.json:**
   ```bash
   npm version patch  # or minor, or major
   ```

2. **Push the tag:**
   ```bash
   git push --tags
   ```

3. **GitHub Actions will:**
   - Detect the new tag (e.g., `v1.5.6`)
   - Build the application for macOS, Windows, and Linux
   - Create a draft GitHub release
   - Upload all platform-specific binaries

4. **Review and publish:**
   - Go to the Releases page on GitHub
   - Review the draft release
   - Add release notes if needed
   - Publish the release

### Manual Workflow Dispatch

You can also trigger builds manually from the GitHub Actions tab:

1. Go to **Actions** tab
2. Select **Build** workflow
3. Click **Run workflow**
4. Select branch

## Platform-Specific Builds

### macOS
- Output: `.dmg` and `.zip` files
- Architecture: Universal (Intel + Apple Silicon)

### Windows
- Output: `.exe` installer
- Architecture: x64

### Linux
- Output: `.AppImage` file
- Architecture: x64 and arm64

## Secrets Required

The workflows use GitHub's built-in `GITHUB_TOKEN`, which is automatically provided. No additional secrets configuration is needed.

## Artifacts

Built artifacts are stored as GitHub Actions artifacts with 30-day retention. For permanent storage, create a GitHub release.

## Troubleshooting

### Build Failures
- Check the Actions tab for detailed logs
- Ensure all dependencies are properly installed
- Verify TypeScript compilation succeeds locally first

### Release Not Created
- Ensure tag follows semver format: `v1.5.6`
- Check that the workflow has permissions to create releases
- Verify the `publish` configuration in package.json

### Platform-Specific Issues
- macOS builds require macOS runner
- Windows builds may have different path handling
- Linux builds use AppImage format for portability
