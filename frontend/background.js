chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'FETCH_API_DATA') {
        
        // Use fetch() directly in the Service Worker
        fetch('https://api.example.com/data')
            .then(response => response.json())
            .then(data => {
                // Send the successful data response back to the popup
                sendResponse({ status: 'success', data: data });
            })
            .catch(error => {
                console.error("Fetch failed:", error);
                // Send an error response back to the popup
                sendResponse({ status: 'error', data: null });
            });
            
        // IMPORTANT: Return true to indicate you will send a response asynchronously
        return true; 
    }
});