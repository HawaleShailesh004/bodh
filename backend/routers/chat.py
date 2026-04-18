from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from groq import Groq
import os

router = APIRouter()

_SYSTEM = """You are Bodh's health assistant. You help patients understand their lab report.

STRICT RULES:
1. You can ONLY answer questions about the patient's specific report data provided below.
2. If asked about anything not in the report (other diseases, medications, treatments, general health), reply: "I can only explain values from your report. For medical advice, please consult your doctor."
3. Never diagnose a disease. Never prescribe medication. Never suggest dosages.
4. Keep answers short — 2-4 sentences max. Simple Class-8 level language.
5. Answer in the SAME language the user writes in (Hindi, Marathi, or English).
6. If the user writes in Hindi (Devanagari), reply in Hindi. If Marathi, reply in Marathi.
7. Be warm and reassuring. The patient may be anxious.
8. You can explain what a biomarker means, why it's abnormal, and what the doctor's recommendation means.
9. Always end with a reminder to consult the doctor for decisions."""


def _build_context(report: dict) -> str:
    lines = [
        f"Patient: {report.get('age', '?')}y {report.get('gender', '?')} | Overall: {report.get('overall_severity', '?')}",
        f"Specialist: {report.get('specialist_recommendation', 'General Physician')} — {report.get('urgency_timeline', '')}",
        "",
        "Biomarker Results:",
    ]
    for b in report.get("biomarkers", []):
        lo  = b.get("active_ref_low")
        hi  = b.get("active_ref_high")
        rng = f"{lo}–{hi}" if lo is not None and hi is not None else "no range"
        lines.append(
            f"- {b['raw_name']}: {b['value']} {b.get('unit','')} "
            f"(normal: {rng}, status: {b['severity']}) — {b.get('explanation_en','')}"
        )
    if report.get("emergency_message"):
        lines.append(f"\nEmergency note: {report['emergency_message']}")
    return "\n".join(lines)


class ChatMessage(BaseModel):
    role: str   # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []
    report: dict               # the full AnalysisResult as dict


@router.post("/chat")
async def chat(req: ChatRequest):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message is empty")

    if len(req.message) > 500:
        raise HTTPException(status_code=400, detail="Message too long")

    groq_key = os.getenv("GROQ_API_KEY")
    if not groq_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")

    context = _build_context(req.report)
    system  = f"{_SYSTEM}\n\n--- PATIENT REPORT DATA ---\n{context}\n--- END REPORT DATA ---"

    # Build message history (cap at last 8 turns to avoid context overflow)
    messages = [{"role": "system", "content": system}]
    for msg in req.history[-8:]:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": req.message})

    try:
        client = Groq(api_key=groq_key)
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            temperature=0.2,
            max_tokens=300,
            messages=messages,
        )
        reply = response.choices[0].message.content.strip()
        return {"reply": reply}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")