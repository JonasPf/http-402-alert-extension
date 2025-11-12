// Request events from background script
chrome.runtime.sendMessage({ action: 'getEvents' }, (response) => {
  displayEvents(response.events);
});

// Clear badge when popup opens
chrome.runtime.sendMessage({ action: 'clearBadge' });

function displayEvents(events) {
  const container = document.getElementById('events-container');
  
  if (!events || events.length === 0) {
    container.innerHTML = '<p class="no-events">No 402 responses detected yet.</p>';
    return;
  }
  
  container.innerHTML = '';
  
  events.forEach((event) => {
    const eventDiv = document.createElement('div');
    eventDiv.className = 'event-item';
    
    const timeDiv = document.createElement('div');
    timeDiv.className = 'event-time';
    timeDiv.textContent = new Date(event.timestamp).toLocaleString();
    
    const methodDiv = document.createElement('div');
    methodDiv.className = 'event-method';
    methodDiv.textContent = event.method;
    
    const urlDiv = document.createElement('div');
    urlDiv.className = 'event-url';
    urlDiv.textContent = event.url;
    urlDiv.title = event.url;
    
    eventDiv.appendChild(timeDiv);
    eventDiv.appendChild(methodDiv);
    eventDiv.appendChild(urlDiv);
    
    container.appendChild(eventDiv);
  });
}

// Clear button handler
document.getElementById('clear-btn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'clearBadge' });
  window.close();
});
