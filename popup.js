const sendBtn = document.getElementById("sendBtn");
const statusEl = document.getElementById("status");

function setStatus(text, type) {
  statusEl.textContent = text;
  statusEl.className = type || "";
}

sendBtn.addEventListener("click", async () => {
  sendBtn.disabled = true;
  sendBtn.textContent = "Sending...";
  setStatus("Extracting and sending the BDJobs token...", "");

  try {
    const result = await chrome.runtime.sendMessage({
      type: "SEND_ACCESS_TOKEN"
    });

    if (!result || !result.ok) {
      throw new Error(
        result && result.error
          ? result.error
          : "Could not send the BDJobs token."
      );
    }

    setStatus("BDJobs token sent successfully.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = "Send Token";
  }
});