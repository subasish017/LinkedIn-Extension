// Default backend URL — update this to your deployed EC2 domain
const DEFAULT_API_BASE = "http://localhost:8000";

async function getApiBase() {
  const { apiBase } = await chrome.storage.sync.get({ apiBase: DEFAULT_API_BASE });
  return apiBase;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "setApiBase") {
    chrome.storage.sync.set({ apiBase: request.url }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === "getApiBase") {
    getApiBase().then((url) => sendResponse({ success: true, url }));
    return true;
  }
  if (request.action === "analyzeProfile") {
    getApiBase().then((apiBase) =>
      fetch(`${apiBase}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request.profile),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`Server error: ${res.status}`);
          return res.json();
        })
        .then((data) => sendResponse({ success: true, data }))
        .catch((err) => sendResponse({ success: false, error: err.message }))
    );
    return true;
  }

  if (request.action === "matchProfile") {
    getApiBase().then((apiBase) =>
      fetch(`${apiBase}/api/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: request.profile,
          job_description: request.jobDescription,
          cv_text: request.cvText || "",
        }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`Server error: ${res.status}`);
          return res.json();
        })
        .then((data) => sendResponse({ success: true, data }))
        .catch((err) => sendResponse({ success: false, error: err.message }))
    );
    return true;
  }
});
