import { GoogleGenAI, Chat, FunctionDeclaration, Type } from "@google/genai";
import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";

const App = () => {
  // Define types for messages
  type Message = {
    sender: "user" | "bot" | "loading";
    text: string;
  };

  // State management
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Refs for chat instance and scrolling
  const chatRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // --- Gemini API Initialization ---
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const placeOrderFunctionDeclaration: FunctionDeclaration = {
    name: "placeOrder",
    description: "Places an order for food and drinks at the restaurant.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        items: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
          },
          description: "A list of food and drink items to order.",
        },
      },
      required: ["items"],
    },
  };

  // Initialize the chat session
  useEffect(() => {
    const initChat = () => {
      chatRef.current = ai.chats.create({
        model: "gemini-2.5-flash",
        config: {
          systemInstruction:
            "You are a friendly and helpful chatbot for a restaurant named 'The Golden Spoon'. Your goal is to take customer orders. Be polite, confirm the order before finalizing, and you can also answer questions about the menu. The menu includes: Pizza, Burger, Pasta, Salad, Coke, and Water.",
          tools: [{ functionDeclarations: [placeOrderFunctionDeclaration] }],
        },
      });

      // Add initial welcome message
      setMessages([
        {
          sender: "bot",
          text: "Hello! Welcome to 'The Golden Spoon'. What can I get for you today?",
        },
      ]);
    };
    initChat();
  }, []);

  // Auto-scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- Event Handlers ---
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;

    const userMessage: Message = { sender: "user", text: userInput };
    setMessages((prev) => [...prev, userMessage, { sender: "loading", text: "..." }]);
    setUserInput("");
    setIsLoading(true);

    try {
        if (!chatRef.current) {
            throw new Error("Chat not initialized");
        }
        
        const result = await chatRef.current.sendMessage({ message: userInput });
        let botResponseText = "";
        
        if (result.functionCalls && result.functionCalls.length > 0) {
            const fc = result.functionCalls[0];
            if (fc.name === 'placeOrder') {
                const items = fc.args.items;
                const orderNumber = Math.floor(Math.random() * 10000);
                const confirmationMessage = `Great! I've placed an order for: ${items.join(', ')}. Your order number is #${orderNumber}. Is there anything else?`;
                
                // Send function call result back to the model
                const toolResponseResult = await chatRef.current.sendMessage({
                  toolResponse: {
                    functionResponses: {
                      id : fc.id,
                      name: fc.name,
                      response: { result: `Order placed successfully. Order number: ${orderNumber}` },
                    }
                  }
                });
                botResponseText = toolResponseResult.text || confirmationMessage;
            }
        } else {
            botResponseText = result.text;
        }

        const botMessage: Message = { sender: "bot", text: botResponseText };
        setMessages((prev) => [...prev.slice(0, -1), botMessage]);

    } catch (error) {
        console.error("Error sending message:", error);
        const errorMessage: Message = {
            sender: "bot",
            text: "Sorry, something went wrong. Please try again.",
        };
        setMessages((prev) => [...prev.slice(0, -1), errorMessage]);
    } finally {
        setIsLoading(false);
    }
  };

  // --- UI Components ---
  const MessageBubble = ({ msg }: { msg: Message }) => {
    if (msg.sender === "loading") {
      return (
        <div className="message-bubble bot">
          <div className="typing-indicator">
            <span></span><span></span><span></span>
          </div>
        </div>
      );
    }
    return (
      <div className={`message-bubble ${msg.sender}`}>
        <p>{msg.text}</p>
      </div>
    );
  };
  
  // --- Render Method ---
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');

        :root {
          --whatsapp-bg: #075E54;
          --chat-bg: #E5DDD5;
          --header-bg: #128C7E;
          --user-bubble-bg: #DCF8C6;
          --bot-bubble-bg: #FFFFFF;
          --text-color: #303030;
          --input-bg: #F0F0F0;
        }

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: 'Roboto', sans-serif;
          background-color: var(--whatsapp-bg);
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          overflow: hidden;
        }

        #root {
          width: 100%;
          height: 100%;
        }
        
        .chat-container {
          display: flex;
          flex-direction: column;
          width: 100%;
          max-width: 800px;
          height: 100%;
          max-height: 95vh;
          margin: auto;
          background-color: var(--chat-bg);
          box-shadow: 0 5px 15px rgba(0,0,0,0.2);
          border-radius: 8px;
          overflow: hidden;
        }

        .chat-header {
          background-color: var(--header-bg);
          color: white;
          padding: 15px 20px;
          display: flex;
          align-items: center;
          gap: 15px;
        }
        
        .chat-header .avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: #fff;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 20px;
          font-weight: bold;
          color: var(--header-bg);
        }

        .chat-header h2 {
          font-size: 1.2rem;
          font-weight: 500;
        }

        .chat-messages {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
          background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAARMAAAEADAAAAACh64j0AAAAnElEQVR4nO3VMQEAIAwDwemf9sMM8B91IOE3AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADzDN7sD/M3uAH/y3QG+9tsBvva7A3z37gAAAAAAAAAAAAAAAAAAAAAAAAAAwJsj3zPaAP4s1gAAAC1JREFUeJzt0EENAAAIwED9/5f2hsGgqgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA0A/QAAGPQAJgd26aAAAAAElFTkSuQmCC');
          background-repeat: repeat;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .message-bubble {
          max-width: 70%;
          padding: 10px 15px;
          border-radius: 12px;
          line-height: 1.4;
        }

        .message-bubble.user {
          background-color: var(--user-bubble-bg);
          align-self: flex-end;
          border-bottom-right-radius: 2px;
        }

        .message-bubble.bot {
          background-color: var(--bot-bubble-bg);
          align-self: flex-start;
          border-bottom-left-radius: 2px;
        }

        .message-bubble p {
          color: var(--text-color);
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        .chat-input-form {
          display: flex;
          padding: 10px;
          background-color: var(--input-bg);
        }

        .chat-input-form input {
          flex: 1;
          border: none;
          padding: 12px 15px;
          border-radius: 25px;
          font-size: 1rem;
          margin-right: 10px;
        }

        .chat-input-form input:focus {
          outline: none;
        }
        
        .chat-input-form button {
          border: none;
          background-color: var(--header-bg);
          color: white;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 1.5rem;
          display: flex;
          justify-content: center;
          align-items: center;
          transition: background-color 0.2s;
        }

        .chat-input-form button:hover {
          background-color: #106a5f;
        }

        .chat-input-form button:disabled {
            background-color: #a8a8a8;
            cursor: not-allowed;
        }

        .typing-indicator {
          display: flex;
          align-items: center;
          padding: 5px 0;
        }

        .typing-indicator span {
          height: 8px;
          width: 8px;
          margin: 0 2px;
          background-color: #9E9E9E;
          border-radius: 50%;
          display: inline-block;
          animation: bounce 1.4s infinite ease-in-out both;
        }

        .typing-indicator span:nth-of-type(1) { animation-delay: -0.32s; }
        .typing-indicator span:nth-of-type(2) { animation-delay: -0.16s; }
        
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1.0); }
        }
        
        @media (max-width: 600px) {
          .chat-container {
            height: 100%;
            max-height: 100vh;
            border-radius: 0;
          }
        }
      `}</style>
      <div className="chat-container">
        <header className="chat-header">
          <div className="avatar">GS</div>
          <h2>The Golden Spoon Bot</h2>
        </header>
        <main className="chat-messages">
          {messages.map((msg, index) => (
            <MessageBubble key={index} msg={msg} />
          ))}
          <div ref={messagesEndRef} />
        </main>
        <form className="chat-input-form" onSubmit={handleSendMessage}>
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Type a message..."
            aria-label="Your message"
            autoFocus
          />
          <button type="submit" aria-label="Send" disabled={isLoading || !userInput.trim()}>
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </form>
      </div>
    </>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(<App />);
