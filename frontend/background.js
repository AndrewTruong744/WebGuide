chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'FETCH_API_DATA') {
      
    (async () => {
      try {
        const res = await fetch('http://localhost:3000/ask', {
          method : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body   : JSON.stringify({ prompt: request.prompt })
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();

        // forward to content script
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) chrome.tabs.sendMessage(tab.id, { action: 'HIGHLIGHT', data });

        sendResponse({ ok: true, data });          // <-- success path
      } catch (err) {
        console.error('fetch error', err);
        sendResponse({ ok: false, error: err.message }); // <-- fail path
      }
    })();
            
    // IMPORTANT: Return true to indicate you will send a response asynchronously
    return true; 
  }
});