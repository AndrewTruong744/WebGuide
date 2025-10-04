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

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) chrome.tabs.sendMessage(tab.id, { action: 'HIGHLIGHT', data });

        sendResponse({ ok: true, data });
      } catch (err) {
        console.error('fetch error', err);
        sendResponse({ ok: false, error: err.message });
      }
    })();
          
    return true; 
  }
});