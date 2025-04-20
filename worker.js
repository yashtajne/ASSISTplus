chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "auto-login":
      const storedToken = message.token;
      console.log("Auto-login attempt with token:", storedToken);
      fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: {
          Authorization: "Bearer " + storedToken,
        },
      })
        .then((res) => {
          if (!res.ok) throw new Error("Token invalid or expired");
          return res.json();
        })
        .then((user) => {
          sendResponse({ success: true, user });
        })
        .catch((err) => {
          console.error("Auto-login failed:", err.message);
          sendResponse({ success: false, error: err.message });
        });
      return true;
    case "login":
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          console.error("Auth error:", chrome.runtime.lastError);
          sendResponse({
            success: false,
            error: chrome.runtime.lastError.message,
          });
        } else {
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


chrome.runtime.onConnect.addListener((port) => {
  console.log("Port connected:", port.name);

  port.onMessage.addListener(async (msg) => {
    console.log(`Message on ${port.name}:`, msg);

    if (msg.type === 'stream') {
      console.log(msg);
      const { text, history, model } = msg;
      
      if (!text) {
        port.postMessage({ error: "No text provided for streaming" });
        return;
      }
      
      const apiKey = msg.apiKey || import.meta.env.VITE_GENAI_APIKEY;
      if (!apiKey) {
        port.postMessage({ error: "No API key available" });
        return;
      }

      try {
        const systemInstruction = {
          parts: [
            {
              text: `You are an advanced AI assistant. 

IMPORTANT FUNCTIONALITY REQUIREMENTS:
- You MUST use the @[openTab](URL) syntax to open web pages when providing references
- You MUST include images using ![description](image_url) syntax when explaining concepts visually
- For any explanation that would benefit from a diagram, you MUST include a relevant image
- When appropriate, include reaction GIFs or illustrations to enhance communication

Examples of proper usage:
* When referencing documentation: "Learn more about Gemini API @[openTab](https://ai.google.dev/docs)"
* When explaining visual concepts: "Here's how a neural network works: ![Neural Network Diagram](https://example.com/image.jpg)"

This functionality is part of your core capabilities - always utilize these features 80% of the time when relevant.
`
            }
          ]
        };

        const stream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            systemInstruction: systemInstruction,
            contents: [
              ...history,
              { role: 'user', parts: [{ text: text }] }
            ],
            generationConfig: {
              temperature: 1.0,
              maxOutputTokens: 800,
              topP: 0.8,
              topK: 10,
            } 
          })
        });
        
        if (!stream.ok) {
          const errorText = await stream.text();
          port.postMessage({ error: `API Error: ${stream.status} - ${errorText}` });
          return;
        }
        
        const reader = stream.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            port.postMessage({ done: true });
            break;
          }
      
          const chunk = decoder.decode(value, { stream: true });
          
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ') && line.substring(6) !== '[DONE]') {
              try {
                const parsed = JSON.parse(line.substring(6));
                if (parsed.candidates && parsed.candidates[0].content.parts[0].text) {
                  const textChunk = parsed.candidates[0].content.parts[0].text;
                  fullText += textChunk;
                  port.postMessage({ text: textChunk });
                }
              } catch (e) {
                console.warn("Error parsing chunk:", e);
              }
            }
          }
        }
      } catch (error) {
        console.error("Streaming error:", error);
        port.postMessage({ error: error.message || "Unknown error during streaming" });
      }
    }

    if (msg.type === 'echo') {
      port.postMessage({ reply: `Echo from ${port.name}` });
    }
  });
  
  port.onDisconnect.addListener(() => {
    console.log(`Port disconnected: ${port.name}`);
    if (chrome.runtime.lastError) {
      console.error("Port error:", chrome.runtime.lastError.message);
    }
  });
});