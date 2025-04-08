// Background script for Auto Tab Refresher extension

let refreshAlarmName = 'autoRefreshAlarm';
let isActive = false;
let nextRefreshTime = null;
let targetTabId = null; // Store the ID of the tab where auto-refresh was started

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === 'startAutoRefresh') {
        startAutoRefresh(
            request.minTime,
            request.maxTime,
            request.minUnit,
            request.maxUnit,
            sendResponse
        );
        return true; // Indicates async response
    }
    else if (request.action === 'stopAutoRefresh') {
        stopAutoRefresh(sendResponse);
        return true; // Indicates async response
    }
    else if (request.action === 'getStatus') {
        sendResponse({
            isActive: isActive,
            nextRefresh: nextRefreshTime
        });
        return false; // Synchronous response
    }
});

// Start auto-refresh with given parameters
function startAutoRefresh(minTime, maxTime, minUnit, maxUnit, callback) {
    // Convert to milliseconds
    const minMs = convertToMilliseconds(minTime, minUnit);
    const maxMs = convertToMilliseconds(maxTime, maxUnit);

    // Calculate random time between min and max
    const randomMs = getRandomTime(minMs, maxMs);

    // Get the current tab to store its ID
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs.length > 0) {
            targetTabId = tabs[0].id; // Store the tab ID where auto-refresh was started

            // Clear any existing alarms
            chrome.alarms.clear(refreshAlarmName, function () {
                // Create new alarm
                chrome.alarms.create(refreshAlarmName, {
                    delayInMinutes: randomMs / (60 * 1000) // Convert ms to minutes for alarm API
                });

                isActive = true;
                nextRefreshTime = Date.now() + randomMs;

                // Save the target tab ID to storage
                chrome.storage.local.set({ targetTabId: targetTabId });

                if (callback) {
                    callback({
                        success: true,
                        nextRefresh: nextRefreshTime
                    });
                }
            });
        }
    });
}

// Stop auto-refresh
function stopAutoRefresh(callback) {
    chrome.alarms.clear(refreshAlarmName, function () {
        isActive = false;
        nextRefreshTime = null;
        targetTabId = null; // Clear the target tab ID

        // Clear the target tab ID from storage
        chrome.storage.local.remove('targetTabId');

        if (callback) {
            callback({ success: true });
        }
    });
}

// Handle alarm events (refresh the tab)
chrome.alarms.onAlarm.addListener(function (alarm) {
    if (alarm.name === refreshAlarmName) {
        if (typeof targetTabId !== 'number' || isNaN(targetTabId) || !Number.isInteger(targetTabId) || targetTabId <= 0) {
            stopAutoRefresh();
            return;
        }
        // Check if the target tab still exists
        chrome.tabs.get(targetTabId, function (tab) {
            if (chrome.runtime.lastError) {
                // Tab no longer exists, stop auto-refresh
                stopAutoRefresh();
                return;
            }

            // Refresh only the specific tab where auto-refresh was started
            // Refresh the target tab
            // Store original tab ID when starting
            chrome.tabs.reload(targetTabId, function() {
                if (chrome.runtime.lastError) {
                    stopAutoRefresh();
                    return;
                }
            });

            // Get settings and set up next refresh
            chrome.storage.local.get(['minTime', 'maxTime', 'minUnit', 'maxUnit', 'isActive'], function (data) {
                if (data.isActive) {
                    // Use the existing targetTabId for the next refresh
                    const minMs = convertToMilliseconds(data.minTime, data.minUnit);
                    const maxMs = convertToMilliseconds(data.maxTime, data.maxUnit);
                    const randomMs = getRandomTime(minMs, maxMs);

                    // Clear any existing alarms
                    chrome.alarms.clear(refreshAlarmName, function () {
                        // Create new alarm
                        chrome.alarms.create(refreshAlarmName, {
                            delayInMinutes: randomMs / (60 * 1000) // Convert ms to minutes for alarm API
                        });

                        nextRefreshTime = Date.now() + randomMs;
                    });
                }
            });
        });
    }
});

// Helper function to get random time between min and max
function getRandomTime(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper function to convert time to milliseconds
function convertToMilliseconds(time, unit) {
    if (unit === 'minutes') {
        return time * 60 * 1000;
    } else {
        return time * 1000;
    }
}

// Initialize state from storage when extension loads
chrome.storage.local.get(['isActive', 'targetTabId'], function (data) {
    if (data.isActive && data.targetTabId) {
        // Restore the target tab ID
        targetTabId = parseInt(data.targetTabId, 10);

        if (typeof targetTabId !== 'number' || isNaN(targetTabId) || !Number.isInteger(targetTabId) || targetTabId <= 0) {
            stopAutoRefresh();
            return;
        }

        // Check if the target tab still exists
        chrome.tabs.get(targetTabId, function (tab) {
            if (chrome.runtime.lastError) {
                // Tab no longer exists, stop auto-refresh
                chrome.storage.local.set({ isActive: false });
                chrome.storage.local.remove('targetTabId');
                return;
            }

            // Tab exists, restore auto-refresh
            chrome.storage.local.get(['minTime', 'maxTime', 'minUnit', 'maxUnit'], function (settings) {
                if (settings.minTime && settings.maxTime) {
                    // Use the existing targetTabId for the next refresh
                    const minMs = convertToMilliseconds(settings.minTime, settings.minUnit);
                    const maxMs = convertToMilliseconds(settings.maxTime, settings.maxUnit);
                    const randomMs = getRandomTime(minMs, maxMs);

                    // Clear any existing alarms
                    chrome.alarms.clear(refreshAlarmName, function () {
                        // Create new alarm
                        chrome.alarms.create(refreshAlarmName, {
                            delayInMinutes: randomMs / (60 * 1000) // Convert ms to minutes for alarm API
                        });

                        isActive = true;
                        nextRefreshTime = Date.now() + randomMs;
                    });
                }
            });
        });
    }
});