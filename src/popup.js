const slider = document.getElementById('intensity-slider');
const bypassCheckbox = document.getElementById('bypass-following');

const sliderToValue = ['none', 'videos', 'all'];
const valueToSlider = { none: 0, videos: 1, all: 2 };

// Load saved settings
chrome.storage.sync.get(['untokifyIntensity', 'untokifyBypassFollowing'], (result) => {
  slider.value = valueToSlider[result.untokifyIntensity || 'videos'];
  bypassCheckbox.checked = !!result.untokifyBypassFollowing;
});

slider.addEventListener('input', () => {
  chrome.storage.sync.set({ untokifyIntensity: sliderToValue[slider.value] });
});

bypassCheckbox.addEventListener('change', () => {
  console.log('bypassing following', bypassCheckbox.checked);
  chrome.storage.sync.set({ untokifyBypassFollowing: bypassCheckbox.checked });
});

// Ensure toggle visual state matches checkbox state (was in inline script)
document.addEventListener('DOMContentLoaded', function() {
  const checkbox = document.getElementById('bypass-following');
  const updateToggleVisual = () => {
    // This just ensures our CSS styling works properly
    // The actual functionality is handled by popup.js
    // No-op, but can be used for future visual JS tweaks if needed
  };
  if (checkbox) {
    checkbox.addEventListener('change', updateToggleVisual);
    updateToggleVisual();
  }
});

// Close popup when green square is clicked
const statusIndicator = document.querySelector('.status-indicator');
if (statusIndicator) {
  statusIndicator.style.cursor = 'pointer';
  statusIndicator.title = 'Close';
  statusIndicator.addEventListener('click', () => {
    window.close();
  });
} 