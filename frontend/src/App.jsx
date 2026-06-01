import { useState } from "react";

function App() {
  const [url, setUrl] = useState("");
  const [response, setResponse] = useState(null);

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
      setResponse(data); // Store the raw object instead of stringifying it immediately
      
    } catch (error) {
      console.error("Error:", error);
      setResponse({ status: "error", message: "Error: Could not connect to the server." });
    }
  };

  // Helper function to cleanly render the results
  const renderResponse = () => {
    if (!response) return null;

    if (response.status === "error") {
      return (
        <div style={{ marginTop: "20px", color: "red", padding: "15px", background: "#fee" }}>
          {response.message}
        </div>
      );
    }

    let aiData;
    try {
      // 1. Clean the string by removing the markdown code block backticks
      let cleanResponse = response.ai_response.replace(/```json/g, "").replace(/```/g, "").trim();
      
      // 2. Parse the cleaned nested JSON string
      aiData = JSON.parse(cleanResponse);
    } catch (e) {
      // Fallback just in case the AI doesn't return perfect JSON even after cleaning
      return <pre style={{ marginTop: "20px", whiteSpace: "pre-wrap" }}>{response.ai_response}</pre>;
    }

    return (
      <div 
        style={{ 
          marginTop: "30px", 
          background: "#f8f9fa", 
          padding: "25px",
          borderRadius: "8px",
          border: "1px solid #ddd",
          textAlign: "left",
          lineHeight: "1.6"
        }}
      >
        <div style={{ marginBottom: "20px", color: "#28a745", fontWeight: "bold", fontSize: "1.2em" }}>
          Status: Success
        </div>

        <h3 style={{ margin: "0 0 10px 0", color: "#333" }}>Headline</h3>
        <p style={{ margin: "0 0 20px 0", fontSize: "1.1em" }}>{aiData.headline}</p>

        <h3 style={{ margin: "0 0 10px 0", color: "#333" }}>Summary</h3>
        <p style={{ margin: "0 0 20px 0" }}>{aiData.summary}</p>

        <h3 style={{ margin: "0 0 10px 0", color: "#333" }}>ESG Impact</h3>
        <p style={{ margin: "0", fontWeight: "bold", color: aiData.esg_impact.includes("Positive") ? "#28a745" : aiData.esg_impact.includes("Negative") ? "#dc3545" : "#6c757d" }}>
          {aiData.esg_impact}
        </p>
      </div>
    );
  };

  return (
    <div style={{ padding: "40px", fontFamily: "system-ui, -apple-system, sans-serif", maxWidth: "800px", margin: "0 auto" }}>
      <h1>ESG News Platform</h1>
      
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Enter article URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: "4px",
            border: "1px solid #ccc",
            fontSize: "16px"
          }}
        />

        <button 
          onClick={handleSubmit} 
          style={{ 
            padding: "12px 20px",
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "16px"
          }}
        >
          Process Link
        </button>
      </div>

      {/* Render the neatly formatted UI here */}
      {renderResponse()}
      
    </div>
  );
}

export default App;