// LinkedIn Profile DOM Extractor
// Uses heading-based section detection for resilience against class name changes

function getTextContent(selector) {
  const el = document.querySelector(selector);
  return el ? el.textContent.trim() : "";
}

function findSectionByHeading(headingText) {
  const headings = document.querySelectorAll(
    "section h2, section h3, #profile-content h2"
  );
  for (const heading of headings) {
    const spans = heading.querySelectorAll("span");
    for (const span of spans) {
      if (
        span.textContent.trim().toLowerCase().includes(headingText.toLowerCase())
      ) {
        return heading.closest("section");
      }
    }
    if (
      heading.textContent.trim().toLowerCase().includes(headingText.toLowerCase())
    ) {
      return heading.closest("section");
    }
  }
  return null;
}

function extractSectionText(headingText) {
  const section = findSectionByHeading(headingText);
  if (!section) return "";
  const clone = section.cloneNode(true);
  // Remove the heading itself to avoid duplication
  const h2 = clone.querySelector("h2");
  if (h2) h2.remove();
  // Remove "Show all" buttons
  clone.querySelectorAll("button").forEach((btn) => {
    if (btn.textContent.includes("Show all")) btn.remove();
  });
  return clone.textContent.replace(/\s+/g, " ").trim();
}

function extractName() {
  // Primary: h1 tag on profile page
  const h1 = document.querySelector("h1");
  if (h1) return h1.textContent.trim();
  return "";
}

function extractHeadline() {
  // LinkedIn puts headline in a div right after the name section
  const el = document.querySelector(".text-body-medium");
  if (el) return el.textContent.trim();
  // Fallback: look for aria-label or data attributes
  const profileCard = document.querySelector(".pv-text-details__left-panel");
  if (profileCard) {
    const children = profileCard.querySelectorAll("div");
    if (children.length > 1) return children[1].textContent.trim();
  }
  return "";
}

function extractLocation() {
  const el = document.querySelector(".text-body-small.inline.t-black--light");
  if (el) return el.textContent.trim();
  // Fallback
  const spans = document.querySelectorAll("span.t-black--light");
  for (const span of spans) {
    if (span.closest(".pv-text-details__left-panel")) {
      return span.textContent.trim();
    }
  }
  return "";
}

function extractAbout() {
  const section = findSectionByHeading("About");
  if (!section) return "";
  // About text is often in a span with specific visibility classes
  const spans = section.querySelectorAll(
    "span[aria-hidden='true'], .pv-shared-text-with-see-more span"
  );
  for (const span of spans) {
    const text = span.textContent.trim();
    if (text.length > 30) return text;
  }
  // Fallback: get all visible text from the section body
  return extractSectionText("About");
}

function extractSkills() {
  const section = findSectionByHeading("Skills");
  if (!section) return "";
  const items = section.querySelectorAll(
    "span.hoverable-link-text, a[data-field='skill_page_skill_topic'] span"
  );
  if (items.length > 0) {
    return Array.from(items)
      .map((el) => el.textContent.trim())
      .filter(Boolean)
      .join(", ");
  }
  return extractSectionText("Skills");
}

function extractProfileData() {
  return {
    name: extractName(),
    headline: extractHeadline(),
    location: extractLocation(),
    about: extractAbout(),
    experience: extractSectionText("Experience"),
    education: extractSectionText("Education"),
    skills: extractSkills(),
    certifications: extractSectionText("Certifications") || extractSectionText("Licenses"),
    recommendations: extractSectionText("Recommendations"),
    url: window.location.href,
  };
}

// --- LinkedIn Job Page Extractor ---

function extractJobData() {
  // Job title — multiple fallback selectors
  const titleSelectors = [
    "h1.t-24.t-bold.inline",
    "h1.t-24",
    "h1.job-details-jobs-unified-top-card__job-title",
    ".jobs-unified-top-card__job-title",
    "h1[class*='job-title']",
    "h1[class*='topcard']",
    ".job-details-jobs-unified-top-card__job-title a",
    "h1",
  ];
  let title = "";
  for (const sel of titleSelectors) {
    const el = document.querySelector(sel);
    if (el && el.textContent.trim()) {
      title = el.textContent.trim();
      break;
    }
  }

  // Company name
  const companySelectors = [
    ".job-details-jobs-unified-top-card__company-name a",
    ".job-details-jobs-unified-top-card__company-name",
    ".jobs-unified-top-card__company-name a",
    ".jobs-unified-top-card__company-name",
    "[data-tracking-control-name='public_jobs_topcard-org-name']",
    ".job-details-jobs-unified-top-card__primary-description-container a",
    "[class*='topcard'] [class*='company'] a",
    "[class*='topcard'] [class*='company']",
  ];
  let company = "";
  for (const sel of companySelectors) {
    const el = document.querySelector(sel);
    if (el && el.textContent.trim()) {
      company = el.textContent.trim();
      break;
    }
  }

  // Location
  const locationSelectors = [
    ".job-details-jobs-unified-top-card__primary-description-container .tvm__text",
    ".jobs-unified-top-card__bullet",
    ".job-details-jobs-unified-top-card__workplace-type",
    "[class*='topcard'] [class*='bullet']",
    "[class*='topcard'] [class*='location']",
    "[class*='topcard'] [class*='workplace']",
  ];
  let location = "";
  for (const sel of locationSelectors) {
    const el = document.querySelector(sel);
    if (el && el.textContent.trim()) {
      location = el.textContent.trim();
      break;
    }
  }

  // Job description — the main body text
  const descSelectors = [
    "#job-details",
    ".jobs-description__content",
    ".jobs-description-content__text",
    ".jobs-box__html-content",
    ".jobs-description",
    "[class*='jobs-description']",
    "[class*='job-details-about-the-job-module']",
    ".jobs-unified-description__content",
    "article[class*='jobs-description']",
    "[class*='description__text']",
  ];
  let description = "";
  for (const sel of descSelectors) {
    const el = document.querySelector(sel);
    if (el && el.textContent.trim().length > 50) {
      description = el.textContent.replace(/\s+/g, " ").trim();
      break;
    }
  }

  // Fallback 1: grab the largest text block in the job detail pane
  if (!description) {
    const candidates = document.querySelectorAll(
      ".jobs-search__job-details--wrapper article, .scaffold-layout__detail .jobs-box, .scaffold-layout__detail article, .scaffold-layout__detail section, .job-view-layout article, [class*='job-details'] article, [class*='job-details'] section"
    );
    let longest = "";
    candidates.forEach((el) => {
      const text = el.textContent.replace(/\s+/g, " ").trim();
      if (text.length > longest.length) longest = text;
    });
    if (longest.length > 100) description = longest;
  }

  // Fallback 2: look for any element with "description" in its class/id containing substantial text
  if (!description) {
    const allEls = document.querySelectorAll("[class*='description'], [id*='description']");
    let longest = "";
    allEls.forEach((el) => {
      const text = el.textContent.replace(/\s+/g, " ").trim();
      if (text.length > longest.length) longest = text;
    });
    if (longest.length > 100) description = longest;
  }

  // Fallback 3: scan the detail/right pane for the largest text block overall
  if (!description) {
    const pane = document.querySelector(
      ".scaffold-layout__detail, .job-view-layout, [class*='job-details'], main"
    );
    if (pane) {
      const blocks = pane.querySelectorAll("div, section, article");
      let longest = "";
      blocks.forEach((el) => {
        // Skip elements that are mostly made up of child blocks (nav, headers, etc.)
        const directText = el.textContent.replace(/\s+/g, " ").trim();
        if (directText.length > longest.length && directText.length > 200) {
          longest = directText;
        }
      });
      if (longest.length > 100) description = longest;
    }
  }

  return { title, company, location, description };
}

// Listen for messages from the popup/background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractProfile") {
    const data = extractProfileData();
    sendResponse(data);
  }
  if (request.action === "extractJob") {
    const data = extractJobData();
    sendResponse(data);
  }
  return true; // keep message channel open for async response
});
