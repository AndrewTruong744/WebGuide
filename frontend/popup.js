document.querySelector('#myButton').addEventListener('click', () => {
  const promptEl = document.querySelector('#prompt');
  const text = (promptEl.value || '').trim();
  if (!text) return;

  chrome.storage.local.set({ prompt: text });

  chrome.runtime.sendMessage(
    { action: 'GET_GUIDANCE', prompt: text },
    (response) => {
      const out = document.querySelector('#result');

      if (chrome.runtime.lastError) {
        out.textContent = `Runtime error: ${chrome.runtime.lastError.message}`;
        return;
      }

      if (response?.ok && response?.data) {
        out.textContent =
          response.data ?? 'No text in reply';
      } else {
        out.textContent = `Error: ${response?.error || 'fetch failed / no response'}`;
      }
    }
  );
});

document.querySelector('#next').addEventListener('click', async () => {
    const storageData = await chrome.storage.local.get(['prompt', 'previousEl']);
    const goal = storageData.prompt;
    const out = document.querySelector('#result');

    out.textContent = 'Thinking...';

    // Manual step: popup -> background relay -> content collects -> background /ask -> content highlight
    chrome.runtime.sendMessage(
      { action: 'GET_GUIDANCE', prompt: goal, next: true },
      (resp) => {
        if (chrome.runtime.lastError) {
          out.textContent = `Runtime error: ${chrome.runtime.lastError.message}`;
          return;
        }

        if (resp?.ok && resp?.data) {

          const choice = resp.choice; 
          
          const selector = choice?.selector || '';
          const reason = choice?.text || 'highlighted';
          const rawText = resp.data || ""; // Still keep raw text for debugging

          out.textContent = selector
            ? `Step: ${reason}`
            : `Could not parse selector.\nRaw: ${rawText}`; 
        } else {
          out.textContent = `Failed: ${resp?.error || 'unknown'}`;
        }
      }
    );
 });