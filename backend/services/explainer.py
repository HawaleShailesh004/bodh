"""Parallel AI explanation generation with strict safety fallbacks."""

import asyncio
import json
import os
import time

from groq import Groq
from openai import AsyncOpenAI

from models.schemas import ExplainedBiomarker, ScoredBiomarker, SeverityLevel

from dotenv import load_dotenv
load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not GROQ_API_KEY or not OPENAI_API_KEY:
    raise ValueError("GROQ_API_KEY and OPENAI_API_KEY must be set")

# Clients.
groq_client = Groq(api_key=GROQ_API_KEY)
openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Timeout (seconds) per model call.
MODEL_TIMEOUT = 15.0
SUMMARY_TIMEOUT = 30.0

_EXPLAIN_JSON_LOG_LIMIT = int(os.getenv("BODH_EXPLAIN_LOG_PREVIEW", "6000"))


def _log_explain_raw(tag: str, text: str) -> None:
    """Log exact model message text (length-capped)."""
    if not text:
        print(f"[explainer] {tag}: <empty>")
        return
    n = len(text)
    cap = _EXPLAIN_JSON_LOG_LIMIT
    if n <= cap:
        print(f"[explainer] {tag} ({n} chars):\n{text}")
    else:
        print(f"[explainer] {tag} ({n} chars, preview {cap}):\n{text[:cap]}...")


def _log_explain_json(tag: str, data: dict | None) -> None:
    """Print parsed model JSON for debugging (length-capped)."""
    if data is None:
        print(f"[explainer] {tag}: <no model output>")
        return
    try:
        s = json.dumps(data, ensure_ascii=False, default=str)
    except TypeError:
        s = str(data)
    n = len(s)
    cap = _EXPLAIN_JSON_LOG_LIMIT
    if n <= cap:
        print(f"[explainer] {tag} ({n} chars): {s}")
    else:
        print(f"[explainer] {tag} ({n} chars, preview {cap}): {s[:cap]}...")

_REPORT_SUMMARY_SYSTEM = """You are a medical report summarizer for Indian patients.
Generate in ONE JSON object:
1) A conversational report summary
2) THREE questions the patient should ask their DOCTOR at an appointment (clinical, specific to this report)
3) THREE short questions the patient might tap to ask the BODH AI CHATBOT about this same report (NOT for the doctor visit)

RULES — summary:
- 4-6 sentences, Class-8 level, warm tone
- Mention specific abnormal biomarker NAMES and VALUES where relevant
- Be honest about severity but not alarming

RULES — doctor questions (`questions_*`):
- Exactly 3 strings per language; formal phrasing suitable to ask a physician
- Specific to this patient's abnormal values and context

RULES — Bodh chat starter questions (`chat_questions_*`):
- Exactly 3 strings per language; phrased as if typing to an AI assistant named Bodh (e.g. "Why is my … on this report?", "What does … mean here?")
- MUST be different wording from `questions_*` — these are for the app chatbot, not the clinic
- No diagnosis or treatment instructions; curiosity and literacy only
- Specific to this report's values when possible

OUTPUT: valid JSON only, no markdown. All three languages genuinely translated (not transliterated)."""

_REPORT_SUMMARY_USER = """Patient: {age} years, {gender}
Overall severity: {severity}
Processing time: {time_ms}ms

ABNORMAL values:
{abnormal}

NORMAL values: {normal_names}

Specialist recommendation: {specialist}

Generate in this exact JSON schema:
{{
  "summary_en": "4-6 sentence summary in English",
  "summary_hi": "4-6 sentence summary in Hindi (Devanagari script)",
  "summary_mr": "4-6 sentence summary in Marathi (Devanagari script)",
  "questions_en": ["doctor visit Q1", "doctor visit Q2", "doctor visit Q3"],
  "questions_hi": ["डॉक्टर से 1", "डॉक्टर से 2", "डॉक्टर से 3"],
  "questions_mr": ["डॉक्टरांना 1", "डॉक्टरांना 2", "डॉक्टरांना 3"],
  "chat_questions_en": ["Bodh chat Q1", "Bodh chat Q2", "Bodh chat Q3"],
  "chat_questions_hi": ["Bodh चैट 1", "Bodh चैट 2", "Bodh चैट 3"],
  "chat_questions_mr": ["Bodh चॅट 1", "Bodh चॅट 2", "Bodh चॅट 3"]
}}"""

SYSTEM_PROMPT = """You are a health literacy assistant helping Indian patients understand their lab reports.

You will receive a JSON object with VERIFIED biomarker data. All reference ranges and severity levels in this JSON are pre-computed and final. They come from validated medical databases, not from you.

YOUR ONLY JOB: Write plain-language explanations based strictly on what the JSON contains.

ABSOLUTE RULES — violating any of these is a critical failure:
1. NEVER invent or modify reference ranges. Use ONLY the active_ref_low and active_ref_high provided.
2. NEVER override or soften the severity field. It is final.
3. NEVER name a specific disease for NORMAL or WATCH severity.
4. NEVER suggest a specific medication, dosage, or treatment.
5. NEVER fill in missing data with assumptions. If a field is null, say "not available."
6. NEVER add information not traceable to the input JSON.
7. For EMERGENCY severity: be direct and calm. Do not panic the patient. Do not minimise.
8. For NORMAL severity: be reassuring but brief.
9. Reading level: Class 8 Indian student. Short sentences. No jargon.
10. Respond ONLY with valid JSON matching the exact schema requested. No preamble, no markdown, no explanation outside the JSON."""


def _build_prompt(bio: ScoredBiomarker) -> str:
    """
    Build model input for a single biomarker.
    Exposes only verified fields needed for explanations.
    """
    from services.verifier import ICMR_DB

    icmr_entry = ICMR_DB.get(bio.normalized_name, {}) if bio.normalized_name else {}
    human_name = icmr_entry.get("display_name") or bio.raw_name

    safe_data = {
        "display_name": human_name,
        "value": bio.value,
        "unit": bio.unit,
        "active_ref_low": bio.active_ref_low,
        "active_ref_high": bio.active_ref_high,
        "range_source": bio.range_source,
        "lab_flag": bio.lab_flag,
        "severity": bio.severity,
        "deviation_score": bio.deviation_score,
    }

    severity_guidance = {
        SeverityLevel.NORMAL: "Value is within normal range. Be brief and reassuring.",
        SeverityLevel.WATCH: "Value is mildly abnormal. Explain what it means and suggest lifestyle attention. Do not alarm.",
        SeverityLevel.ACT_NOW: "Value is significantly abnormal. Be clear this needs medical attention. Mention the specific concern without naming a disease.",
        SeverityLevel.EMERGENCY: "Value is critically abnormal. Be direct. State clearly this needs immediate medical attention. Stay calm, not alarming.",
        SeverityLevel.UNKNOWN: "Reference range was not available. Describe what this test measures only. Do not guess normal or abnormal.",
    }

    return f"""
Biomarker data (VERIFIED — do not override any value):
{json.dumps(safe_data, default=str, indent=2)}

Severity guidance: {severity_guidance.get(bio.severity, "")}

Respond with ONLY this JSON structure:
{{
  "explanation_en": "2-3 sentences in plain English",
  "explanation_hi": "2-3 sentences in Hindi (Devanagari script only)",
  "explanation_mr": "2-3 sentences in Marathi (Devanagari script only)",
  "diet_tip_en": "one specific Indian food tip if severity is WATCH/ACT_NOW/EMERGENCY, else null",
  "diet_tip_hi": "same tip in Hindi Devanagari if diet_tip_en is not null, else null"
}}"""


async def _call_claude(bio: ScoredBiomarker) -> dict | None:
    try:
        resp = await asyncio.wait_for(
            asyncio.to_thread(
                lambda: groq_client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    temperature=0.0,
                    max_tokens=600,
                    response_format={"type": "json_object"},
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": _build_prompt(bio)},
                    ],
                )
            ),
            timeout=MODEL_TIMEOUT,
        )
        content = resp.choices[0].message.content or "{}"
        _log_explain_raw(
            f"groq-llama raw API body for {(bio.normalized_name or bio.raw_name)!r}",
            content,
        )
        return json.loads(content)
    except asyncio.TimeoutError:
        print(f"    [groq-llama] TIMEOUT after {MODEL_TIMEOUT}s")
        return None
    except Exception as e:
        print(f"    [groq-llama] ERROR: {type(e).__name__}: {e}")
        return None


async def _call_gpt4o(bio: ScoredBiomarker) -> dict | None:
    if openai_client is None:
        print("    [gpt4o] ERROR: Missing OPENAI_API_KEY")
        return None
    try:
        resp = await asyncio.wait_for(
            openai_client.chat.completions.create(
                model="gpt-4o",
                max_tokens=600,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": _build_prompt(bio)},
                ],
            ),
            timeout=MODEL_TIMEOUT,
        )
        content = resp.choices[0].message.content or "{}"
        _log_explain_raw(
            f"gpt-4o raw API body for {(bio.normalized_name or bio.raw_name)!r}",
            content,
        )
        return json.loads(content)
    except asyncio.TimeoutError:
        print(f"    [gpt4o] TIMEOUT after {MODEL_TIMEOUT}s")
        return None
    except Exception as e:
        print(f"    [gpt4o] ERROR: {type(e).__name__}: {e}")
        return None


def _outputs_diverge(a: dict, b: dict) -> bool:
    """
    Detect meaningful divergence between model outputs.
    """
    if not a or not b:
        return False

    len_a = len(a.get("explanation_en", ""))
    len_b = len(b.get("explanation_en", ""))
    if max(len_a, len_b) > 0:
        ratio = min(len_a, len_b) / max(len_a, len_b)
        if ratio < 0.5:
            return True

    urgent_words = {"urgent", "immediately", "hospital", "emergency", "critical", "today"}
    words_a = set(a.get("explanation_en", "").lower().split())
    words_b = set(b.get("explanation_en", "").lower().split())
    a_urgent = bool(urgent_words & words_a)
    b_urgent = bool(urgent_words & words_b)
    if a_urgent != b_urgent:
        return True
    return False


def _pick_conservative(a: dict, b: dict) -> dict:
    """
    Pick safer output when model outputs diverge.
    """
    urgent_words = {"urgent", "immediately", "hospital", "emergency", "critical", "today"}
    a_urgent = bool(urgent_words & set(a.get("explanation_en", "").lower().split()))
    b_urgent = bool(urgent_words & set(b.get("explanation_en", "").lower().split()))

    if a_urgent and not b_urgent:
        return a
    if b_urgent and not a_urgent:
        return b
    if len(a.get("explanation_en", "")) >= len(b.get("explanation_en", "")):
        return a
    return b


def _reconcile(claude_out: dict | None, gpt_out: dict | None) -> tuple[dict | None, bool]:
    """
    Return (best_output, did_diverge).
    Prefers Claude when aligned; conservative pick when diverged.
    """
    if claude_out and gpt_out:
        diverged = _outputs_diverge(claude_out, gpt_out)
        if diverged:
            return _pick_conservative(claude_out, gpt_out), True
        return claude_out, False
    if claude_out:
        return claude_out, False
    if gpt_out:
        return gpt_out, False
    return None, False


def _get_icmr_diet_tip(bio: ScoredBiomarker) -> tuple[str | None, str | None]:
    if bio.severity not in (SeverityLevel.WATCH, SeverityLevel.ACT_NOW, SeverityLevel.EMERGENCY):
        return None, None

    from services.verifier import ICMR_DB

    key = bio.normalized_name
    if not key or key not in ICMR_DB:
        return None, None

    entry = ICMR_DB[key]
    direction = None
    if bio.active_ref_low is not None and bio.value < bio.active_ref_low:
        direction = "low"
    elif bio.active_ref_high is not None and bio.value > bio.active_ref_high:
        direction = "high"

    if direction:
        tip_en = entry.get(f"indian_diet_tip_{direction}_en")
        tip_hi = entry.get(f"indian_diet_tip_{direction}_hi")
        return tip_en, tip_hi
    return None, None


def _fallback_explanation(bio: ScoredBiomarker) -> dict:
    from services.verifier import ICMR_DB

    icmr_entry = ICMR_DB.get(bio.normalized_name, {}) if bio.normalized_name else {}
    name = icmr_entry.get("display_name") or bio.raw_name
    val = bio.value
    unit = bio.unit

    if bio.severity == SeverityLevel.EMERGENCY:
        en = (
            f"Your {name} value of {val} {unit} is critically abnormal. "
            "Please go to a hospital or doctor today and show them this report."
        )
    elif bio.severity == SeverityLevel.ACT_NOW:
        en = (
            f"Your {name} value of {val} {unit} is outside the normal range and needs medical attention. "
            "Please see a doctor within the next few days."
        )
    elif bio.severity == SeverityLevel.WATCH:
        en = (
            f"Your {name} value of {val} {unit} is slightly outside the normal range. "
            "Monitor this and mention it to your doctor at your next visit."
        )
    elif bio.severity == SeverityLevel.NORMAL:
        en = f"Your {name} value of {val} {unit} is within the normal range."
    else:
        en = f"Your {name} value is {val} {unit}. Reference range was not available to assess this value."

    tip_en, tip_hi = _get_icmr_diet_tip(bio)
    return {
        "explanation_en": en,
        "explanation_hi": f"आपका {name} स्तर {val} {unit} है। अधिक जानकारी के लिए डॉक्टर से मिलें।",
        "explanation_mr": f"तुमचा {name} स्तर {val} {unit} आहे। अधिक माहितीसाठी डॉक्टरांना भेटा।",
        "diet_tip_en": tip_en,
        "diet_tip_hi": tip_hi,
    }


def _validate_output(out: dict) -> bool:
    """Ensure required explanation keys are present and usable."""
    required = ["explanation_en", "explanation_hi", "explanation_mr"]
    return all(isinstance(out.get(k), str) and len(out.get(k, "")) > 5 for k in required)


async def generate_report_summary(
    biomarkers: list[ExplainedBiomarker],
    overall_severity: SeverityLevel,
    age: int,
    gender: str,
    specialist: str | None,
    processing_time_ms: int,
) -> dict:
    """
    One Groq call after all individual explanations are done.
    Generates report summary + 3 doctor-visit questions + 3 Bodh chat starter questions (EN, HI, MR).
    """
    abnormal = [b for b in biomarkers if b.severity not in (SeverityLevel.NORMAL, SeverityLevel.UNKNOWN)]
    normal = [b for b in biomarkers if b.severity == SeverityLevel.NORMAL]

    sev = overall_severity.value

    abnormal_lines = "\n".join(
        f"- {b.raw_name}: {b.value} {b.unit} "
        f"(normal range: {b.active_ref_low}–{b.active_ref_high}, severity: {b.severity.value})"
        for b in abnormal
    ) or "None"

    normal_names = ", ".join(b.raw_name for b in normal[:8])
    if len(normal) > 8:
        normal_names += f" +{len(normal) - 8} more"

    user_prompt = _REPORT_SUMMARY_USER.format(
        age=age,
        gender=gender,
        severity=sev,
        time_ms=processing_time_ms,
        abnormal=abnormal_lines,
        normal_names=normal_names or "None",
        specialist=specialist or "General Physician",
    )

    fallback = {
        "summary_en": (
            f"Your report has {len(biomarkers)} values analyzed. {len(abnormal)} values need attention. "
            "Please consult your doctor for proper guidance."
        ),
        "summary_hi": (
            f"आपकी रिपोर्ट में {len(biomarkers)} मानों का विश्लेषण किया गया। {len(abnormal)} मानों पर ध्यान देने की आवश्यकता है।"
        ),
        "summary_mr": (
            f"तुमच्या अहवालात {len(biomarkers)} मूल्यांचे विश्लेषण केले गेले. {len(abnormal)} मूल्यांकडे लक्ष देणे आवश्यक आहे."
        ),
        "questions_en": [
            "What is the most important finding in my report and what could be causing it?",
            "When should I retest and which values should I monitor closely?",
            "What lifestyle changes or medications do you recommend based on my results?",
        ],
        "questions_hi": [
            "मेरी रिपोर्ट में सबसे महत्वपूर्ण निष्कर्ष क्या है?",
            "मुझे अगली जाँच कब करवानी चाहिए?",
            "इन परिणामों के आधार पर आप क्या सुझाव देते हैं?",
        ],
        "questions_mr": [
            "माझ्या अहवालातील सर्वात महत्त्वाचा निष्कर्ष कोणता आहे?",
            "पुन्हा चाचणी कधी करावी?",
            "या परिणामांच्या आधारे तुम्ही काय सुचवता?",
        ],
        "chat_questions_en": [
            "Which value on my report should I understand first, in simple words?",
            "Why might my flagged results look this way on this lab sheet?",
            "Can you explain one term on my report that looks confusing?",
        ],
        "chat_questions_hi": [
            "मेरी रिपोर्ट में सबसे पहले किस मान को सरल भाषा में समझना चाहिए?",
            "मेरे रिपोर्ट पर चिह्नित परिणाम ऐसे क्यों दिख सकते हैं?",
            "क्या आप मेरी रिपोर्ट का एक भ्रमित करने वाला शब्द समझा सकते हैं?",
        ],
        "chat_questions_mr": [
            "माझ्या अहवालात प्रथम कोणते मूल्य सोप्या भाषेत समजून घ्यावे?",
            "माझ्या अहवालातील चिन्हांकित निकाल असे का दिसू शकतात?",
            "तुम्ही माझ्या अहवालातील एक गोंधळात टाकणारा शब्द स्पष्ट करू शकता का?",
        ],
    }

    def _call_groq() -> dict:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            temperature=0.3,
            max_tokens=1800,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": _REPORT_SUMMARY_SYSTEM},
                {"role": "user", "content": user_prompt},
            ],
        )
        raw = (response.choices[0].message.content or "").strip()
        _log_explain_raw("report summary Groq raw API body", raw)
        return json.loads(raw)

    try:
        result = await asyncio.wait_for(asyncio.to_thread(_call_groq), timeout=SUMMARY_TIMEOUT)
        required = [
            "summary_en",
            "summary_hi",
            "summary_mr",
            "questions_en",
            "questions_hi",
            "questions_mr",
            "chat_questions_en",
            "chat_questions_hi",
            "chat_questions_mr",
        ]
        if not all(k in result for k in required):
            return fallback
        for key in (
            "questions_en",
            "questions_hi",
            "questions_mr",
            "chat_questions_en",
            "chat_questions_hi",
            "chat_questions_mr",
        ):
            if not isinstance(result[key], list) or len(result[key]) < 3:
                result[key] = fallback[key]
            else:
                result[key] = result[key][:3]
        _log_explain_json("report summary parsed JSON (after validation)", result)
        return result
    except Exception as e:
        print(f"  [summary] generation failed: {e}")
        return fallback


async def explain_one(bio: ScoredBiomarker) -> tuple[ExplainedBiomarker, bool]:
    """
    Explain one biomarker using parallel model calls.
    Returns (explained_biomarker, did_diverge).
    """
    claude_out, gpt_out = await asyncio.gather(
        _call_claude(bio),
        _call_gpt4o(bio),
        return_exceptions=True,
    )

    if isinstance(claude_out, Exception):
        claude_out = None
    if isinstance(gpt_out, Exception):
        gpt_out = None

    best, diverged = _reconcile(claude_out, gpt_out)
    if best and not _validate_output(best):
        best = None

    if not best:
        best = _fallback_explanation(bio)
        diverged = False

    # ICMR tip always overrides AI tip for Indian-context specificity.
    icmr_tip_en, icmr_tip_hi = _get_icmr_diet_tip(bio)
    final_tip_en = icmr_tip_en or best.get("diet_tip_en")
    final_tip_hi = icmr_tip_hi or best.get("diet_tip_hi")

    label = bio.normalized_name or bio.raw_name
    _log_explain_json(f"{label!r} groq-llama (explanation task)", claude_out if isinstance(claude_out, dict) else None)
    _log_explain_json(f"{label!r} gpt-4o (explanation task)", gpt_out if isinstance(gpt_out, dict) else None)
    _log_explain_json(
        f"{label!r} reconciled explanation JSON (diet_* may be replaced by ICMR below)",
        best,
    )
    if icmr_tip_en or icmr_tip_hi:
        print(
            f"[explainer] {label!r} final diet tips (ICMR override if present): "
            f"en={final_tip_en!r} hi={final_tip_hi!r}"
        )

    return (
        ExplainedBiomarker(
            **bio.model_dump(exclude={"needs_manual_review"}),
            needs_manual_review=bio.needs_manual_review,
            explanation_en=best["explanation_en"],
            explanation_hi=best["explanation_hi"],
            explanation_mr=best["explanation_mr"],
            diet_tip_en=final_tip_en,
            diet_tip_hi=final_tip_hi,
        ),
        diverged,
    )


async def explain_all(biomarkers: list[ScoredBiomarker]) -> tuple[list[ExplainedBiomarker], bool]:
    """
    Explain all biomarkers concurrently.
    Call ``generate_report_summary`` in the router after this returns.
    """
    results = await asyncio.gather(*[explain_one(b) for b in biomarkers], return_exceptions=True)

    explained: list[ExplainedBiomarker] = []
    any_diverged = False

    for bio, result in zip(biomarkers, results):
        if isinstance(result, Exception):
            fallback = _fallback_explanation(bio)
            explained.append(
                ExplainedBiomarker(
                    **bio.model_dump(exclude={"needs_manual_review"}),
                    needs_manual_review=bio.needs_manual_review,
                    explanation_en=fallback["explanation_en"],
                    explanation_hi=fallback["explanation_hi"],
                    explanation_mr=fallback["explanation_mr"],
                    diet_tip_en=fallback.get("diet_tip_en"),
                    diet_tip_hi=fallback.get("diet_tip_hi"),
                )
            )
        else:
            item, diverged = result
            explained.append(item)
            any_diverged = any_diverged or diverged

    return explained, any_diverged

