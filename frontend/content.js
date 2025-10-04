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
        if (request.action === 'GET_ELEMENTS') {
            const CLICKABLE_SELECTORS = 
                `a, button, input[type="button"], input[type="submit"], 
                [role="button"], [onclick], [tabindex]:not([tabindex="-1"])`;
            // 1. Query all matching elements
            const elements = document.querySelectorAll(CLICKABLE_SELECTORS);

            // 2. Convert the NodeList to a true Array and Map over it
            const elementData = Array.from(elements).map((el, index) => {
                
                // Clean up the text content (remove extra white space/newlines)
                const textContent = el.textContent ? el.textContent.trim().replace(/\s+/g, ' ') : '';
                
                // Return a clean object for each element
                return {
                    index: index, // Useful for later identification
                    tag: el.tagName.toLowerCase(),
                    text: textContent,
                    // Optionally, include unique attributes like ID or ARIA label
                    id: el.id || null, 
                    ariaLabel: el.getAttribute('aria-label') || null 
                };
            }).filter(item => item.text.length > 0 || item.tag === 'BUTTON'); 
            // Filter out elements that have no visible text, unless they are buttons

            const elementDataString = elementData.join(", ");

            chrome.runtime.sendMessage({ 
                action: 'FETCH_API_DATA', 
                prompt: "what element do I click: " + 
                        elementDataString + ". " + prompt.value + 
                        " " + window.location.href 
            }, (response) => {
                // Handle the data received from the service worker
                if (response && response.data) {
                    console.log( 
                    `Data: ${response?.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No text in reply'}`
                    );
                    sendResponse({ ok: true, data });
                } else {
                    console.log('Error fetching data.');
                    sendResponse({ ok: true, data });
                }
            });

            return true;
        }

        if (request.action === "HIGHLIGHT") {
            console.log(request.data)    

            // Send a response back (optional, but good practice)
            sendResponse({ status: "Element Highlighted!" });
        }
    }
);