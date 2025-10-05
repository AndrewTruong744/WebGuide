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

    }
  );
});
