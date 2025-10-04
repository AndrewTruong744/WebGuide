document.querySelector('#myButton').addEventListener('click', () => {
    const prompt = document.querySelector('#prompt');
    if (prompt.value.length === 0)
        return

    // Send a message to the service worker
    chrome.runtime.sendMessage({ 
        action: 'GET_ELEMENTS', 
        prompt: prompt.value 
    }, (response) => {
        // Handle the data received from the service worker
        if (response && response.data) {
            document.querySelector('#result').textContent = `Success`;
        } else {
            document.querySelector('#result').textContent = 'Error fetching data.';
        }
    });
});