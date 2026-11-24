function countJobs(payload) {
  if (Array.isArray(payload)) {
    return payload.length;
  }

  if (!payload || typeof payload !== "object") {
    return 0;
  }

  const keys = [
    "data",
    "Data",
    "jobs",
    "Jobs",
    "result",
    "results",
    "Result"
  ];

  for (const key of keys) {
    if (Array.isArray(payload[key])) {
      return payload[key].length;
    }
  }

  return 0;
}

function backendHeaders(apiKey) {
  const headers = {
    "Content-Type": "application/json"
  };

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  return headers;
}

async function getAccessTokenCookie() {
  const cookies = await chrome.cookies.getAll({
    name: "AccessTokenForJobseeker"
  });

  const cookie = cookies.find((item) =>
    item.domain === ".bdjobs.com" ||
    item.domain === "bdjobs.com" ||
    item.domain.endsWith(".bdjobs.com")
  );

  if (!cookie) {
    throw new Error(
      "AccessTokenForJobseeker was not found. Sign in to BDJobs first."
    );
  }

  return cookie.value;
}

async function sendAccessToken() {
  const { backendUrl, apiKey } = await chrome.storage.local.get([
    "backendUrl",
    "apiKey"
  ]);

  if (!backendUrl) {
    throw new Error("Backend API URL is not configured.");
  }

  const accessToken = await getAccessTokenCookie();
  const response = await fetch(backendUrl, {
    method: "POST",
    headers: backendHeaders(apiKey),
    body: JSON.stringify({
      source: "bdjobs",
      extractedAt: new Date().toISOString(),
      accessTokenForJobseeker: accessToken
    })
  });

  if (!response.ok) {
    throw new Error(`Backend API error: ${response.status}`);
  }

  let result = null;
  try {
    result = await response.json();
  } catch {
    result = null;
  }

  return { ok: true, result };
}

chrome.runtime.onMessage.addListener(
  (message, sender, sendResponse) => {
    if (
      message.type !== "SYNC_JOBS" &&
      message.type !== "SEND_ACCESS_TOKEN"
    ) {
      return;
    }

    (async () => {
      if (message.type === "SEND_ACCESS_TOKEN") {
        return sendAccessToken();
      }

      const {
        sourceUrl,
        backendUrl,
        apiKey
      } = await chrome.storage.local.get([
        "sourceUrl",
        "backendUrl",
        "apiKey"
      ]);

      if (!sourceUrl || !backendUrl) {
        throw new Error("API URLs are not configured.");
      }

      const bdjobsResponse = await fetch(sourceUrl, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json"
        }
      });

      if (!bdjobsResponse.ok) {
        throw new Error(`BDJobs API error: ${bdjobsResponse.status}`);
      }

      const jobsData = await bdjobsResponse.json();
      const totalJobs = countJobs(jobsData);

      const backendResponse = await fetch(backendUrl, {
        method: "POST",
        headers: backendHeaders(apiKey),
        body: JSON.stringify({
          source: "bdjobs",
          fetchedAt: new Date().toISOString(),
          count: totalJobs,
          jobs: jobsData
        })
      });

      if (!backendResponse.ok) {
        throw new Error(
          `Backend API error: ${backendResponse.status}`
        );
      }

      return {
        ok: true,
        count: totalJobs,
        result: await backendResponse.json()
      };
    })()
      .then(sendResponse)
      .catch(error => {
        sendResponse({
          ok: false,
          error: error.message
        });
      });

    return true;
  }
);
