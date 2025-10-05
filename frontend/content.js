function buildSelector(el) {
  if (!el || el.nodeType !== 1) return "";
  const id = el.getAttribute("id");
  if (id) return `#${CSS.escape(id)}`;
  const aria = el.getAttribute("aria-label");
  if (aria) return `${el.tagName.toLowerCase()}[aria-label="${aria}"]`;
  const name = el.getAttribute("name");
  if (name) return `${el.tagName.toLowerCase()}[name="${name}"]`;
  const role = el.getAttribute("role");
  if (role) return `${el.tagName.toLowerCase()}[role="${role}"]`;
  const type = el.getAttribute("type");
  if (type) return `${el.tagName.toLowerCase()}[type="${type}"]`;
  const cls = (el.className || "").toString().trim().replace(/\s+/g, ".");
  if (cls) return `${el.tagName.toLowerCase()}.${cls}`;
  return el.tagName.toLowerCase();
}

function highlight(el) {
  const prev = el.style.outline;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.style.outline = "10px solid #00bcd4";
  setTimeout(() => (el.style.outline = prev), 10000);
}

function waitForDomChange(timeoutMs = 3500) {
  return new Promise((resolve) => {
    let changed = false;
    const obs = new MutationObserver(() => {
      changed = true;
      obs.disconnect();
      resolve(true);
    });
    obs.observe(document.body, { childList: true, subtree: true, attributes: true });
    setTimeout(() => { obs.disconnect(); resolve(changed); }, timeoutMs);
  });
}

function collectButtons(limit = 60) {
  const CLICKABLES =
    "button, a, [role='button'], input[type='button'], input[type='submit'], [onclick], [tabindex]:not([tabindex='-1'])";

  const nodes = Array.from(document.querySelectorAll(CLICKABLES));
  const out = [];

  for (const el of nodes) {
    const r = el.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0)) continue;

    const label = (
      el.getAttribute("aria-label") ||
      el.textContent ||
      el.value ||
      el.getAttribute("title") ||
      ""
    ).trim().replace(/\s+/g, " ");

    if (!label) continue;

    out.push({
      tag: el.tagName.toLowerCase(),
      text: label.slice(0, 80),
      selector: buildSelector(el)
    });

    if (out.length >= limit) break;
  }
  return out;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  if (request.action === "GET_ELEMENTS_DATA_ONLY") { 
    const buttons = collectButtons(60);
    sendResponse({ ok: true, elements: buttons }); 
    return;
  }

  if (request.action === "HIGHLIGHT") {
    (async () => {
        const selector = request?.selector || ""; 
        
        if (!selector) { 
            sendResponse({ ok: false, error: "no selector" }); 
            return;
        }
        
        const el = document.querySelector(selector);
        
        if (!el) { 
            sendResponse({ ok: false, error: "element not found" }); 
            return;
        }
        
        highlight(el);
        
        sendResponse({ ok: true });
    })();

    return true; 
  }

  if (request.action === "CLICK_AND_WAIT") {
    (async () => {
      const selector = request?.selector || "";
      const el = selector ? document.querySelector(selector) : null;

      if (!el) { sendResponse({ ok: false, changed: false, error: "element not found" }); return; }

      highlight(el);
      const changed = await waitForDomChange(3500);
      sendResponse({ ok: true, changed });
    })();

    return true;
  } 
});
