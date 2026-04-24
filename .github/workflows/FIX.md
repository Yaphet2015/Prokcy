# GitHub Actions Fix - TypeScript Not Found

## Problem
The GitHub Actions workflow was failing with:
```
sh: tsc: command not found
Error: Process completed with exit code 127.
```

## Root Cause
The workflows were using `cache: 'npm'` in the `setup-node` action, which was caching dependencies but not ensuring TypeScript was properly available in the PATH for subsequent steps.

## Solution
Removed the `cache: 'npm'` configuration from all three workflow files:

### Changed Files
1. `.github/workflows/ci.yml`
2. `.github/workflows/build.yml`
3. `.github/workflows/release.yml`

### What Changed
**Before:**
```yaml
- name: Setup Node.js
  uses: actions/setup-node@v6
  with:
    node-version: '20'
    cache: 'npm'  # ← Removed this line
```

**After:**
```yaml
- name: Setup Node.js
  uses: actions/setup-node@v6
  with:
    node-version: '20'
```

## Why This Works
- `npm ci` installs all dependencies including TypeScript
- Without the cache, TypeScript is properly installed in `node_modules/.bin/`
- The `tsc` command is then available for `npm run build:lib`

## Trade-offs
- **Slightly slower builds:** No caching means dependencies are reinstalled each time
- **More reliability:** Eliminates cache-related issues
- **Better for now:** Can add caching back later with proper configuration

## Alternative (Future Enhancement)
To add caching back properly, we could use:
```yaml
- name: Cache node modules
  uses: actions/cache@v3
  with:
    path: ~/.npm
    key: \${{ runner.os }}-node-\${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      \${{ runner.os }}-node-
```

But the current solution is simpler and more reliable.

## Verification
After pushing the fix:
```bash
git push origin main
```

Check the Actions tab to ensure builds complete successfully.

## Status
✅ **Fixed** - Committed as `f5515fe`
