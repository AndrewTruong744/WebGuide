document.querySelector('#myButton').addEventListener('click', () => {
  const promptEl = document.querySelector('#prompt');
  const text = (promptEl.value || '').trim();
  if (!text) return;

  localStorage.setItem('prompt', text);

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
          response.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No text in reply';
      } else {
        out.textContent = `Error: ${response?.error || 'fetch failed / no response'}`;
      }
    }
  );
});

document.querySelector('#next').addEventListener('click', () => {
    const goal = localStorage.getItem('prompt');
    const out = document.querySelector('#result');

    out.textContent = 'Thinking…';

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
          const reason = choice?.reason || 'highlighted';
          const rawText = resp.data?.candidates?.[0]?.content?.parts?.[0]?.text || ""; // Still keep raw text for debugging

          // The background script now handles the highlight message, so we just update the UI.

          out.textContent = selector
            ? `Step: ${reason}\nSelector: ${selector}`
            : `Could not parse selector.\nRaw: ${rawText}`; 
        } else {
          out.textContent = `Failed: ${resp?.error || 'unknown'}`;
        }
      }
    );
 });
