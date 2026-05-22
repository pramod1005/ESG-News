from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai


import trafilatura

from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Configure Gemini
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

app = FastAPI()

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

@app.get("/")
def home():
    return {"message": "Backend Running Successfully"}

@app.post("/process-link")
def process_link(data: ArticleRequest):
    url = data.url

    # Fetch webpage
    downloaded = trafilatura.fetch_url(url)

    # Extract article text
    article_text = trafilatura.extract(downloaded)

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
   Write ONE single paragraph (140-220 words).

Mandatory Content Coverage:

* Company context (Start with the company name and brief description of what the company does)
* Event description (what happened and who is involved)
* Material facts(Include ONLY explicitly stated facts:
Metrics, scale, investments, timelines
Geographic scope if mentioned)
* Strategic context(ESG, sustainability, governance, or regulatory relevance
Leadership rationale if explicitly stated
Long-term strategic implications
)
* Investor-lens closing sentence(End with a sentence similar to:
“For investors, the development underscores implications for governance quality, risk management, and long-term value creation.”
)

Tone & Quality Rules:

* Professional analyst-grade tone
* Third-person narration only
* Neutral and non-promotional
* No speculation or assumptions
* No invented facts
* Avoid repetition or filler 
* Focus on material relevance 

3. ESG Impact Classification

Select ONE:

* Positive (1) if clear ESG progress or improvement
* Neutral (2) if Informational update with no clear directional impact
* Negative (3) if ESG risk, controversy, or adverse development

Do NOT Include :
* Bullet points (except in instructions)
* Emojis, hashtags, or symbols
* Extra commentary
* Disclaimers
* Assumptions beyond article content
* Promotional language


IMPORTANT:
Return ONLY valid JSON.

Do NOT:

wrap JSON in markdown
add explanations
add extra text

JSON format:

{{
"headline": "",
"summary": "",
"esg_impact": ""
}}

ARTICLE:
{article_text}
"""

    try:
        # Gemini AI response
        response = client.models.generate_content(
        model="gemini-3.5-flash",
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
    
    response = client.models.generate_content(
model="gemini-3.5-flash",
contents=prompt
)


    return {
        "status": "success",
        "ai_response": response.text
    }