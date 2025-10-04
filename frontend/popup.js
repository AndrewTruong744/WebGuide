document.querySelector('#myButton').addEventListener('click', () => {
    const prompt = document.querySelector('#prompt');
    if (prompt.value.length === 0)
        return

    chrome.runtime.sendMessage({ 
        action: 'GET_ELEMENTS', 
        prompt: prompt.value 
    }, (response) => {
        
        if (response && response.data) {
            document.querySelector('#result').textContent = 'Success';
        } else {
            document.querySelector('#result').textContent = 'Error fetching data.';
        }
        showNextStepButton();
    });
});
function showNextStepButton(){
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

    chrome.runtime.sendMessage(
            { action: 'NEXT_GUIDE_STEP', goal, autoClick: false},
            (resp) => {
                if (resp?.ok) {
                    out.textContent = `Step: ${resp.reason || 'highlighted'}\nSelector: ${resp.selector || '(none)'}`;
                } else {
                    out.textContent = `Failed: ${resp?.error || 'unknown'}`;
                }
                nextBtn.disabled = false;
            }
        );
    };
    document.body.appendChild(document.createElement('hr'));
    document.body.appendChild(nextBtn);
}


