document.querySelector('#myButton').addEventListener('click', () => {
    const prompt = document.querySelector('#prompt');
    if (prompt.value.length === 0)
        return

    // Send a message to the service worker
    chrome.runtime.sendMessage({ 
        action: 'FETCH_API_DATA', 
        prompt: prompt.value 
    }, (response) => {
        // Handle the data received from the service worker
        if (response && response.data) {
            document.querySelector('#result').textContent = 
            `Data: ${response?.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No text in reply'}`;
        } else {
            document.querySelector('#result').textContent = 'Error fetching data.';
        }
    });
});