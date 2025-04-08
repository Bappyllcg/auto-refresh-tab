# Auto Tab Refresher Chrome Extension

A Chrome extension that automatically refreshes tabs at random intervals between specified minimum and maximum times.

## Features

- Set minimum and maximum refresh times
- Choose between seconds or minutes for time units
- Random refresh timing between the specified range
- Visual indication of active refresh status
- Countdown to next refresh

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" by toggling the switch in the top right corner
4. Click "Load unpacked" and select the extension directory
5. The extension icon should now appear in your Chrome toolbar

## Usage

1. Click on the extension icon to open the popup
2. Set your desired minimum and maximum refresh times
3. Select the time unit (seconds or minutes) for each value
4. Click "Start Auto-Refresh" to begin
5. The active tab will automatically refresh at random intervals within your specified range
6. Click "Stop Auto-Refresh" to stop the automatic refreshing

## Files

- `manifest.json`: Extension configuration
- `popup.html`: User interface
- `popup.js`: UI logic and user interaction
- `background.js`: Core refresh functionality
- `jquery-3.6.0.min.js`: jQuery library for DOM manipulation
- `icon.png`: Extension icon

## Notes

- The extension will only refresh the specific tab where auto-refresh was started (not affecting other tabs)
- Settings are saved between browser sessions
- The extension requires "tabs" and "storage" permissions to function properly