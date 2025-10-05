document.querySelector('#myButton').addEventListener('click', () => {
  const promptEl = document.querySelector('#prompt');
  const text = (promptEl.value || '').trim();
  if (!text) return;

  chrome.runtime.sendMessage(
    { action: 'FETCH_API_DATA', prompt: text },
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

      showNextStepButton();
    }
  );
});

function showNextStepButton() {
  if (document.querySelector('#nextStepBtn')) return;

  const nextBtn = document.createElement('button');
  nextBtn.id = 'nextStepBtn';
  nextBtn.textContent = 'Next Step';

  nextBtn.onclick = () => {
    const promptEl = document.querySelector('#prompt');
    const goal = (promptEl.value || '').trim();
    const out = document.querySelector('#result');

    nextBtn.disabled = true;
    out.textContent = 'Thinking…';

    // Manual step: popup -> background relay -> content collects -> background /ask -> content highlight
    chrome.runtime.sendMessage(
      { action: 'GET_ELEMENTS', prompt: goal },
      (resp) => {
        if (chrome.runtime.lastError) {
          out.textContent = `Runtime error: ${chrome.runtime.lastError.message}`;
          nextBtn.disabled = false;
          return;
        }
        if (resp?.ok && resp?.data) {
        
        if (resp?.ok && resp?.data) {
          // Try to parse the choice from model text
          const text = resp.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          let choice = null;
          try { choice = JSON.parse(text); } catch { /* ignore */ }

          const selector = choice?.selector || '';
          const reason = choice?.reason || 'highlighted';

          // forward highlight command
          chrome.runtime.sendMessage(
            { action: 'NEXT_GUIDE_STEP', goal }, // relay so background sends to content
            () => {}
          );
          // also directly highlight if selector exists
          if (selector) {
            chrome.runtime.sendMessage({ action: 'HIGHLIGHT', selector }, () => {});
          }

          out.textContent = selector
            ? `Step: ${reason}\nSelector: ${selector}`
            : `Could not parse selector.\nRaw: ${text}`;
        } else {
          out.textContent = `Failed: ${resp?.error || 'unknown'}`;
        }

        nextBtn.disabled = false;
      }
    );
  };

  // Optional separator
  document.body.appendChild(document.createElement('hr'));
  document.body.appendChild(nextBtn);
}
