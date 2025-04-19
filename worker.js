console.log("Worker loaded");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "login":
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          console.error("Auth error:", chrome.runtime.lastError);
          sendResponse({
            success: false,
            error: chrome.runtime.lastError.message,
          });
        } else {
          console.log("Token:", token);

          fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: {
              Authorization: "Bearer " + token,
            },
          })
            .then((res) => res.json())
            .then((user) => {
              // console.log("User info:", user);
              sendResponse({ success: true, token, user });
            })
            .catch((err) => {
              console.error("Fetch error:", err);
              sendResponse({ success: false, error: err.message });
            });
        }
      });
      return true;
    case "logout":
      const token = message.token;
      console.log("Logging out token:", token);

      (async () => {
        if (!token) {
          sendResponse({ success: false, error: "No token provided" });
          return;
        }

        chrome.identity.removeCachedAuthToken({ token }, () => {
          if (chrome.runtime.lastError) {
            console.error("Logout error:", chrome.runtime.lastError.message);
            sendResponse({
              success: false,
              error: chrome.runtime.lastError.message,
            });
          } else {
            console.log("Logout success");
            sendResponse({ success: true });
          }
        });
      })();

      return true;
  }
});
