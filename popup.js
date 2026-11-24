
const $ = (id) => document.getElementById(id);

async function loadSettings() {
  const settings = await chrome.storage.local.get([
    "sourceUrl",
    "backendUrl",
    "apiKey"
  ]);

  if (settings.sourceUrl) {
    $("sourceUrl").value = settings.sourceUrl;
  }

  if (settings.backendUrl) {
    $("backendUrl").value = settings.backendUrl;
  }

  if (settings.apiKey) {
    $("apiKey").value = settings.apiKey;
  }
}

function isValidUrl(value) {
  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" ||
      (
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname)
      )
    );
  } catch {
    return false;
  }
}

async function saveSettings() {
  const sourceUrl = $("sourceUrl").value.trim();
  const backendUrl = $("backendUrl").value.trim();
  const apiKey = $("apiKey").value;

  if (!isValidUrl(sourceUrl) || !isValidUrl(backendUrl)) {
    throw new Error("Please provide valid API URLs.");
  }

  const backendOrigin = new URL(backendUrl).origin;

  const granted = await chrome.permissions.request({
    origins: [`${backendOrigin}/*`]
  });

  if (!granted) {
    throw new Error("Backend permission was not granted.");
  }

  await chrome.storage.local.set({
    sourceUrl,
    backendUrl,
    apiKey
  });
}

$("saveBtn").addEventListener("click", async () => {
  try {
    await saveSettings();

    $("status").textContent = "Settings saved successfully.";
  } catch (error) {
    $("status").textContent = error.message;
  }
});

$("syncBtn").addEventListener("click", async () => {
  const button = $("syncBtn");

  try {
    button.disabled = true;
    $("status").textContent = "Fetching BDJobs data...";

    await saveSettings();

    const result = await chrome.runtime.sendMessage({
      type: "SYNC_JOBS"
    });

    if (!result?.ok) {
      throw new Error(result?.error || "Sync failed.");
    }

    $("status").textContent =
      `Successfully synchronized ${result.count} jobs.`;

  } catch (error) {
    $("status").textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

$("sendTokenBtn").addEventListener("click", async () => {
  const button = $("sendTokenBtn");

  try {
    button.disabled = true;
    $("status").textContent = "Extracting BDJobs access token...";

    await saveSettings();

    const result = await chrome.runtime.sendMessage({
      type: "SEND_ACCESS_TOKEN"
    });

    if (!result?.ok) {
      throw new Error(result?.error || "Could not send access token.");
    }

    $("status").textContent =
      "BDJobs access token sent successfully.";
  } catch (error) {
    $("status").textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

loadSettings();
