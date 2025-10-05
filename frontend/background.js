// Function to simplify tabs.sendMessage to use Promises
function sendMessageToTab(tabId, message) {
    return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, message, (response) => {
            if (chrome.runtime.lastError) {
                // If the content script is not running or the message fails
                return reject(new Error(`Tab send failed: ${chrome.runtime.lastError.message}`));
            }
            resolve(response);
        });
    });
}

// **SINGLE LISTENER** to handle all requests
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    // Check if the request is one that requires the full asynchronous chain
    if (request.action === 'FETCH_API_DATA' || request.action === 'GET_ELEMENTS' || request.action === 'NEXT_GUIDE_STEP') {
        (async () => {
            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (!tab?.id) throw new Error('No active tab found.');

                // --- NEW FIX: Programmatically inject content.js before talking ---
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content.js'] // Path to your content script
                });

                // --- 1. Get Elements from Content Script ---
                // The background orchestrates the data collection itself.
                const elementResp = await sendMessageToTab(tab.id, {
                    action: 'GET_ELEMENTS_DATA_ONLY', // Use the new clean action
                    prompt: request.prompt || request.goal
                });

                if (!elementResp?.ok) {
                    throw new Error(elementResp?.error || 'Content script failed to return elements.');
                }
                
                // Build the prompt for the external API
                const list = elementResp.elements.map((b, i) => 
                   `${i}. [${b.tag}] "${b.text}" selector="${b.selector}"`
                ).join("\n");
                
                const promptBody = `Print text content or aria label of element... GOAL: ${request.prompt || request.goal} ... FROM ELEMENTS: ${list}`;

                // --- 2. Perform the API Fetch ---
                const res = await fetch('http://localhost:3000/ask', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: promptBody })
                });

                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                
                // --- 3. Highlight/Execute in Content Script ---
                if (data?.selector) {
                    await sendMessageToTab(tab.id, { action: 'HIGHLIGHT', selector: data.selector, data: data });
                }

                // Send FINAL success back to the original popup caller
                sendResponse({ ok: true, data: data });
                
            } catch (err) {
                console.error('[Background Orchestrator Error]:', err);
                sendResponse({ ok: false, error: String(err.message || err) });
            }
        })();
        
        return true; // Keep the response port open for the async operations.
    }
});