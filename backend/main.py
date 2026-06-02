from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.responses import FileResponse

from google import genai
from dotenv import load_dotenv

import pandas as pd
import trafilatura
import os
import json


# Load environment variables
load_dotenv()

# Configure Gemini
client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

app = FastAPI()
current_excel_file = None

# Allow frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request model
class ArticleRequest(BaseModel):
    url: str

class AcceptRowRequest(BaseModel):
    row_number: int
    headline: str
    summary: str
    impact: str


@app.get("/")
def home():
    return {"message": "Backend Running Successfully"}


# ==========================
# EXCEL UPLOAD API
# ==========================
@app.post("/upload-excel")
async def upload_excel(file: UploadFile = File(...)):
    global current_excel_file

    os.makedirs("uploads", exist_ok=True)
    file_path = f"uploads/{file.filename}"

    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())

    current_excel_file = file_path
    df = pd.read_excel(file_path)

    return {
        "status": "success",
        "filename": file.filename,
        "total_rows": len(df),
        "columns": list(df.columns)
    }
    

@app.post("/process-next-row")
def process_next_row():
    global current_excel_file

    if not current_excel_file:
        return {
            "status": "error",
            "message": "No Excel file uploaded"
        }

    df = pd.read_excel(current_excel_file)
    pending_row = None

    for index, row in df.iterrows():
        summary = str(row.get("ESGSummary", "")).strip()

        if summary == "" or summary.lower() == "nan":
            pending_row = index
            break

    if pending_row is None:
        return {
            "status": "completed",
            "message": "All rows processed"
        }

    news_link = df.loc[pending_row, "ESGNewsLink"]

    try:
        downloaded = trafilatura.fetch_url(news_link)

        if not downloaded:
            return {
                "status": "error",
                "message": "Unable to download article"
            }

        article_text = trafilatura.extract(downloaded)

        if not article_text:
            return {
                "status": "error",
                "message": "Unable to extract article text"
            }

        prompt = f"""
Role & Context

You are an equity-research-style ESG analyst writing for:

* Institutional investors
* Private equity professionals
* Credit analysts
* Corporate strategy teams

Your goal is to produce concise, factual, investor-relevant ESG news summaries focusing on:

* Financial materiality
* ESG implications
* Governance context
* Long-term strategic relevance

Required Output Structure (Strict Order)

1. Headline

Requirements:
* Clear, factual, neutral tone
* Title Case capitalization
* Maximum 120 characters
* No hype, marketing language, or emojis

2. Executive Summary

Write ONE single paragraph (270-350 words).

Mandatory Content Coverage:

* Company context
    * Start with the company name
    * Brief description of what the company does

* Event description
    * What happened
    * Who is involved

* Material facts
    * Include ONLY explicitly stated facts
    * Metrics, scale, investments, timelines
    * Geographic scope if mentioned

* Strategic context
    * ESG, sustainability, governance, or regulatory relevance
    * Leadership rationale if explicitly stated
    * Long-term strategic implications

* Investor-lens closing sentence (MANDATORY)
    * End with a sentence similar to:
      "For investors, the development underscores implications for governance quality, risk management, and long-term value creation."

Tone & Quality Rules:

* Professional analyst-grade tone
* Third-person narration only
* Neutral and non-promotional
* No speculation or assumptions
* No invented facts
* Avoid repetition or filler
* Focus on material relevance

Required Logical Flow:

1. Company + event overview
2. Key facts and metrics
3. Leadership intent or positioning
4. ESG/governance strategic relevance
5. Investor relevance closing sentence

3. ESG Impact Classification

Select ONE:

* Positive (1) if clear ESG progress or improvement
* Neutral (2) if informational update with no clear directional impact
* Negative (3) if ESG risk, controversy, or adverse development

Do NOT Include:

* Bullet points (except in instructions)
* Emojis, hashtags, or symbols
* Extra commentary
* Disclaimers
* Assumptions beyond article content
* Promotional language

IMPORTANT:

Return ONLY valid JSON.

Do NOT:
* Wrap JSON in markdown
* Add explanations
* Add extra text

JSON format:

{{
    "headline": "",
    "summary": "",
    "esg_impact": ""
}}

ARTICLE:
{article_text}
"""

        response = client.models.generate_content(
            model="gemini-3.1-flash-lite",
            contents=prompt
        )

        # CORRECTED INDENTATION BLOCK
        clean_response = response.text.replace("```json", "")
        clean_response = clean_response.replace("```", "")
        clean_response = clean_response.strip()

        ai_data = json.loads(clean_response)

        return {
            "status": "success",
            "row_number": pending_row,
            "news_link": news_link,
            "headline": ai_data["headline"],
            "summary": ai_data["summary"],
            "impact": ai_data["esg_impact"]
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

@app.post("/accept-row")
def accept_row(data: AcceptRowRequest):

    global current_excel_file

    if not current_excel_file:
        return {
            "status": "error",
            "message": "No Excel file uploaded"
        }

    try:

        df = pd.read_excel(current_excel_file)
        
        df["ESGHeadline"] = df["ESGHeadline"].astype("object")
        df["ESGSummary"] = df["ESGSummary"].astype("object")
        df["ESGImpact"] = df["ESGImpact"].astype("object")

        df.loc[data.row_number, "ESGHeadline"] = data.headline
        df.loc[data.row_number, "ESGSummary"] = data.summary
        df.loc[data.row_number, "ESGImpact"] = data.impact

        df.to_excel(current_excel_file, index=False)

        return {
            "status": "success",
            "message": f"Row {data.row_number} saved successfully"
        }

    except Exception as e:

        return {
            "status": "error",
            "message": str(e)
        }
        
@app.get("/download-excel")
def download_excel():

    global current_excel_file

    if not current_excel_file:
        return {
            "status": "error",
            "message": "No Excel file available"
        }

    return FileResponse(
        path=current_excel_file,
        filename="Processed_ESG_Report.xlsx",
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
# ==========================
# ARTICLE PROCESSING API
# ==========================
@app.post("/process-link")
def process_link(data: ArticleRequest):
    try:
        url = data.url

        # Fetch webpage
        downloaded = trafilatura.fetch_url(url)

        if not downloaded:
            return {
                "status": "error",
                "message": "Unable to download article."
            }

        # Extract article text
        article_text = trafilatura.extract(downloaded)

        if not article_text:
            return {
                "status": "error",
                "message": "Unable to extract article text."
            }

        # ESG Prompt
        prompt = f"""
Role & Context

You are an equity-research-style ESG analyst writing for:

* Institutional investors
* Private equity professionals
* Credit analysts
* Corporate strategy teams

Your goal is to produce concise, factual, investor-relevant ESG news summaries focusing on:

* Financial materiality
* ESG implications
* Governance context
* Long-term strategic relevance

Required Output Structure (Strict Order)

1. Headline

Requirements:
* Clear, factual, neutral tone
* Title Case capitalization
* Maximum 120 characters
* No hype, marketing language, or emojis

2. Executive Summary

Write ONE single paragraph (270-350 words).

Mandatory Content Coverage:

* Company context
    * Start with the company name
    * Brief description of what the company does

* Event description
    * What happened
    * Who is involved

* Material facts
    * Include ONLY explicitly stated facts
    * Metrics, scale, investments, timelines
    * Geographic scope if mentioned

* Strategic context
    * ESG, sustainability, governance, or regulatory relevance
    * Leadership rationale if explicitly stated
    * Long-term strategic implications

* Investor-lens closing sentence (MANDATORY)
    * End with a sentence similar to:
      "For investors, the development underscores implications for governance quality, risk management, and long-term value creation."

Tone & Quality Rules:

* Professional analyst-grade tone
* Third-person narration only
* Neutral and non-promotional
* No speculation or assumptions
* No invented facts
* Avoid repetition or filler
* Focus on material relevance

Required Logical Flow:

1. Company + event overview
2. Key facts and metrics
3. Leadership intent or positioning
4. ESG/governance strategic relevance
5. Investor relevance closing sentence

3. ESG Impact Classification

Select ONE:

* Positive (1) if clear ESG progress or improvement
* Neutral (2) if informational update with no clear directional impact
* Negative (3) if ESG risk, controversy, or adverse development

Do NOT Include:

* Bullet points (except in instructions)
* Emojis, hashtags, or symbols
* Extra commentary
* Disclaimers
* Assumptions beyond article content
* Promotional language

IMPORTANT:

Return ONLY valid JSON.

Do NOT:
* Wrap JSON in markdown
* Add explanations
* Add extra text

JSON format:

{{
    "headline": "",
    "summary": "",
    "esg_impact": ""
}}

ARTICLE:
{article_text}
"""

        # Gemini Response
        response = client.models.generate_content(
            model="gemini-3.1-flash-lite",
            contents=prompt
        )

        return {
            "status": "success",
            "ai_response": response.text
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }