import { useRef, useState, useEffect } from "react";
import {
  IoSettingsSharp,
  IoTrash,
  IoLogoGoogle,
  IoLogoDiscord,
  IoDownload,
  IoShare,
  IoExit,
  IoMailUnread,
  IoClose,
} from "react-icons/io5";
import ReactMarkdown from "react-markdown";
import { modelOptions } from "../lib/ai";

import ActionBar from "./components/ActionBar";
import Modal from "./components/Modal";
import DefaultPfp from "./assets/guest.png";
import Dropdown from "./components/Dropdown";

import "./assets/Colors.css";
import "./App.css";

export default function App() {
  const [isSettingsPageOpened, setSettingsPageOpened] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedModel, setSelectedModel] = useState(modelOptions[0]);

  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem("chatMessages");
    return saved ? JSON.parse(saved) : [];
  });
  const chatViewRef = useRef(null);

  const [requestCount, setRequestCount] = useState(0);
  const [lastRequestTime, setLastRequestTime] = useState(Date.now());
  const [timeUntilReset, setTimeUntilReset] = useState(0);
  const MAX_REQUESTS = 5;
  const TIME_WINDOW = 60000;

  const [user, setUser] = useState(null);

  useEffect(() => {
    localStorage.setItem("chatMessages", JSON.stringify(messages));
    if (chatViewRef.current) {
      chatViewRef.current.scrollTop = chatViewRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRequestCount(0);
    }, TIME_WINDOW);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (token) {
      chrome.runtime.sendMessage({ type: "login" }, (res) => {
        console.log("Response:", res);
        if (res.success) {
          setUser(res.user);
        }
      });
    }
  }, []);

  useEffect(() => {
    let timer;
    if (requestCount >= MAX_REQUESTS) {
      const resetTime = lastRequestTime + TIME_WINDOW;
      timer = setInterval(() => {
        const remaining = Math.ceil((resetTime - Date.now()) / 1000);
        setTimeUntilReset(remaining > 0 ? remaining : 0);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [requestCount, lastRequestTime]);

  const handleSend = async (msg) => {
    if (msg.trim() === "") return;

    const currentTime = Date.now();
    if (currentTime - lastRequestTime > TIME_WINDOW) {
      setRequestCount(0);
      setLastRequestTime(currentTime);
    } else if (requestCount >= MAX_REQUESTS) {
      alert("Rate limit exceeded! Try again in a minute.");
      return;
    }

    setIsSending(true);

    setRequestCount((prev) => prev + 1);
    setLastRequestTime(currentTime);

    const updatedMessages = [
      ...messages,
      { parts: [{ text: msg }], role: "user" },
    ];
    setMessages(updatedMessages);

    try {
      const port = chrome.runtime.connect({ name: "ai-stream" });
      let fullResponse = "";

      port.postMessage({
        type: "stream",
        text: msg,
        history: messages || [],
        model: selectedModel.value,
      });

      setMessages((prev) => [
        ...prev,
        { parts: [{ text: "" }], role: "model" },
      ]);

      port.onMessage.addListener((response) => {
        if (response.error) {
          console.error("Stream error:", response.error);
          setMessages((prev) => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = {
              parts: [{ text: "Error: " + response.error }],
              role: "model",
            };
            return newMessages;
          });
        } else if (response.text) {
          fullResponse += response.text;

          const openTabRegex = /@\[openTab\]\((.*?)\)/g;
          const match = response.text.match(openTabRegex);
          if (match) {
            match.forEach((matchedText) => {
              const url = matchedText.replace(/@\[openTab\]\(|\)/g, "");
              console.log(`openTab: ${url}`);
              chrome.windows.create({
                url: url,
                type: "normal",
              });
            });
          }

          setMessages((prev) => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = {
              parts: [{ text: fullResponse }],
              role: "model",
            };
            return newMessages;
          });
        } else if (response.done) {
          console.log("Stream completed");
        }
      });
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          parts: [{ text: "Server busy! Try again later." }],
          role: "model",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const exportChat = () => {
    try {
      const chatData = JSON.stringify(messages, null, 2);
      const blob = new Blob([chatData], { type: "application/json" });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      const date = new Date();
      const fileName = `ASSISTplus_chat_export_${
        date.toISOString().split("T")[0]
      }.json`;

      link.href = url;
      link.download = fileName;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting chat:", error);
      alert("Failed to export chat");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "600px",
        width: "800px",
        margin: 0,
        padding: 0,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          fontSize: "12px",
          color: "rgba(255, 255, 255, 0.75)",
          zIndex: 2,
          textAlign: "center",
          fontWeight: "500",
          padding: "10px 24px",
          background:
            "linear-gradient(to bottom, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.24))",
        }}
      >
        Remaining prompts: {MAX_REQUESTS - requestCount}
        {requestCount >= MAX_REQUESTS && timeUntilReset > 0 && (
          <span> (resets in {timeUntilReset}s)</span>
        )}
      </div>
      <div
        className="chat-view"
        style={{
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          scrollBehavior: "smooth",
          width: "100%",
          padding: "50px 10% 150px 10%",
          boxSizing: "border-box",
        }}
        ref={chatViewRef}
      >
        {messages.length > 0 ? (
          messages.map((message, index) => (
            <div
              key={index}
              style={{
                marginBottom: "12px",
                textAlign: message.role === "user" ? "right" : "left",
              }}
            >
              <div
                style={{
                  display: "inline-block",
                  maxWidth: "85%",
                  padding: "10px 15px",
                  borderRadius:
                    message.role === "user"
                      ? "18px 18px 0 18px"
                      : "18px 18px 18px 0",
                  backgroundColor:
                    message.role === "user"
                      ? "#007bff"
                      : "var(--background-color4)",
                  color: message.role === "user" ? "white" : "black",
                  wordWrap: "break-word",
                  overflowWrap: "break-word",
                  whiteSpace: "pre-wrap",
                  '& > *': { 
                    margin: 0,
                    padding: 0
                  }
                }}
              >
                <ReactMarkdown
                  children={message.parts[0]?.text}
                  components={{
                    p: ({ node, ...props }) => (
                      <p style={{ margin: 0 }} {...props} />
                    ),
                    h1: ({ node, ...props }) => (
                      <h1 style={{ margin: '8px 0' }} {...props} />
                    ),
                    h2: ({ node, ...props }) => (
                      <h2 style={{ margin: '6px 0' }} {...props} />
                    ),
                    h3: ({ node, ...props }) => (
                      <h3 style={{ margin: '4px 0' }} {...props} />
                    ),
                    ul: ({ node, ...props }) => (
                      <ul style={{ margin: '4px 0' }} {...props} />
                    ),
                    ol: ({ node, ...props }) => (
                      <ol style={{ margin: '4px 0' }} {...props} />
                    ),
                    li: ({ node, ...props }) => (
                      <li style={{ marginBottom: '2px' }} {...props} />
                    ),
                    blockquote: ({ node, ...props }) => (
                      <blockquote style={{ margin: '4px 0', paddingLeft: '16px', borderLeft: '4px solid #ddd' }} {...props} />
                    ),
                    code: ({ node, ...props }) => (
                      <code
                        style={{
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-all",
                          backgroundColor: "rgba(0,0,0,0.1)",
                        }}
                        {...props}
                      />
                    ),
                    img: ({ src, alt, ...props }) => (
                      <img
                        src={src}
                        alt={alt || "Image"}
                        style={{
                          maxWidth: "100%",
                          height: "auto",
                        }}
                        loading="lazy"
                        {...props}
                      />
                    ),
                    pre: ({ node, ...props }) => (
                      <pre style={{ margin: '4px 0' }} {...props} />
                    ),
                  }}
                />
              </div>
            </div>
          ))
        ) : (
          <h2
            style={{
              textAlign: "left",
              marginLeft: "10%",
              marginRight: "10%",
              marginTop: "25%",
              fontSize: "2rem",
              boxSizing: "border-box",
            }}
          >
            Hey, what’s on your mind today?
          </h2>
        )}
      </div>
      <button
        style={{
          position: "absolute",
          top: "10px",
          right: "10%",
          padding: "12px",
          outline: "none",
          border: "none",
          borderRadius: "24px",
          display: "grid",
          placeItems: "center",
          zIndex: 3,
        }}
        onClick={() => setSettingsPageOpened(!isSettingsPageOpened)}
      >
        {!isSettingsPageOpened ? <IoSettingsSharp /> : <IoClose />}
      </button>
      <Modal visible={isSettingsPageOpened}>
        <div
          style={{
            width: "75%",
            // height: '80%',
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "24px",
            backgroundColor: "var(--background-color3)",
            border: "5px solid var(--background-color2)",
          }}
        >
          <div
            style={{
              flex: 1,
              width: "100%",
              padding: "0 20px",
              boxSizing: "border-box",
            }}
          >
            <h3
              style={{
                marginTop: "20px",
                marginBottom: "10px",
              }}
            >
              Settings
            </h3>
            <div
              style={{
                width: "100%",
                display: "flex",
                gap: "10px",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  borderRadius: "20px",
                  padding: "0px 0px 10px 20px",
                  backgroundColor: "var(--background-color2)",
                }}
              >
                <h4 style={{ margin: "15px 0" }}>Account</h4>
                <div
                  style={{
                    display: "flex",
                    gap: "15px",
                    marginBottom: "10px",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <img
                    src={user ? user.picture : DefaultPfp}
                    alt={user ? "User Profile" : "Guest Profile"}
                    style={{
                      borderRadius: "50px",
                      width: "20%",
                      aspectRatio: 1,
                      alignSelf: "flex-start",
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      width: "80%",
                    }}
                  >
                    <span
                      style={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "block",
                        fontSize: "15px",
                        fontWeight: "600",
                      }}
                    >
                      {user ? user.name : "Guest User"}
                    </span>
                    <span
                      style={{
                        width: "90%",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "block",
                        fontSize: "12px",
                      }}
                    >
                      {user ? user.email : "Logged in as Guest"}
                    </span>
                    <div
                      style={{
                        marginTop: "auto",
                        display: "flex",
                      }}
                    >
                      {user ? (
                        <button
                          className="log-in-button"
                          onClick={() => {
                            console.log("Signing out");
                            chrome.runtime.sendMessage(
                              {
                                type: "logout",
                                token: localStorage.getItem("authToken"),
                              },
                              (res) => {
                                console.log("Logout response:", res);
                                if (res?.success) {
                                  setUser(null);
                                  localStorage.removeItem("authToken");
                                } else {
                                  console.error("Logout failed", res);
                                }
                              }
                            );
                          }}
                        >
                          Sign Out <IoExit size={18} />
                        </button>
                      ) : (
                        <button
                          className="log-in-button"
                          onClick={() => {
                            console.log("Signing in");
                            chrome.runtime.sendMessage(
                              { type: "login" },
                              (res) => {
                                if (res.success) {
                                  setUser(res.user);
                                  localStorage.setItem("authToken", res.token);
                                }
                              }
                            );
                          }}
                        >
                          <IoLogoGoogle /> Sign in with Google
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div
                style={{
                  width: "40%",
                  borderRadius: "20px",
                  padding: "0px 0px 10px 20px",
                  backgroundColor: "var(--background-color2)",
                  cursor: "pointer",
                }}
                onClick={() => {
                  chrome.windows.create({
                    url: "local.html",
                    type: "panel",
                    width: 400,
                    height: 300,
                  });
                }}
              >
                <h4 style={{ margin: "10px 0 5px 0" }}>Tier</h4>
                <div>
                  <span
                    style={{
                      fontSize: 24,
                      fontWeight: "bolder",
                    }}
                  >
                    Free Plan
                  </span>
                  <ul
                    style={{
                      paddingLeft: "20px",
                      fontSize: 12,
                    }}
                  >
                    <li>5 Requests per min</li>
                    <li>100k Tokens per min</li>
                  </ul>
                  <button
                    style={{
                      marginTop: "auto",
                      textAlign: "center",
                      fontWeight: "600",
                      padding: "8px 0",
                      outline: "none",
                      border: "none",
                      width: "90%",
                      flex: 1,
                      marginBottom: "2px",
                      borderRadius: "24px",
                    }}
                  >
                    Pricing Plans
                  </button>
                </div>
              </div>
            </div>
            <div
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "row-reverse",
                gap: "10px",
                justifyContent: "space-between",
                marginTop: "10px",
              }}
            >
              <div
                style={{
                  borderRadius: "20px",
                  padding: "0px 20px 10px 20px",
                  backgroundColor: "var(--background-color2)",
                  width: "75%",
                }}
              >
                <h4 style={{ margin: "15px 0" }}>AI Model</h4>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column-reverse",
                    marginBottom: "10px",
                    justifyContent: "flex-start",
                    alignItems: "center",
                  }}
                >
                  <p
                    style={{
                      fontSize: "12px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      height: "50px",
                    }}
                  >
                    {selectedModel?.about || "Hmmmn"}
                  </p>
                  <Dropdown
                    options={modelOptions}
                    value={selectedModel}
                    onChange={(option) => setSelectedModel(option)}
                    placeholder="Select AI Model"
                  />
                </div>
              </div>
              <div
                style={{
                  borderRadius: "20px",
                  padding: "0px 15px 10px 15px",
                  backgroundColor: "var(--background-color2)",
                }}
              >
                <h4 style={{ margin: "15px 0" }}>Chat</h4>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <button className="chat-task-button">
                    {" "}
                    <IoDownload size={18} />
                    Import Chat
                  </button>
                  <button className="chat-task-button" onClick={exportChat}>
                    <IoShare size={18} />
                    Export Chat
                  </button>
                  <button
                    className="chat-task-button"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Are you sure you want to delete all messages?"
                        )
                      ) {
                        setMessages([]);
                        localStorage.removeItem("chatMessages");
                      }
                    }}
                  >
                    {" "}
                    <IoTrash size={18} /> Delete Chat
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              padding: "10px 20px",
              gap: "8px",
              width: "calc(100% - 40px)",
            }}
          >
            <button
              style={{
                display: "flex",
                backgroundColor: "#F74241",
                outline: "none",
                padding: "8px 12px",
                borderRadius: "24px",
                fontWeight: "bolder",
                border: "none",
                alignItems: "center",
                gap: "5px",
                marginLeft: "auto",
              }}
            >
              {" "}
              <IoMailUnread size={20} />
              Email Support
            </button>
            <button
              style={{
                display: "flex",
                backgroundColor: "rgba(114, 137, 218, 0.6)",
                outline: "none",
                padding: "8px 12px",
                borderRadius: "24px",
                fontWeight: "bolder",
                border: "none",
                alignItems: "center",
                gap: "5px",
              }}
            >
              {" "}
              <IoLogoDiscord size={20} />
              Join Discord Community
            </button>
          </div>
        </div>
      </Modal>
      <ActionBar onSend={handleSend} sendDisabled={isSending} />
    </div>
  );
}
