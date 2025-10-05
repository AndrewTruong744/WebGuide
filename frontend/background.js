chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'FETCH_API_DATA') {
    (async () => {
      try {
        const res = await fetch('http://localhost:3000/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: request.prompt })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) chrome.tabs.sendMessage(tab.id, { action: 'HIGHLIGHT', data });

        sendResponse({ ok: true, data });
      } catch (err) {
        console.error('[background] FETCH_API_DATA error:', err);
        sendResponse({ ok: false, error: String(err.message || err) });
      }
    })();
    return true; 
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'GET_ELEMENTS' || request.action === 'NEXT_GUIDE_STEP') {
    (async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) throw new Error('No active tab');

        chrome.tabs.sendMessage(
          tab.id,
          {
            action: request.action,
            prompt: request.prompt,
            goal: request.goal
          },
          (resp) => {
            if (chrome.runtime.lastError) {
              sendResponse({ ok: false, error: chrome.runtime.lastError.message });
              return;
            }
            sendResponse(resp); 
          }
        );
      } catch (e) {
        sendResponse({ ok: false, error: String(e) });
      }
    })();

    return true; 
  }
});
