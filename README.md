# HTTP 402 Alert Chrome Extension

A Chrome extension that automatically detects and alerts you whenever a **402 Payment Required** HTTP status code is encountered during web browsing.

## Features

- 🔔 Real-time detection of HTTP 402 status codes
- 📱 Browser notifications when 402 responses are detected
- 📊 Popup window showing all recent 402 events
- 🎯 Badge indicator on extension icon
- 📝 Event history with timestamps, URLs, and HTTP methods

## Installation

### Option 1: Load Unpacked (Development)

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right corner)
4. Click "Load unpacked"
5. Select the extension directory
6. The extension icon should appear in your Chrome toolbar

### Option 2: Create Icons First

Before loading the extension, you'll need to create placeholder icons. You can:
- Use any PNG image and name it as `icon16.png`, `icon48.png`, and `icon128.png`
- Or create simple placeholder images using an online tool
- Or comment out the icon references in `manifest.json` temporarily

## Usage

1. Once installed, the extension runs automatically in the background
2. When a 402 HTTP status code is detected:
   - A browser notification appears
   - The extension icon shows a red badge with "!"
   - The popup automatically opens (if possible)
3. Click the extension icon to view all detected 402 events
4. Click "Clear Notifications" to dismiss the badge

## How It Works

The extension uses Chrome's `webRequest` API to monitor all HTTP requests and responses. When a response with status code 402 is detected:

1. The event is logged with timestamp, URL, and HTTP method
2. A notification is displayed to the user
3. The extension badge is updated
4. The event is stored in memory (last 50 events)

## Permissions

The extension requires the following permissions:

- `webRequest`: To monitor HTTP responses
- `notifications`: To show desktop notifications
- `<all_urls>`: To detect 402 responses from any domain

## Development

The extension consists of:

- `manifest.json`: Extension configuration
- `background.js`: Service worker that monitors HTTP requests
- `popup.html`: Popup UI structure
- `popup.js`: Popup logic and event display
- `popup.css`: Popup styling

## Testing

To test the extension, you'll need a server that returns 402 status codes. You can:

1. Create a simple test server
2. Use a tool like `curl` or Postman to test APIs that return 402
3. Modify the background.js temporarily to detect other status codes for testing

## Notes

- The extension stores up to 50 recent 402 events in memory
- Events are cleared when the browser is restarted
- The popup cannot always open automatically due to Chrome security restrictions

## License

MIT License - Feel free to modify and distribute
