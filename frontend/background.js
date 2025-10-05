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
    if (request.action === 'GET_GUIDANCE') {
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

                const listOfElementNames = elementResp.elements.map(element => {
                    return element.text
                }).join(", ");

                let promptBody = "";
                if (request.next !== undefined) {
                    const storageData = await chrome.storage.local.get(['previousEl', 'prompt']);
                    const previousElValue = storageData.previousEl || 'the initial element'; 
                    const promptGoal = storageData.prompt || 'the goal';

                    promptBody = 
                        `You are an AI assistant helping a user navigate a webpage. 
                        The last action was performed on the element: "${previousElValue}".
                        The current overall goal is: "${promptGoal}". 
                        
                        Based on the goal and the list of clickable elements below, 
                        select the next element the user should interact with.
                        
                        The output MUST be one of the CLICKABLE ELEMENT names.
                        
                        CLICKABLE ELEMENTS:\n${listOfElementNames}`;
                }
                else
                    promptBody = 
                        `select and return one of the elements with goal of 
                        ${request.prompt || request.goal} 
                        ... FROM ELEMENTS: ${listOfElementNames}`;

                // --- 2. Perform the API Fetch ---
                const res = await fetch('http://localhost:3000/ask', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: promptBody })
                });

                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const rawResponse = await res.json();
                const modelOutputText = rawResponse.candidates?.[0]?.content?.parts?.[0]?.text || '';
                
                const chosenElementText = modelOutputText.trim();
                let finalSelector = null;

                // Find the single element object that matches the text returned by the AI
                const matchingElements = elementResp.elements.filter(element => {
                    // We expect the AI to return the exact text of one element.
                    return element.text === chosenElementText;
                }); 

                const finalElement = matchingElements.length > 0 ? matchingElements[0] : null;

                // --- 2. Store the Chosen Element Text (Name) in previousEl ---
                await chrome.storage.local.set({
                    // Store the text of the element as the "previous action"
                    previousEl: chosenElementText, 
                    prompt: request.prompt || request.goal 
                });

                // --- 3. Highlight/Execute in Content Script using the selector ---
                // if (finalElement) {
                //     finalSelector = finalElement.selector;
                //     // Send the final selector string to the content script for highlighting
                //     await sendMessageToTab(tab.id, { action: 'HIGHLIGHT', selector: finalSelector });
                // }

                // --- 4. Send FINAL success back to the original popup caller ---
                // Send the plain text name (chosenElementText) back to the popup for display
                sendResponse({ 
                    ok: true, 
                    data: chosenElementText, // The element's text (name)
                    choice: finalElement // The full element object for potential debugging
                });
                
            } catch (err) {
                console.error('[Background Orchestrator Error]:', err);
                sendResponse({ ok: false, error: String(err.message || err) });
            }
        })();
        
        return true; // Keep the response port open for the async operations.
    }
});