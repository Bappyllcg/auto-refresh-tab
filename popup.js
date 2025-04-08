document.addEventListener('DOMContentLoaded', function() {
  // Get DOM elements
  const minTimeInput = document.getElementById('minTime');
  const maxTimeInput = document.getElementById('maxTime');
  const minUnitSelect = document.getElementById('minUnit');
  const maxUnitSelect = document.getElementById('maxUnit');
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const statusDiv = document.getElementById('status');
  const nextRefreshDiv = document.getElementById('nextRefresh');
  
  // Load saved settings
  chrome.storage.local.get(['minTime', 'maxTime', 'minUnit', 'maxUnit', 'isActive', 'urlList'], function(data) {
    if (data.minTime) minTimeInput.value = data.minTime;
    if (data.maxTime) maxTimeInput.value = data.maxTime;
    if (data.minUnit) minUnitSelect.value = data.minUnit;
    if (data.maxUnit) maxUnitSelect.value = data.maxUnit;
    if (data.urlList) document.getElementById('urlList').value = data.urlList;
  });
  
  // Check current status when popup opens
  chrome.runtime.sendMessage({action: 'getStatus'}, function(response) {
    chrome.storage.local.get(['targetTabId'], function(storage) {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const currentTabId = tabs[0]?.id;
        const isCurrentTab = storage.targetTabId === currentTabId;

        if (response && response.isActive && isCurrentTab) {
          updateStatusDisplay(true);
          if (response.nextRefresh) {
            updateNextRefreshTime(response.nextRefresh);
          }
        } else {
          updateStatusDisplay(false);
          nextRefreshDiv.textContent = '';
        }
      });
    });
  });
  
  // Start auto-refresh
  startBtn.addEventListener('click', function() {
    const minTime = parseInt(minTimeInput.value);
    const maxTime = parseInt(maxTimeInput.value);
    const minUnit = minUnitSelect.value;
    const maxUnit = maxUnitSelect.value;
    
    // Validate inputs
    if (minTime <= 0 || maxTime <= 0) {
      alert('Time values must be greater than 0');
      return;
    }
    
    if (minTime > maxTime && minUnit === maxUnit) {
      alert('Minimum time cannot be greater than maximum time');
      return;
    }
    
    // Convert to milliseconds for comparison if units are different
    const minTimeMs = convertToMilliseconds(minTime, minUnit);
    const maxTimeMs = convertToMilliseconds(maxTime, maxUnit);
    
    if (minTimeMs > maxTimeMs) {
      alert('Minimum time cannot be greater than maximum time');
      return;
    }
    
    // Save settings
    chrome.storage.local.set({
      minTime: minTime,
      maxTime: maxTime,
      minUnit: minUnit,
      maxUnit: maxUnit,
      isActive: true
    });
    
    // Get current tab information to display to user
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs.length > 0) {
        const currentTab = tabs[0];
        
        // Send message to background script
        chrome.runtime.sendMessage({
          action: 'startAutoRefresh',
          minTime: minTime,
          maxTime: maxTime,
          minUnit: minUnit,
          maxUnit: maxUnit,
          urls: document.getElementById('urlList').value
        }, function(response) {
          if (response && response.success) {
            updateStatusDisplay(true);
            if (response.nextRefresh) {
              updateNextRefreshTime(response.nextRefresh);
            }
            
            // Update status text to indicate which tab will be refreshed
            statusDiv.innerHTML = 'Auto-Refresh is active<br><small>Current URL: ' + 
              (response.currentUrl?.length > 25 ? response.currentUrl.substring(0, 25) + '...' : response.currentUrl || '') + '</small>';
          }
        });
      }
    });
  });
  
  // Stop auto-refresh
  stopBtn.addEventListener('click', function() {
    chrome.runtime.sendMessage({action: 'stopAutoRefresh'}, function(response) {
      if (response && response.success) {
        updateStatusDisplay(false);
        nextRefreshDiv.textContent = '';
        clearInterval(refreshIntervalId);
        
        // Update storage
        chrome.storage.local.set({isActive: false});
      }
    });
  });
  
  // Helper function to update status display
  function updateStatusDisplay(isActive) {
    if (isActive) {
      statusDiv.textContent = 'Auto-Refresh is active';
      statusDiv.className = 'status active';
      startBtn.disabled = true;
      stopBtn.disabled = false;
    } else {
      statusDiv.textContent = 'Auto-Refresh is inactive';
      statusDiv.className = 'status inactive';
      startBtn.disabled = false;
      stopBtn.disabled = true;
    }
  }
  
  // Helper function to update next refresh time display
  let refreshIntervalId = null;
  
  function updateNextRefreshTime(timestamp) {
    clearInterval(refreshIntervalId);
    
    const updateDisplay = () => {
      const now = new Date().getTime();
      const timeLeft = Math.max(0, timestamp - now);
      const seconds = Math.floor(timeLeft / 1000);
      
      if (seconds > 60) {
        const minutes = Math.floor(seconds / 60);
        nextRefreshDiv.textContent = `Next refresh in approximately ${minutes} minute(s) and ${seconds % 60} second(s)`;
      } else {
        nextRefreshDiv.textContent = `Next refresh in approximately ${seconds} second(s)`;
      }
      
      if (seconds <= 0) clearInterval(refreshIntervalId);
    };
    
    updateDisplay();
    refreshIntervalId = setInterval(updateDisplay, 1000);
  }
  
  // Helper function to convert time to milliseconds
  function convertToMilliseconds(time, unit) {
    if (unit === 'minutes') {
      return time * 60 * 1000;
    } else {
      return time * 1000;
    }
  }
});