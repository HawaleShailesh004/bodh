"""Parallel AI explanation generation with strict safety fallbacks."""

import asyncio
import json
import os

from anthropic import AsyncAnthropic
from openai import AsyncOpenAI

from models.schemas import ExplainedBiomarker, ScoredBiomarker, SeverityLevel

from dotenv import load_dotenv
load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not ANTHROPIC_API_KEY or not OPENAI_API_KEY:
    raise ValueError("ANTHROPIC_API_KEY and OPENAI_API_KEY must be set")

# Clients.
claude = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Timeout (seconds) per model call.
MODEL_TIMEOUT = 15.0

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
    if claude is None:
        print("    [claude] ERROR: Missing ANTHROPIC_API_KEY")
        return None
    try:
        print(f"    [claude] calling for {bio.normalized_name}...")
        msg = await asyncio.wait_for(
            claude.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=600,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": _build_prompt(bio)}],
            ),
            timeout=MODEL_TIMEOUT,
        )
        print("    [claude] success")
        raw = msg.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw)
    except asyncio.TimeoutError:
        print(f"    [claude] TIMEOUT after {MODEL_TIMEOUT}s")
        return None
    except Exception as e:
        print(f"    [claude] ERROR: {type(e).__name__}: {e}")
        return None


async def _call_gpt4o(bio: ScoredBiomarker) -> dict | None:
    if openai_client is None:
        print("    [gpt4o] ERROR: Missing OPENAI_API_KEY")
        return None
    try:
        print(f"    [gpt4o] calling for {bio.normalized_name}...")
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
        print("    [gpt4o] success")
        content = resp.choices[0].message.content or "{}"
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
    Returns (explained_list, any_diverged).
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

