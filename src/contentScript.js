// Intensity: 'none', 'videos', 'all'
let untokifyIntensity = 'videos';

function shouldBlockVideo() {
  return untokifyIntensity === 'videos' || untokifyIntensity === 'all';
}
function shouldBlockImage() {
  return untokifyIntensity === 'all';
}

function createTokifyOverlayMedia(media, type) {
  // Prevent duplicate overlays
  if (media.parentElement.querySelector('.tokify-overlay')) return;
  if (media.dataset.untokifyRevealed === 'true') return;

  const overlay = document.createElement('div');
  overlay.className = 'tokify-overlay';
  overlay.style.position = 'absolute';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.background = 'rgba(0,0,0,1)';
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = '9999';
  overlay.style.fontFamily = 'Oxygen, Arial, sans-serif';
  overlay.style.pointerEvents = 'auto';

  const text = document.createElement('div');
  text.textContent = `content blocked by untokify. Click to view.`;
  text.style.color = 'white';
  text.style.fontSize = '1em';
  text.style.marginBottom = '12px';
  text.style.fontFamily = 'Oxygen, Arial, sans-serif';
  overlay.appendChild(text);

  const button = document.createElement('button');
  button.textContent = 'View Content';
  button.style.padding = '8px 16px';
  button.style.fontSize = '1em';
  button.style.cursor = 'pointer';
  button.style.fontFamily = 'Oxygen, Arial, sans-serif';

  // Reveal logic
  function revealMedia(e) {
    e.preventDefault();
    e.stopPropagation();
    overlay.remove();
    media.style.filter = '';
    media.style.pointerEvents = 'none'; // Prevent further clicks on the image/video
    media.dataset.untokifyRevealed = 'true';
  }

  button.onclick = revealMedia;
  overlay.onclick = function(e) {
    // Don't trigger if the button itself was clicked (let button handler run)
    if (e.target === button) return;
    revealMedia(e);
  };

  // Set pointer-events:none on media
  media.style.pointerEvents = 'none';

  // Make sure the media container is positioned
  const parent = media.parentElement;
  if (getComputedStyle(parent).position === 'static') {
    parent.style.position = 'relative';
  }

  // Insert overlay as sibling after media
  parent.insertBefore(overlay, media.nextSibling);
}

function isPostImage(img) {
  // Only block images inside an article and inside a div[aria-label="Image"] or parent[role=group]
  if (!img.closest('article')) return false;
  if (img.closest('div[aria-label="Image"]') || (img.parentElement && img.parentElement.getAttribute('role') === 'group')) {
    // Exclude avatars, emojis, and profile images by alt
    const alt = (img.getAttribute('alt') || '').toLowerCase();
    if (alt.includes('avatar') || alt.includes('profile') || alt.includes('emoji')) return false;
    // Exclude images inside profile picture containers
    if (img.closest('div[aria-label="Profile picture"], div[aria-label="Avatar"]')) return false;
    return true;
  }
  return false;
}

function isFromFollowedUser(media) {
  // Heuristic: find the closest article, check for 'Follow' button absence or 'Following' label
  const article = media.closest('article');
  if (!article) return false;
  // If there's a 'Follow' button, not followed
  if (article.querySelector('div[role="button"][data-testid="placementTracking"]:not([aria-label*="Following"])')) return false;
  // If there's a 'Following' label or no follow button, assume followed
  return true;
}

function blockMedia() {
  if (untokifyIntensity === 'none') {
    // Remove overlays and restore all
    document.querySelectorAll('.tokify-overlay').forEach(o => {
      o.remove();
    });
    // Remove revealed attribute and reset styles from all videos/images
    document.querySelectorAll('video, img').forEach(media => {
      media.style.filter = '';
      media.style.pointerEvents = '';
      delete media.dataset.untokifyRevealed;
    });
    return;
  }


  if (shouldBlockVideo()) {
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
      if (video.dataset.untokifyRevealed === 'true') return;
      if (bypassFollowing && isFromFollowedUser(video)) {
        const overlay = video.parentElement.querySelector('.tokify-overlay');
        if (overlay) overlay.remove();
        video.style.filter = '';
        video.style.pointerEvents = '';
        delete video.dataset.untokifyRevealed;
        return;
      }
      createTokifyOverlayMedia(video, 'video');
    });
  }
  if (shouldBlockImage()) {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (img.dataset.untokifyRevealed === 'true') return;
      if (!isPostImage(img)) return;
      if (bypassFollowing && isFromFollowedUser(img)) return;
      img.style.filter = 'grayscale(1)';
      createTokifyOverlayMedia(img, 'image');
    });
  } else {
    // Unblock images that are currently blocked (remove overlays and restore state)
    document.querySelectorAll('img').forEach(img => {
      const overlay = img.parentElement.querySelector('.tokify-overlay');
      if (overlay) overlay.remove();
      img.style.filter = '';
      img.style.pointerEvents = '';
      delete img.dataset.untokifyRevealed;
    });
  }
}

// Load intensity and bypass from storage and apply
let bypassFollowing = false;
function updateAndBlock() {
  chrome.storage.sync.get(['untokifyIntensity', 'untokifyBypassFollowing'], (result) => {
    untokifyIntensity = result.untokifyIntensity || 'videos';
    bypassFollowing = !!result.untokifyBypassFollowing;
    blockMedia();
  });
}

updateAndBlock();

// Observe for new media
const observer = new MutationObserver(() => {
  updateAndBlock();
});
observer.observe(document.body, { childList: true, subtree: true });

// Listen for changes from popup
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync') {
    if (changes.untokifyIntensity) {
      untokifyIntensity = changes.untokifyIntensity.newValue;
      blockMedia();
    }
    if (changes.untokifyBypassFollowing) {
      bypassFollowing = changes.untokifyBypassFollowing.newValue;
      // Actively remove overlays and restore media for followed users
      document.querySelectorAll('video').forEach(video => {
        if (isFromFollowedUser(video)) {
          const overlay = video.parentElement.querySelector('.tokify-overlay');
          if (overlay) overlay.remove();
          video.style.filter = '';
          video.style.pointerEvents = '';
          delete video.dataset.untokifyRevealed;
        }
      });
      document.querySelectorAll('img').forEach(img => {
        if (isFromFollowedUser(img)) {
          const overlay = img.parentElement.querySelector('.tokify-overlay');
          if (overlay) overlay.remove();
          img.style.filter = '';
          img.style.pointerEvents = '';
          delete img.dataset.untokifyRevealed;
        }
      });
      blockMedia();
    }
  }
}); 