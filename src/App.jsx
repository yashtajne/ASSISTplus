import { useRef, useState, useEffect } from "react";
import { IoSettingsSharp, IoTrash, IoLogoGoogle, IoLogoDiscord, IoDownload, IoShare, IoExit, IoMailUnread } from "react-icons/io5";
import { GoogleGenAI, Type } from "@google/genai";
import ReactMarkdown from "react-markdown"
import ActionBar from "./components/ActionBar";
import Modal from "./components/Modal";
import DefaultPfp from "./assets/guest.png";
import Dropdown from './components/Dropdown';
import FirebaseAppClient from '../lib/firebase';
import { getAuth, GoogleAuthProvider, signInWithPopup, browserLocalPersistence, setPersistence } from "firebase/auth";
import "./assets/Colors.css";
import "./App.css";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GENAI_APIKEY })

const modelOptions = [
  {
    value: 'gemini-1.5-flash',
    label: 'Gemini 1.5 Flash',
    about: 'Gemini 1.5 Flash is a fast and versatile multimodal model for scaling across diverse tasks.'
  },
  {
    value: 'gemini-1.5-flash-8b',
    label: 'Gemini 1.5 Flash 8B',
    about: 'Gemini 1.5 Flash-8B is a small model designed for lower intelligence tasks.'
  },
  {
    value: 'gemini-2.0-flash',
    label: 'Gemini 2.0 Flash',
    about: 'Gemini 2.0 Flash delivers next-gen features and improved capabilities, including superior speed, native tool use, multimodal generation, and a 1M token context window.'
  },
  {
    value: 'gemini-2.0-flash-lite',
    label: 'Gemini 2.0 Flash Lite',
    about: 'A Gemini 2.0 Flash model optimized for cost efficiency and low latency.'
  },
];

export default function App() {

  const [isSettingsPageOpened, setSettingsPageOpened] = useState(false);

  const [selectedModel, setSelectedModel] = useState(modelOptions[0]);

  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('chatMessages');
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
    localStorage.setItem('chatMessages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRequestCount(0);
    }, TIME_WINDOW);

    return () => clearInterval(interval);
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

  useEffect(() => {
    const auth = getAuth(FirebaseAppClient);
    setPersistence(auth, browserLocalPersistence);
    
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUser(user);
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSend = async (msg) => {
    if (msg.trim() === '') return;

    const currentTime = Date.now();
    if (currentTime - lastRequestTime > TIME_WINDOW) {
      setRequestCount(0);
      setLastRequestTime(currentTime);
    } else if (requestCount >= MAX_REQUESTS) {
      alert("Rate limit exceeded! Try again in a minute.");
      return;
    }

    setRequestCount(prev => prev + 1);
    setLastRequestTime(currentTime);

    const updatedMessages = [...messages, { parts: [{ text: msg }], role: "user" }];
    setMessages(updatedMessages);
    
    try {
      const chat = ai.chats.create({
        model: selectedModel?.value || 'gemini-2.0-flash',
        history: messages,
        config: {
          systemInstruction: `You are a browser assistance bot.
          you have the ability to open a browser tab by putting @[openTab](link of the tab) in the starting of the response.`,
        }
      });

      setMessages(prev => [...prev, { parts: [{ text: "" }], role: "model" }]);
      
      const response = await chat.sendMessageStream({ message: msg });
      let fullResponse = "";
      
      for await (const chunk of response) {
        const words = chunk.text.split(/(\s+)/);
        for (let word of words) {
          const urlMatch = word.match(/@\[openTab\]\((https?:\/\/[^\s)]+)\)/);
          if (urlMatch) {
            const url = urlMatch[1];
            chrome.windows.create({
              url: url,
              type: 'popup',
              width: 400,
              height: 300
            });
            word = word.replace(/@\[openTab\]\([^\)]+\)\s*/, '');
          }
          
          fullResponse += word;
          await new Promise(resolve => setTimeout(resolve, 1));
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = { 
              parts: [{ text: fullResponse }],
              role: "model" 
            };
            return newMessages;
          });
        }
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages(prev => [...prev, { 
        parts: [{ text: "Server busy! try again later." }], 
        role: "model" 
      }]);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const auth = getAuth(FirebaseAppClient);
      const provider = new GoogleAuthProvider();
      
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
      provider.addScope('https://www.googleapis.com/auth/userinfo.email');
      
      const result = await signInWithPopup(auth, provider);
      setUser(result.user);
      setSettingsPageOpened(false);

    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      if (!window.confirm("Are you sure you want to Sign-out?")) return;
      const auth = getAuth(FirebaseAppClient);
      await auth.signOut();
      setUser(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const clearChat = () => {
    if (window.confirm("Are you sure you want to delete all messages?")) {
      setMessages([]);
      localStorage.removeItem('chatMessages');
    }
  };

  const exportChat = () => {
    try {
      const chatData = JSON.stringify(messages, null, 2);
      const blob = new Blob([chatData], { type: 'application/json' });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      const date = new Date();
      const fileName = `ASSISTplus_chat_export_${date.toISOString().split('T')[0]}.json`;
      
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

  useEffect(() => {
    if (chatViewRef.current) {
      chatViewRef.current.scrollTop = chatViewRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div style={{ 
      display: 'flex',
      flexDirection: 'column',
      height: "600px",
      width: "800px",
      margin: 0,
      padding: 0,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        fontSize: '12px',
        color: 'rgba(255, 255, 255, 0.75)',
        zIndex: 2,
        textAlign: 'center',
        fontWeight: '500',
        padding: '10px 24px',
        background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.24))'
      }}>
        Remaining prompts: {MAX_REQUESTS - requestCount}
        {requestCount >= MAX_REQUESTS && timeUntilReset > 0 && (
          <span> (resets in {timeUntilReset}s)</span>
        )}
      </div>
      <div className="chat-view" style={{
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        scrollBehavior: "smooth",
        width: '100%',
        padding: '50px 10% 150px 10%',
        boxSizing: 'border-box',
      }} ref={chatViewRef}>
        {messages.length > 0 ?
          messages.map((message, index) => (
            <div 
              key={index}
              style={{
                marginBottom: "12px",
                textAlign: message.role === "user" ? "right" : "left",
              }}
            >
              <div style={{
                display: "inline-block",
                maxWidth: "85%",
                padding: "10px 15px",
                borderRadius: message.role === "user"
                  ? "18px 18px 0 18px" 
                  : "18px 18px 18px 0",
                backgroundColor: message.role === "user" 
                  ? "#007bff" 
                  : "var(--background-color4)",
                color: message.role === "user" ? "white" : "black",
                wordWrap: "break-word",
                overflowWrap: "break-word",
                whiteSpace: "pre-wrap"
              }}>
                <ReactMarkdown components={{
                  p: ({node, ...props}) => <p style={{margin: 0}} {...props} />,
                  code: ({node, ...props}) => (
                    <code style={{
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all",
                      backgroundColor: "rgba(0,0,0,0.1)",
                      padding: "2px 4px",
                      borderRadius: "3px"
                    }} {...props} />
                  )
                }}>
                  {message.parts[0]?.text}
                </ReactMarkdown>
              </div>
            </div>
          )) : (
            <h2 style={{
              textAlign: 'left',
              marginLeft: '10%',
              marginRight: '10%',
              marginTop: '25%',
              fontSize: '2rem',
              boxSizing: "border-box",
            }}>Hey, what’s on your mind today?</h2>
          )
        }
      </div>
      <button style={{
        position: 'absolute',
        top: '10px',
        right: '10%',
        padding: '12px',
        outline: 'none',
        border: 'none',
        borderRadius: '24px',
        display: 'grid',
        placeItems: 'center',
        zIndex: 3,
      }} onClick={() => setSettingsPageOpened(!isSettingsPageOpened)}><IoSettingsSharp /></button>
      <Modal visible={isSettingsPageOpened}>
        <div style={{
          width: '75%',
          height: '80%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '24px',
          backgroundColor: 'var(--background-color3)',
          border: '5px solid var(--background-color2)'
        }}>
          <div style={{
            flex: 1,
            width: '100%',
            padding: '0 20px',
            boxSizing: "border-box",
          }}>
            <h3 style={{
              marginTop: '20px',
              marginBottom: '10px' 
            }}>Settings</h3>
            <div style={{
              width: '100%',
              display: 'flex',
              gap: '10px',
              justifyContent: 'space-between',
            }}>
              <div style={{
                borderRadius: '20px',
                padding: '0px 0px 10px 20px',
                backgroundColor: 'var(--background-color2)'
              }}>
                <h4 style={{ margin: '15px 0' }}>Account</h4>
                <div style={{
                  display: 'flex',
                  gap: '15px',
                  marginBottom: '10px',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <img 
                    src={user ? user.photoURL : DefaultPfp} 
                    alt={user ? "User Profile" : "Guest Profile"} 
                    style={{
                      borderRadius: '50px',
                      width: '20%',
                      aspectRatio: 1,
                      alignSelf: 'flex-start',
                    }}
                  />
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: '80%',
                  }}>
                    <span style={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: 'block',
                    }}>{user ? user.displayName : "Guest User"}</span>
                    <span style={{
                      width: '90%',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: 'block',
                      fontSize: '12px'
                    }}>{user ? user.email : "Logged in as Guest"}</span>
                    <div style={{
                      marginTop: 'auto',
                      display: 'flex',
                    }}>
                      {user ? (
                        <button 
                          className="log-in-button"
                          onClick={handleSignOut}
                        >
                          Sign Out <IoExit size={18} />
                        </button>
                      ) : (
                        <button 
                          className="log-in-button" 
                          onClick={handleGoogleSignIn}
                        >
                          <IoLogoGoogle /> Sign in with Google
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div style={{
                width: '40%',
                borderRadius: '20px',
                padding: '0px 0px 10px 20px',
                backgroundColor: 'var(--background-color2)'
              }}>
                <h4 style={{ margin: '15px 0' }}>Tier</h4>
                <div style={{

                }}>
                  <span style={{
                    fontSize: 24,
                    fontWeight: 'bolder'
                  }}>Free Plan</span>
                  <ul style={{
                    paddingLeft: '20px',
                    fontSize: 12
                  }}>
                    <li>5 Requests per min</li>
                    <li>100k Tokens per min</li>
                  </ul>
                </div>
              </div>
            </div>
            <div style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'row-reverse',
              gap: '10px',
              justifyContent: 'space-between',
              marginTop: '10px'
            }}>
              <div style={{
                borderRadius: '20px',
                padding: '0px 20px 10px 20px',
                backgroundColor: 'var(--background-color2)',
                width: '75%',
              }}>
                <h4 style={{ margin: '15px 0' }}>AI Model</h4>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column-reverse',
                  marginBottom: '10px',
                  justifyContent: 'flex-start',
                  alignItems: 'center',
                }}>
                  <p style={{
                    fontSize: '12px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    height: '50px',
                  }}>{selectedModel?.about || "Hmmmn"}</p>
                  <Dropdown
                    options={modelOptions}
                    value={selectedModel}
                    onChange={(option) => setSelectedModel(option)}
                    placeholder="Select AI Model"
                  />
                </div>
              </div>
              <div style={{
                borderRadius: '20px',
                padding: '0px 15px 10px 15px',
                backgroundColor: 'var(--background-color2)'
              }}>
                <h4 style={{ margin: '15px 0' }}>Chat</h4>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}>
                  <button className="chat-task-button"> <IoDownload size={18} />Import Chat</button>
                  <button 
                    className="chat-task-button" 
                    onClick={exportChat}
                  > 
                    <IoShare size={18} />Export Chat
                  </button>
                  <button className="chat-task-button" onClick={() => clearChat()}> <IoTrash size={18} /> Delete Chat</button>
                </div>
              </div>
            </div>
          </div>
          <div style={{
            display: 'flex',
            padding: '10px 20px',
            gap: '8px',
            width: 'calc(100% - 40px)'
          }}>
            <button style={{
              display: 'flex',
              backgroundColor: 'rgba(114, 137, 218, 0.6)',
              outline: 'none',
              padding: '8px 12px',
              borderRadius: '24px',
              fontWeight: 'bolder',
              border: 'none',
              alignItems: 'center',
              gap: '5px',
              marginLeft: 'auto'
            }}> <IoMailUnread size={20} />Email Support</button>
            <button style={{
              display: 'flex',
              backgroundColor: 'rgba(114, 137, 218, 0.6)',
              outline: 'none',
              padding: '8px 12px',
              borderRadius: '24px',
              fontWeight: 'bolder',
              border: 'none',
              alignItems: 'center',
              gap: '5px',
            }}> <IoLogoDiscord size={20} />Join Discord Community</button>
          </div>
        </div>
      </Modal>
      <ActionBar onSend={handleSend} />
    </div>
  );
}