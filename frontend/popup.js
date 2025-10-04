document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('myButton').addEventListener('click', () => {
        // Send a message to the service worker
        chrome.runtime.sendMessage({ action: 'FETCH_API_DATA' }, (response) => {
            // Handle the data received from the service worker
            if (response && response.data) {
                document.getElementById('result').textContent = `Data: ${response.data.value}`;
            } else {
                document.getElementById('result').textContent = 'Error fetching data.';
            }
        });
    });
});