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
- **Build:** Builds release artifacts for all platforms
- **Release:** Creates a GitHub release from uploaded artifacts

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
   - Create a GitHub release
   - Upload all platform-specific binaries

4. **Review and publish:**
   - Go to the Releases page on GitHub
   - Verify binaries and release notes

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

The workflows use GitHub's built-in `GITHUB_TOKEN`, which is automatically provided for repository access and release uploads.

For macOS only:
- Unsigned artifacts need no extra secrets
- Signed and notarized artifacts require Apple Developer credentials such as `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID`

The current workflows explicitly disable auto-discovered signing identities on macOS when those credentials are not configured, so the release produces unsigned artifacts instead of broken ad-hoc signed bundles.

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
- Verify the `release` job completed successfully in the Release workflow

### Platform-Specific Issues
- macOS builds require macOS runner
- Signed/notarized macOS distribution requires Apple Developer credentials
- Windows builds may have different path handling
- Linux builds use AppImage format for portability
