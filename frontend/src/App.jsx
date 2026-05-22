import { useState } from "react";

function App() {
  const [url, setUrl] = useState("");
  const [response, setResponse] = useState("");

  const handleSubmit = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/process-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });
      
      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
      
    } catch (error) {
      console.error("Error:", error);
      // Show the error on the screen so the user knows something went wrong
      setResponse("Error: Could not connect to the server.");
    }
  };

  return (
    <div style={{ padding: "40px" }}>
      <h1>ESG News Platform</h1>
      
      <input
        type="text"
        placeholder="Enter article URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        style={{
          width: "400px",
          padding: "10px",
          marginRight: "10px",
        }}
      />

      <button onClick={handleSubmit} style={{ padding: "10px 15px" }}>
        Process Link
      </button>

      <pre 
        style={{ 
          marginTop: "20px", 
          background: "#f4f4f4", 
          padding: "15px",
          whiteSpace: "pre-wrap",   // Forces text to wrap to the next line
          wordWrap: "break-word"    // Breaks long continuous text like URLs
        }}
      >
        {response}
      </pre>
    </div>
  );
}

export default App;