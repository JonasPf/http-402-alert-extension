// Get content from URL hash or show test content
window.addEventListener('DOMContentLoaded', () => {
  const contentDiv = document.getElementById('content');
  
  // Try to get content from session storage
  chrome.storage.session.get(['fetchedContent'], (result) => {
    if (result.fetchedContent) {
      console.log('Got content from storage, length:', result.fetchedContent.length);
      
      // Try to render as HTML if it looks like HTML
      if (result.fetchedContent.trim().startsWith('<!DOCTYPE') || 
          result.fetchedContent.trim().startsWith('<html')) {
        // Replace the entire document
        document.open();
        document.write(result.fetchedContent);
        document.close();
      } else {
        // Display as text
        contentDiv.textContent = result.fetchedContent;
      }
      
      // Clear the storage
      chrome.storage.session.remove(['fetchedContent']);
    } else {
      contentDiv.innerHTML = '<h1>Hello World</h1><p>No content available</p>';
    }
  });
});
