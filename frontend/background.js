chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'FETCH_API_DATA') {
      
      fetch('localhost:3000/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=UTF-8'
        },
        body: request.prompt 
      })
          .then(response => response.json())
          .then(data => {
            // --- NEW STEP: Get the active tab ID to send data back to the content script ---
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              if (tabs.length > 0) {
                  const tabId = tabs[0].id;
                  
                // Send the data to the content script in the active tab
                chrome.tabs.sendMessage(tabId, { 
                    action: 'HIGHLIGHT', 
                    data: data 
                });
              }
            });
            
            // You can still send a basic confirmation back to the popup, but the data goes to content.js
            sendResponse({ status: 'Data request initiated' });
          })
          .catch(error => {
              sendResponse({ status: 'error', data: null });
          });
          
      // IMPORTANT: Return true to indicate you will send a response asynchronously
      return true; 
  }
});