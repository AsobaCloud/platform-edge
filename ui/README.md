# Edge Device Management UI

This directory contains the UI files for the Edge Device Management application.

## Files

### Core Files
- `edge-device-management.html` - Main application page
- `edge-device-ui.js` - UI management and interaction logic
- `edge-device-registry.js` - Device registry and discovery logic

### Shared Dependencies
- `config.js` - Configuration settings
- `services/SkinService.js` - Application skin/theming service (works standalone with localStorage)
- `includes/` - Common CSS, images, and assets

## Excluded Files

The following files are **NOT** synced as they require server connectivity:

- `services/AuthService.js` - Requires API endpoint, not suitable for offline client app

The client version should work without authentication, allowing access even when disconnected from the mothership platform.

## Syncing

These files are automatically synced from the main platform repository.
To manually sync, run:

```bash
./scripts/sync-edge-ui.sh
```

Or set the PLATFORM_EDGE_REPO environment variable:

```bash
PLATFORM_EDGE_REPO=/path/to/platform-edge ./scripts/sync-edge-ui.sh
```

## Note

Do not manually edit files in this directory. All changes should be made
in the main platform repository and then synced here.

After syncing, you may need to:
1. Remove AuthService script tag from edge-device-management.html
2. Remove or modify authentication checks for offline operation
3. Update config.js with client-specific values if needed
