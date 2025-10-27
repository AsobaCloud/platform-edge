# Platform-Edge Sync Strategy

## Overview

This document outlines the strategy for keeping the platform-edge repository synchronized with the main platform repository while maintaining edge-specific optimizations.

## Core Principle

**The forecastingApi service code should be identical between both repositories.** Only the deployment configuration, Dockerfiles, and edge-specific optimizations should differ.

## Sync Strategy

### 1. Source of Truth
- **Main Platform Repo**: Source of truth for all service code
- **Platform-Edge Repo**: Edge-specific deployment configurations only

### 2. Synchronization Approach

#### Recommended: Selective File Sync
- Sync only specific service files from main repo
- Edge-specific files remain in platform-edge repo
- Automated sync scripts with validation
- No submodules needed

#### Alternative: Git Submodules (Not Recommended)
- Would include entire platform repo
- Overkill for single service sync
- More complex to manage

## Implementation

### Recommended: Selective File Sync

```bash
# Sync specific service files
./scripts/sync-services.sh

# This copies only the needed files from main repo
# Edge-specific files are preserved
```

### Directory Structure
```
platform-edge/
├── services/
│   └── forecastingApi/         # Mixed: synced + edge-specific
│       ├── app.py              # SYNCED from main repo
│       ├── utils/              # SYNCED from main repo
│       ├── Dockerfile          # EDGE-SPECIFIC
│       ├── docker-compose.yml  # EDGE-SPECIFIC
│       └── requirements.txt    # EDGE-SPECIFIC (ARM64 optimized)
├── config/                     # Edge-specific configuration
├── scripts/                    # Edge deployment scripts
└── docs/                       # Edge-specific documentation
```

## Sync Process

### 1. Daily Sync (Automated)
```bash
# Update submodule to latest main branch
git submodule update --remote platform-services

# Check for changes
git status

# If changes exist, create PR for review
```

### 2. Weekly Sync (Manual Review)
```bash
# Review changes in main repo
git log --oneline platform-services

# Update to specific commit if needed
cd platform-services
git checkout <commit-hash>
cd ..
git add platform-services
git commit -m "Update to platform-services commit <hash>"
```

### 3. Emergency Sync (Hotfix)
```bash
# Immediate sync for critical fixes
git submodule update --remote platform-services
git add platform-services
git commit -m "Emergency sync: <reason>"
git push
```

## Validation

### Pre-Sync Checks
1. Verify no local modifications to service code
2. Check that edge-specific files are preserved
3. Validate Docker builds still work
4. Run tests to ensure functionality

### Post-Sync Checks
1. Build edge containers successfully
2. Run integration tests
3. Verify API endpoints work
4. Check performance benchmarks

## Edge-Specific Files

These files should remain in platform-edge and NOT be synced:

### Service-Specific
- `services/forecastingApi/Dockerfile`
- `services/forecastingApi/Dockerfile.dev`
- `services/forecastingApi/docker-compose.yml`
- `services/forecastingApi/requirements.txt` (edge-optimized)

### Platform-Specific
- `docker-compose.yml`
- `docker-compose.dev.yml`
- `config/` directory
- `scripts/` directory
- `docs/` directory

## Automation

### GitHub Actions
```yaml
name: Sync Platform Services
on:
  schedule:
    - cron: '0 6 * * *'  # Daily at 6 AM
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          submodules: recursive
          token: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Update submodule
        run: |
          git submodule update --remote platform-services
          git add platform-services
          git commit -m "Auto-sync: $(date)" || exit 0
          git push
```

### Local Scripts
```bash
# scripts/sync-services.sh
#!/bin/bash
set -e

echo "Syncing platform services..."

# Update submodule
git submodule update --remote platform-services

# Check for changes
if git diff --quiet platform-services; then
    echo "No changes to sync"
    exit 0
fi

# Validate sync
./scripts/validate-sync.sh

# Commit changes
git add platform-services
git commit -m "Sync platform services: $(date)"
git push

echo "Sync completed successfully"
```

## Best Practices

### 1. Never Modify Service Code Locally
- All service code changes must go through main platform repo
- Edge-specific changes go in separate files (Dockerfile, config, etc.)

### 2. Regular Sync Schedule
- Daily automated sync
- Weekly manual review
- Immediate sync for critical fixes

### 3. Validation Pipeline
- Automated tests on sync
- Build validation
- Performance regression testing

### 4. Documentation
- Keep sync strategy documented
- Document any edge-specific modifications
- Maintain changelog of sync events

## Troubleshooting

### Common Issues

1. **Merge Conflicts**: Resolve in main repo, then sync
2. **Build Failures**: Check edge-specific dependencies
3. **Test Failures**: Verify edge environment setup
4. **Performance Issues**: Check ARM64 optimizations

### Recovery

```bash
# Reset to last known good state
git checkout <last-known-good-commit>
git submodule update --init --recursive

# Force sync from main repo
git submodule update --remote --force platform-services
```

## Monitoring

### Sync Status
- Track last sync timestamp
- Monitor for sync failures
- Alert on build/test failures

### Performance Tracking
- Monitor edge performance vs main repo
- Track any performance regressions
- Maintain performance baselines