// --- Page Type Detection ---
function getPageType(url) {
  if (!url) return "other";
  if (url.includes("linkedin.com/in/")) return "profile";
  if (url.includes("linkedin.com/jobs/")) return "job";
  return "other";
}

// --- Chrome Storage Helpers ---
async function getSavedProfile() {
  return new Promise((resolve) => {
    chrome.storage.local.get("savedProfile", (result) => {
      resolve(result.savedProfile || null);
    });
  });
}

async function saveProfile(profile) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ savedProfile: profile }, resolve);
  });
}

async function clearSavedProfile() {
  return new Promise((resolve) => {
    chrome.storage.local.remove("savedProfile", resolve);
  });
}

// --- CV Storage Helpers ---
async function getSavedCV() {
  return new Promise((resolve) => {
    chrome.storage.local.get("savedCV", (result) => {
      resolve(result.savedCV || null);
    });
  });
}

async function saveCV(cvText) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ savedCV: cvText }, resolve);
  });
}

async function clearSavedCV() {
  return new Promise((resolve) => {
    chrome.storage.local.remove("savedCV", resolve);
  });
}

// --- Utility ---
function setVisible(id, visible) {
  document.getElementById(id).classList.toggle("hidden", !visible);
}

function animateScore(circleId, valueId, score, color) {
  const circle = document.getElementById(circleId);
  const valueEl = document.getElementById(valueId);
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (score / 100) * circumference;
  circle.style.stroke = color;
  circle.style.strokeDashoffset = offset;
  let current = 0;
  const step = Math.max(1, Math.floor(score / 30));
  const interval = setInterval(() => {
    current += step;
    if (current >= score) {
      current = score;
      clearInterval(interval);
    }
    valueEl.textContent = current;
  }, 30);
}

function renderList(containerId, items, prefix) {
  const el = document.getElementById(containerId);
  el.innerHTML = items.map((item) => `<li>${prefix} ${item}</li>`).join("");
}

function renderBadges(containerId, items, badgeClass) {
  const el = document.getElementById(containerId);
  el.innerHTML = items.map((item) => `<span class="badge ${badgeClass}">${item}</span>`).join("");
}

function getScoreColor(score) {
  if (score >= 75) return "#059669";
  if (score >= 50) return "#d97706";
  return "#dc2626";
}

// --- Extract Profile from Active Tab ---
async function extractProfile() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url || !tab.url.includes("linkedin.com/in/")) {
    throw new Error("Please navigate to a LinkedIn profile page first.");
  }
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });
  } catch {
    // Script may already be injected
  }
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tab.id, { action: "extractProfile" }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error("Could not read profile. Try refreshing the LinkedIn page."));
        return;
      }
      if (!response || !response.name) {
        reject(new Error("No profile data found. Make sure you're on a full LinkedIn profile."));
        return;
      }
      resolve(response);
    });
  });
}

// --- Extract Job Description from Active Tab ---
async function extractJobDescription() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });
  } catch {
    // Script may already be injected
  }

  // Retry up to 3 times with delays — LinkedIn loads job details dynamically
  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 1000));
      // Re-inject to pick up newly loaded DOM
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content.js"],
        });
      } catch {
        // ignore
      }
    }

    const response = await new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id, { action: "extractJob" }, (res) => {
        if (chrome.runtime.lastError) {
          resolve(null);
          return;
        }
        resolve(res);
      });
    });

    if (response && response.description) {
      return response;
    }
  }

  throw new Error(
    "Could not extract job description from this page. Make sure a job is selected and fully loaded, then try again."
  );
}

// --- Render Saved Profile Bar ---
async function renderSavedProfileBar() {
  const profile = await getSavedProfile();
  if (profile) {
    document.getElementById("saved-profile-name").textContent =
      `Saved: ${profile.name}`;
    setVisible("saved-profile-bar", true);
  } else {
    setVisible("saved-profile-bar", false);
  }
}

// --- Render Saved CV Bar ---
async function renderSavedCVBar() {
  const cv = await getSavedCV();
  setVisible("saved-cv-bar", !!cv);
}

// --- Get Verdict from Score ---
function getVerdict(score) {
  if (score >= 70) return { text: "Yes, Apply!", className: "verdict-apply" };
  if (score >= 45) return { text: "Worth Considering", className: "verdict-maybe" };
  return { text: "Probably Skip", className: "verdict-skip" };
}

// --- Init Popup ---
async function initPopup() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const pageType = getPageType(tab?.url);
  const contextBar = document.getElementById("context-bar");

  await renderSavedProfileBar();
  await renderSavedCVBar();

  // Show CV upload section whenever a profile is saved (regardless of page)
  const savedProfile = await getSavedProfile();
  const savedCV = await getSavedCV();
  if (savedProfile && !savedCV) {
    setVisible("cv-upload-section", true);
  }

  if (pageType === "profile") {
    contextBar.textContent = "LinkedIn Profile detected";
    contextBar.style.background = "#dbeafe";
    contextBar.style.color = "#1e40af";
    setVisible("context-bar", true);
    setVisible("panel-profile", true);
  } else if (pageType === "job") {
    contextBar.textContent = "LinkedIn Job Listing detected";
    contextBar.style.background = "#d1fae5";
    contextBar.style.color = "#065f46";
    setVisible("context-bar", true);

    const profile = await getSavedProfile();
    if (!profile) {
      setVisible("panel-no-profile", true);
      return;
    }

    setVisible("panel-job", true);

    // Show CV status in job panel
    const cv = await getSavedCV();
    const cvStatusEl = document.getElementById("job-cv-status");
    if (cv) {
      cvStatusEl.textContent = "CV loaded — will be used for matching";
      cvStatusEl.style.background = "#ede9fe";
      cvStatusEl.style.color = "#5b21b6";
      setVisible("job-cv-status", true);
    } else {
      cvStatusEl.textContent = "No CV uploaded — matching with profile only";
      cvStatusEl.style.background = "#f3f4f6";
      cvStatusEl.style.color = "#6b7280";
      setVisible("job-cv-status", true);
    }

    // Pre-extract job preview
    try {
      const jobData = await extractJobDescription();
      document.getElementById("job-preview-title").textContent =
        jobData.title || "Job Listing";
      document.getElementById("job-preview-company").textContent =
        jobData.company || "";
      document.getElementById("job-preview-location").textContent =
        jobData.location || "";
    } catch {
      document.getElementById("job-preview-title").textContent = "Job Listing";
    }
  } else {
    setVisible("panel-wrong-page", true);
  }
}

// --- Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
  initPopup().catch((err) => {
    console.error("initPopup failed:", err);
    // Fallback: show wrong-page panel so popup isn't blank
    setVisible("panel-wrong-page", true);
  });

  // Analyze button
  document.getElementById("btn-analyze").addEventListener("click", async () => {
    setVisible("analyze-result", false);
    setVisible("analyze-error", false);
    setVisible("analyze-loading", true);
    document.getElementById("btn-analyze").disabled = true;

    try {
      const profile = await extractProfile();
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { action: "analyzeProfile", profile },
          (res) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            if (!res.success) {
              reject(new Error(res.error || "Analysis failed"));
              return;
            }
            resolve(res.data);
          }
        );
      });

      const color = getScoreColor(response.score);
      animateScore("score-circle", "score-value", response.score, color);
      document.getElementById("analyze-summary").textContent = response.summary;
      renderList("analyze-strengths", response.strengths, "\u2713");
      renderList("analyze-suggestions", response.suggestions, "\u2192");
      renderBadges("analyze-skills", response.skills_found, "badge-blue");

      // Store extracted profile data for save button
      document.getElementById("btn-save-profile").dataset.profile =
        JSON.stringify(await extractProfile());

      setVisible("analyze-loading", false);
      setVisible("analyze-result", true);
    } catch (err) {
      setVisible("analyze-loading", false);
      document.getElementById("analyze-error").textContent = err.message;
      setVisible("analyze-error", true);
    } finally {
      document.getElementById("btn-analyze").disabled = false;
    }
  });

  // Save Profile button
  document.getElementById("btn-save-profile").addEventListener("click", async () => {
    try {
      const profileJSON = document.getElementById("btn-save-profile").dataset.profile;
      if (profileJSON) {
        await saveProfile(JSON.parse(profileJSON));
      } else {
        const profile = await extractProfile();
        await saveProfile(profile);
      }
      await renderSavedProfileBar();
      const btn = document.getElementById("btn-save-profile");
      btn.textContent = "Profile Saved!";
      btn.disabled = true;
      btn.classList.remove("bg-green-600", "hover:bg-green-700");
      btn.classList.add("bg-gray-400");
      // Show CV upload section after profile save
      setVisible("cv-upload-section", true);
    } catch (err) {
      document.getElementById("analyze-error").textContent = err.message;
      setVisible("analyze-error", true);
    }
  });

  // CV file upload handler
  document.getElementById("cv-file-input").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const statusEl = document.getElementById("cv-upload-status");
    statusEl.textContent = "Uploading CV...";
    statusEl.style.color = "#6b7280";
    setVisible("cv-upload-status", true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("http://localhost:8000/api/upload-cv", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || `Upload failed: ${res.status}`);
      }

      const data = await res.json();
      await saveCV(data.cv_text);
      await renderSavedCVBar();

      statusEl.textContent = "CV uploaded successfully!";
      statusEl.style.color = "#059669";
      // Hide upload section after short delay, CV bar at top shows status
      setTimeout(() => setVisible("cv-upload-section", false), 1500);
    } catch (err) {
      statusEl.textContent = err.message;
      statusEl.style.color = "#dc2626";
    }
  });

  // Clear Saved CV button
  document.getElementById("btn-clear-cv").addEventListener("click", async () => {
    await clearSavedCV();
    await renderSavedCVBar();
    // Reset file input and status, re-show upload section
    document.getElementById("cv-file-input").value = "";
    setVisible("cv-upload-status", false);
    const profile = await getSavedProfile();
    if (profile) {
      setVisible("cv-upload-section", true);
    }
  });

  // Clear Saved Profile button
  document.getElementById("btn-clear-profile").addEventListener("click", async () => {
    await clearSavedProfile();
    await clearSavedCV();
    await renderSavedProfileBar();
    await renderSavedCVBar();
    setVisible("cv-upload-section", false);
  });

  // Should I Apply? button
  document.getElementById("btn-should-apply").addEventListener("click", async () => {
    setVisible("job-result", false);
    setVisible("job-error", false);
    setVisible("job-loading", true);
    document.getElementById("btn-should-apply").disabled = true;

    try {
      const profile = await getSavedProfile();
      if (!profile) throw new Error("No saved profile found.");

      const jobData = await extractJobDescription();
      if (!jobData.description) throw new Error("Could not extract job description.");

      const cvText = (await getSavedCV()) || "";

      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { action: "matchProfile", profile, jobDescription: jobData.description, cvText },
          (res) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            if (!res.success) {
              reject(new Error(res.error || "Matching failed"));
              return;
            }
            resolve(res.data);
          }
        );
      });

      // Render verdict
      const verdict = getVerdict(response.match_percentage);
      const verdictEl = document.getElementById("job-verdict");
      verdictEl.textContent = `${verdict.text} (${response.match_percentage}%)`;
      verdictEl.className = `verdict-banner ${verdict.className}`;

      // Render score ring
      const color = getScoreColor(response.match_percentage);
      animateScore("match-circle", "match-value", response.match_percentage, color);

      // Render details
      document.getElementById("match-summary").textContent = response.summary;
      renderBadges("match-matching-skills", response.matching_skills, "badge-green");
      renderBadges("match-missing-skills", response.missing_skills, "badge-red");
      renderList("match-suggestions", response.suggestions, "\u2192");

      setVisible("job-loading", false);
      setVisible("job-result", true);
    } catch (err) {
      setVisible("job-loading", false);
      document.getElementById("job-error").textContent = err.message;
      setVisible("job-error", true);
    } finally {
      document.getElementById("btn-should-apply").disabled = false;
    }
  });
});
