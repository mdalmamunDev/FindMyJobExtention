const BACKEND_URL =
  "https://fb8dhvtj-3000.inc1.devtunnels.ms/api/sync/token";

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
  const accessToken = await getAccessTokenCookie();
  const response = await fetch(BACKEND_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
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
    if (message.type !== "SEND_ACCESS_TOKEN") {
      return;
    }

    sendAccessToken()
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          ok: false,
          error: error.message
        });
      });

    return true;
  }
);
