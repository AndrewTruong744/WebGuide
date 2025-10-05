function sendMessageToTab(tabId, message) {
    return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, message, (response) => {
            if (chrome.runtime.lastError) {
                return reject(new Error(`Tab send failed: ${chrome.runtime.lastError.message}`));
            }
            resolve(response);
        });
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    if (request.action === 'GET_GUIDANCE') {
        (async () => {
            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (!tab?.id) throw new Error('No active tab found.');

                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content.js']
                });

                const elementResp = await sendMessageToTab(tab.id, {
                    action: 'GET_ELEMENTS_DATA_ONLY',
                    prompt: request.prompt || request.goal
                });

                if (!elementResp?.ok) {
                    throw new Error(elementResp?.error || 'Content script failed to return elements.');
                }
                
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

                const matchingElements = elementResp.elements.filter(element => {
                    return element.text === chosenElementText;
                }); 

                const finalElement = matchingElements.length > 0 ? matchingElements[0] : null;

                await chrome.storage.local.set({
                    previousEl: chosenElementText, 
                    prompt: request.prompt || request.goal 
                });

                if (finalElement) {
                    const finalSelector = finalElement.selector; 
                    
                    if (typeof finalSelector === 'string' && finalSelector.length > 0) {
                        await sendMessageToTab(tab.id, { action: 'HIGHLIGHT', selector: finalSelector});
                    } else {
                        console.warn("[Background]: Cannot highlight: Selector is missing or invalid.");
                    }
                }


                sendResponse({ 
                    ok: true, 
                    data: chosenElementText,
                    choice: finalElement
                });
                
            } catch (err) {
                console.error('[Background Orchestrator Error]:', err);
                sendResponse({ ok: false, error: String(err.message || err) });
            }
        })();
        
        return true;
    }
});