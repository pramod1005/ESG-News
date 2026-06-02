import { useState } from "react";

function App() {
  const [url, setUrl] = useState("");
  const [response, setResponse] = useState(null);
  const [currentRowData, setCurrentRowData] = useState(null);
  const [excelFile, setExcelFile] = useState(null);
  const [excelInfo, setExcelInfo] = useState(null);

  // Handle processing a single manual URL link
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
      setResponse(data); 
      
    } catch (error) {
      console.error("Error:", error);
      setResponse({ status: "error", message: "Error: Could not connect to the server." });
    }
  };

  // Handle uploading the initial Excel spreadsheet
  const handleExcelUpload = async () => {
    if (!excelFile) {
      alert("Please select an Excel file");
      return;
    }

    const formData = new FormData();
    formData.append("file", excelFile);

    try {
      const res = await fetch("http://127.0.0.1:8000/upload-excel", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setExcelInfo(data);

    } catch (error) {
      console.error(error);
      alert("Excel upload failed");
    }
  };

  // Handle pulling and processing the next available row from the uploaded spreadsheet
  const handleProcessNextRow = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/process-next-row", {
        method: "POST",
      });
      
      const data = await res.json();
      
      if (data.status === "completed") {
        alert("All rows have been successfully processed!");
        return;
      }
      
      setResponse(data);

      if (data.status === "success") {
        setCurrentRowData({
        row_number: data.row_number,
        headline: data.headline,
        summary: data.summary,
        impact: data.impact,
        });
      }
      
    } catch (error) {
      console.error("Error processing row:", error);
      setResponse({ status: "error", message: "Error connecting to server for Excel processing." });
    }
  };

  const handleAcceptAndContinue = async () => {
    if (!currentRowData) {
      alert("No row available to save");
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/accept-row", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(currentRowData),
      });

      const data = await res.json();

      if (data.status === "success") {
        alert("Row saved successfully!");

        // Automatically load next pending row
        handleProcessNextRow();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to save row");
    }
  };

  const handleDownloadExcel = () => {
    window.open(
      "http://127.0.0.1:8000/download-excel",
      "_blank"
    );
  };

  // Helper function to cleanly parse and render the results on new lines with bold headings
  const renderResponse = () => {
    if (!response) return null;

    if (response.status === "error") {
      return (
        <div style={{ marginTop: "20px", color: "red", padding: "15px", background: "#fee", borderRadius: "8px" }}>
          {response.message}
        </div>
      );
    }

    const aiData = {
      headline: response.headline,
      summary: response.summary,
      esg_impact: response.impact,
    };

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
          Status: Success {response.row_number !== undefined && `(Row #${response.row_number + 1})`}
        </div>

        {response.news_link && (
          <p style={{ margin: "-10px 0 20px 0", fontSize: "0.9em", color: "#666" }}>
            <strong>Source Link:</strong> <a href={response.news_link} target="_blank" rel="noreferrer" style={{ color: "#007bff" }}>{response.news_link}</a>
          </p>
        )}

        <h3 style={{ margin: "0 0 10px 0", color: "#333", fontWeight: "bold" }}>Headline</h3>
        <p style={{ margin: "0 0 20px 0", fontSize: "1.1em" }}>{aiData.headline}</p>

        <h3 style={{ margin: "0 0 10px 0", color: "#333", fontWeight: "bold" }}>Summary</h3>
        <p style={{ margin: "0 0 20px 0" }}>{aiData.summary}</p>

        <h3 style={{ margin: "0 0 10px 0", color: "#333", fontWeight: "bold" }}>ESG Impact</h3>
        <p style={{ 
          margin: "0", 
          fontWeight: "bold", 
          color: aiData.esg_impact.includes("Positive") || aiData.esg_impact.includes("1") ? "#28a745" : 
                 aiData.esg_impact.includes("Negative") || aiData.esg_impact.includes("3") ? "#dc3545" : "#6c757d" 
        }}>
          {aiData.esg_impact}
        </p>
        <button
          onClick={handleAcceptAndContinue}
          style={{
            marginTop: "25px",
            padding: "12px 20px",
            background: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "15px"
          }}
        >
          Accept & Continue
        </button>
      </div>
    );
  };

  return (
    <div style={{ padding: "40px", fontFamily: "system-ui, -apple-system, sans-serif", maxWidth: "800px", margin: "0 auto" }}>
      <h1>ESG News Platform</h1>
      
      {/* Excel Upload Section */}
      <div
        style={{
          border: "1px solid #ddd",
          padding: "20px",
          borderRadius: "8px",
          marginBottom: "30px",
          background: "#f8f9fa"
        }}
      >
        <h2 style={{ color: "blue", marginTop: "0" }}>Upload Excel File</h2>

        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => setExcelFile(e.target.files ? e.target.files[0] : null)}
        />

        <button
          onClick={handleExcelUpload}
          style={{
            marginLeft: "10px",
            padding: "10px 15px",
            background: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "bold"
          }}
        >
          Upload Excel
        </button>
      </div>

      {/* Excel Meta-Information & Dashboard Controls */}
      {excelInfo && (
        <div
          style={{
            background: "#e9f7ef",
            padding: "15px",
            borderRadius: "8px",
            marginBottom: "30px",
            border: "1px solid #c3e6cb"
          }}
        >
          <h3 style={{ marginTop: "0" }}>Excel Information</h3>
          <p style={{ margin: "5px 0" }}><strong>File:</strong> {excelInfo.filename}</p>
          <p style={{ margin: "5px 0" }}><strong>Total Rows:</strong> {excelInfo.total_rows}</p>
          <p style={{ margin: "5px 0" }}><strong>Columns:</strong></p>
          <ul style={{ margin: "5px 0", paddingLeft: "20px" }}>
            {excelInfo.columns.map((col, index) => (
              <li key={index}>{col}</li>
            ))}
          </ul>

          <button
            onClick={handleProcessNextRow}
            style={{
              marginTop: "15px",
              padding: "12px 20px",
              background: "#17a2b8",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "14px"
            }}
          >
            Process Next Pending Row
          </button>

          <button
            onClick={handleDownloadExcel}
            style={{
              marginLeft: "10px",
              marginTop: "15px",
              padding: "12px 20px",
              background: "#6f42c1",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold"
            }}
          >
          Download Updated Excel
          </button>
        </div>
      )}

      {/* Single URL Link Processing Section */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Enter article URL manually"
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
            fontSize: "16px",
            fontWeight: "bold"
          }}
        >
          Process Link
        </button>
      </div>

      {/* Render Clean Outputs with Clear Structural Separations */}
      {renderResponse()}
      
    </div>
  );
}

export default App;