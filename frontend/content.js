// content.js

// Function to generate a random background color
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Listen for a message from the popup (relayed via the service worker, if applicable)
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.action === "HIGHLIGHT") {
            console.log(request.data)    

            // Send a response back (optional, but good practice)
            sendResponse({ status: "Element Highlighted!" });
        }
    }
);