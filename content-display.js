// Get content from storage using key from URL parameter
window.addEventListener('DOMContentLoaded', () => {
  const contentDiv = document.getElementById('content');

  // Get key from URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const contentKey = urlParams.get('key');

  if (!contentKey) {
    contentDiv.innerHTML = '<h1>Error</h1><p>No content key provided</p>';
    return;
  }

  // Get content from session storage using the key
  chrome.storage.session.get([contentKey], (result) => {
    const content = result[contentKey];

    if (content) {


      // Try to render as HTML if it looks like HTML
      if (content.trim().startsWith('<!DOCTYPE') ||
        content.trim().startsWith('<html')) {
        // Use blob URL with iframe to avoid CSP issues
        const blob = new Blob([content], { type: 'text/html' });
        const blobUrl = URL.createObjectURL(blob);

        // Create iframe to display the content
        const iframe = document.createElement('iframe');
        iframe.src = blobUrl;
        iframe.style.width = '100%';
        iframe.style.height = '100vh';
        iframe.style.border = 'none';
        iframe.sandbox = 'allow-same-origin allow-scripts allow-forms allow-popups';

        // Replace content div with iframe
        document.body.innerHTML = '';
        document.body.appendChild(iframe);

        // Clean up blob URL after iframe loads
        iframe.onload = () => {
          URL.revokeObjectURL(blobUrl);
        };
      } else {
        // Display as text
        contentDiv.textContent = content;
      }

      // Clear the storage
      chrome.storage.session.remove([contentKey]);
    } else {
      contentDiv.innerHTML = '<h1>Error</h1><p>Content not found in storage</p>';
    }
  });
});
