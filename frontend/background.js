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
                        
                        The output MUST be a valid JSON object with the keys 'selector' (string) 
                        and 'reason' (string, explaining the choice).
                        
                        CLICKABLE ELEMENTS:\n${list}`;
                }
                else
                    promptBody = 
                        `Print text content or aria label of element... GOAL: ${request.prompt || request.goal} ... FROM ELEMENTS: ${list}`;

                // --- 2. Perform the API Fetch ---
                const res = await fetch('http://localhost:3000/ask', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: promptBody })
                });

                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const rawResponse = await res.json();
                const modelOutputText = rawResponse.candidates?.[0]?.content?.parts?.[0]?.text || '';
                
                // --- Extract the clean JSON for storage (using the same cleaning logic as the popup) ---
                let choice = null;
                try {
                    // Clean the output (same logic as popup.js)
                    const regex = /```(?:json)?\s*([\s\S]*?)\s*```/;
                    const match = modelOutputText.trim().match(regex);
                    const textToParse = (match && match[1]) ? match[1].trim() : modelOutputText.trim();
                    choice = JSON.parse(textToParse);
                } catch (e) {
                    console.error("BG JSON Parse Error:", e);
                    /* choice remains null */
                }
                
                // --- CORRECT STORAGE UPDATE ---
                // Save the final, CLEAN selector for the next step's prompt
                const nextStepSelector = choice?.selector || 'element (unknown)';

                await chrome.storage.local.set({
                    previousEl: nextStepSelector,
                    // Save the goal here as well, in case 'prompt' wasn't set earlier
                    prompt: request.prompt || request.goal 
                });

                // --- 3. Highlight/Execute in Content Script ---
                if (choice?.selector) {
                    // Send the final parsed object 'choice' to the popup
                    await sendMessageToTab(tab.id, { action: 'HIGHLIGHT', selector: choice.selector });
                }

                // Send FINAL success back to the original popup caller
                sendResponse({ ok: true, data: rawResponse, choice: choice });
                
            } catch (err) {
                console.error('[Background Orchestrator Error]:', err);
                sendResponse({ ok: false, error: String(err.message || err) });
            }
        })();
        
        return true; // Keep the response port open for the async operations.
    }
});