# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a Chrome Manifest V3 extension that monitors HTTP traffic and alerts users when a **402 Payment Required** status code is detected. The extension uses a service worker architecture with a popup UI to display detected events.

## Architecture

### Core Components

- **Service Worker (`background.js`)**: Monitors all HTTP requests using `chrome.webRequest` API. Maintains an in-memory array of the last 50 detected 402 events. Handles badge updates, notifications, and communication with the popup.

- **Popup Interface (`popup.html`, `popup.js`, `popup.css`)**: Displays the list of detected 402 events with timestamps, HTTP methods, and URLs. Clears the badge indicator when opened.

- **Chrome APIs Used**:
  - `webRequest`: Intercepts and inspects HTTP responses
  - `notifications`: Creates system notifications for 402 detections
  - `action`: Controls extension badge and popup behavior
  - `runtime.onMessage`: Enables communication between service worker and popup

### Event Flow

1. Service worker listens for `webRequest.onCompleted` events across all URLs
2. When status code 402 is detected:
   - Event logged to in-memory array (max 50 entries)
   - Chrome notification created
   - Badge set to "!" with red background
   - Attempt to open popup (may fail due to browser security)
3. User clicks extension icon → popup opens
4. Popup requests events via `runtime.sendMessage`
5. Service worker responds with event array
6. Popup renders events and clears badge

## Development Commands

### Create Icon Placeholders
```bash
./create_icons.sh
```
Generates placeholder PNG files for the extension icons (16x16, 48x48, 128x128 pixels). Required before loading the extension.

### Load Extension in Chrome
1. Navigate to `chrome://extensions/`
2. Enable "Developer mode" (top-right toggle)
3. Click "Load unpacked"
4. Select this directory

### Reload After Changes
After modifying code, click the reload icon in `chrome://extensions/` for this extension, or use the keyboard shortcut `Cmd+R` (macOS) / `Ctrl+R` (Windows/Linux) while on the extensions page.

### Testing 402 Detection

Create a test server that returns 402 responses:

**Python (using Flask):**
```python
from flask import Flask
app = Flask(__name__)

@app.route('/test-402')
def test_402():
    return 'Payment Required', 402

app.run(port=5000)
```

**Node.js (using Express):**
```javascript
const express = require('express');
const app = express();

app.get('/test-402', (req, res) => {
    res.status(402).send('Payment Required');
});

app.listen(5000);
```

Then visit `http://localhost:5000/test-402` in Chrome to trigger the extension.

### Debugging

- **Service Worker Console**: Go to `chrome://extensions/`, find this extension, click "service worker" link under "Inspect views"
- **Popup Console**: Right-click the extension icon → Inspect popup
- Check `console.log` statements in both contexts

## Key Implementation Details

### Storage Limitations
- Events stored in memory only (not persisted)
- Cleared when browser/extension restarts
- Limited to 50 most recent events

### Permissions Required
- `webRequest`: Must be declared in manifest for HTTP monitoring
- `notifications`: Required for desktop notifications
- `<all_urls>`: Host permission needed to monitor all domains

### Chrome Manifest V3 Constraints
- Service workers replace persistent background pages
- Cannot always open popup programmatically (security restriction)
- Service worker may be terminated by Chrome when idle

## Modifying Detection Logic

To detect different HTTP status codes, modify `background.js`:

```javascript
if (details.statusCode === 402) {  // Change this condition
  // Detection logic
}
```

To monitor specific domains only, update the listener filter:

```javascript
chrome.webRequest.onCompleted.addListener(
  (details) => { /* ... */ },
  { urls: ["*://example.com/*", "*://api.example.com/*"] }  // Specific patterns
);
```

## Extension Packaging

To create a distributable package:
1. Zip the directory (exclude `.git`, `.DS_Store`, etc.)
2. Upload to Chrome Web Store Developer Dashboard
3. Or use Chrome CLI: `chrome --pack-extension=/path/to/extension`

## File Structure
```
.
├── manifest.json          # Extension configuration (Manifest V3)
├── background.js          # Service worker (monitors HTTP)
├── popup.html            # Popup UI structure
├── popup.js              # Popup logic and rendering
├── popup.css             # Popup styles
├── icon16.png            # Extension icon (16x16)
├── icon48.png            # Extension icon (48x48)
├── icon128.png           # Extension icon (128x128)
└── create_icons.sh       # Script to generate placeholder icons
```
