document.addEventListener('DOMContentLoaded', function () {
    const button = document.getElementById('myButton');
    
    button.addEventListener('click', function() {
        
        // 1. Get the current active tab
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            
            // 2. tabs[0] is the current active tab
            const activeTabId = tabs[0].id;
            
            // 3. Send a message to the content script in that tab
            chrome.tabs.sendMessage(activeTabId, { action: "CHANGE_COLOR" }, function(response) {
                // This is the optional response from content.js
                console.log("Content script responded:", response ? response.status : "No response");
                
                // You can update the popup UI here if needed
                alert('Background color change signal sent!');
            });
        });
    });
});