import { useState, useEffect } from "react";
import catImg from "./assets/cat.jpg";
import "./App.css";

function App() {
  const [status, setStatus] = useState("Sleeping... Zzz");

  // Mock checking IDE state
  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(prev => prev.includes("Zzz") ? "Watching your code! 👀" : "Sleeping... Zzz");
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container">
      <div className="pet-container">
        <div className={`status-bubble ${status.includes("Zzz") ? "sleeping" : "awake"}`}>
          {status}
        </div>
        <img 
          src={catImg} 
          className={`pixel-cat ${status.includes("Zzz") ? "idle" : "bouncing"}`} 
          alt="Pixel Cat Pet" 
        />
        <div className="shadow"></div>
      </div>
      
      <div className="controls">
        <h2>AI Developer Pet</h2>
        <p>Your local companion tracking your Git activity & QA seamlessly.</p>
        <button className="settings-btn">⚙️ Settings</button>
      </div>
    </div>
  );
}

export default App;
