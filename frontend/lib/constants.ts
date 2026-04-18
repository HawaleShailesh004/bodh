import type { Lang, Severity } from "./types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const SEV: Record<Severity, {
  label: string; hi: string; mr: string;
  color: string; bg: string; border: string; text: string;
  badge: string; headerGrad: string; pageTint: string;
}> = {
  NORMAL: {
    label: "Normal", hi: "सामान्य", mr: "सामान्य",
    color: "#10B981",
    bg: "#F0FDF4", border: "#A7F3D0", text: "#065F46",
    badge: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600/20",
    headerGrad: "from-emerald-950 via-emerald-800 to-emerald-700",
    pageTint: "bg-[#F6FEF9]",
  },
  WATCH: {
    label: "Watch", hi: "ध्यान दें", mr: "लक्ष द्या",
    color: "#D97706",
    bg: "#FFFBEB", border: "#FDE68A", text: "#78350F",
    badge: "bg-amber-50 text-amber-800 ring-1 ring-amber-600/20",
    headerGrad: "from-amber-950 via-amber-800 to-amber-700",
    pageTint: "bg-[#FFFDF5]",
  },
  ACT_NOW: {
    label: "Act Now", hi: "तुरंत करें", mr: "आत्ता करा",
    color: "#E11D48",
    bg: "#FFF1F2", border: "#FECDD3", text: "#881337",
    badge: "bg-rose-50 text-rose-800 ring-1 ring-rose-600/20",
    headerGrad: "from-rose-950 via-rose-800 to-rose-700",
    pageTint: "bg-[#FFF5F6]",
  },
  EMERGENCY: {
    label: "Emergency", hi: "आपातकाल", mr: "आणीबाणी",
    color: "#7C3AED",
    bg: "#F5F3FF", border: "#DDD6FE", text: "#4C1D95",
    badge: "bg-violet-50 text-violet-800 ring-1 ring-violet-600/20",
    headerGrad: "from-violet-950 via-violet-900 to-violet-800",
    pageTint: "bg-[#FAF8FF]",
  },
  UNKNOWN: {
    label: "Unknown", hi: "अज्ञात", mr: "अज्ञात",
    color: "#94A3B8",
    bg: "#F8FAFC", border: "#E2E8F0", text: "#475569",
    badge: "bg-slate-100 text-slate-600 ring-1 ring-slate-400/20",
    headerGrad: "from-slate-900 via-slate-800 to-slate-700",
    pageTint: "bg-slate-50",
  },
};

/** Reference band on RangeBar + center arc on Gauge — matches severity (Watch = amber, not always green). */
export const SEV_RANGE_VIS: Record<
  Severity,
  { bar: string; label: string; gaugeCenter: string }
> = {
  NORMAL: { bar: "bg-emerald-300", label: "text-emerald-600", gaugeCenter: "#6EE7B7" },
  WATCH: { bar: "bg-amber-300", label: "text-amber-700", gaugeCenter: "#FBBF24" },
  ACT_NOW: { bar: "bg-rose-300", label: "text-rose-700", gaugeCenter: "#FB7185" },
  EMERGENCY: { bar: "bg-violet-300", label: "text-violet-700", gaugeCenter: "#C4B5FD" },
  UNKNOWN: { bar: "bg-slate-300", label: "text-slate-600", gaugeCenter: "#CBD5E1" },
};

export const JARGON: Record<string, { en: string; hi: string }> = {
  hemoglobin:  { en: "Protein in red blood cells that carries oxygen throughout your body.", hi: "लाल रक्त कोशिकाओं में प्रोटीन जो ऑक्सीजन ले जाता है।" },
  hematocrit:  { en: "Percentage of your blood made up of red blood cells.", hi: "रक्त में लाल रक्त कोशिकाओं का प्रतिशत।" },
  platelet:    { en: "Tiny blood cells that help form clots to stop bleeding.", hi: "छोटी रक्त कोशिकाएं जो रक्तस्राव रोकती हैं।" },
  neutrophil:  { en: "Most common white blood cell — first responder to infections.", hi: "संक्रमण से लड़ने वाली सबसे आम सफेद रक्त कोशिका।" },
  lymphocyte:  { en: "White blood cells that fight viral infections and make antibodies.", hi: "वायरल संक्रमण से लड़ने वाली सफेद रक्त कोशिकाएं।" },
  monocyte:    { en: "White blood cells that eat and destroy bacteria and dead cells.", hi: "बैक्टीरिया को नष्ट करने वाली सफेद रक्त कोशिकाएं।" },
  eosinophil:  { en: "White blood cells that respond to allergies and parasites.", hi: "एलर्जी और परजीवियों से लड़ने वाली कोशिकाएं।" },
  basophil:    { en: "Rare white blood cells involved in allergic reactions.", hi: "एलर्जी प्रतिक्रियाओं में शामिल दुर्लभ कोशिकाएं।" },
  creatinine:  { en: "Waste product filtered by kidneys — high levels suggest kidney strain.", hi: "गुर्दों द्वारा फिल्टर अपशिष्ट — उच्च स्तर गुर्दे की समस्या दर्शाता है।" },
  hba1c:       { en: "3-month average blood sugar — key diabetes marker.", hi: "3 महीने का औसत रक्त शर्करा — मधुमेह का मुख्य संकेतक।" },
  tsh:         { en: "Thyroid Stimulating Hormone — controls metabolism speed.", hi: "थायरॉइड उत्तेजक हार्मोन — चयापचय को नियंत्रित करता है।" },
  mcv:         { en: "Average size of your red blood cells.", hi: "लाल रक्त कोशिकाओं का औसत आकार।" },
  mch:         { en: "Average hemoglobin amount per red blood cell.", hi: "प्रत्येक लाल रक्त कोशिका में हीमोग्लोबिन की औसत मात्रा।" },
  mchc:        { en: "Concentration of hemoglobin inside red blood cells.", hi: "लाल रक्त कोशिकाओं में हीमोग्लोबिन की सांद्रता।" },
  rdw:         { en: "Variation in size of your red blood cells.", hi: "लाल रक्त कोशिकाओं के आकार में भिन्नता।" },
};

export const STAGES = [
  { en: "Decoding lab jargon...",            hi: "लैब भाषा समझ रहे हैं...",                mr: "लॅब भाषा समजत आहे..." },
  { en: "Removing personal information...",  hi: "व्यक्तिगत जानकारी हटाई जा रही है...",   mr: "वैयक्तिक माहिती काढत आहे..." },
  { en: "Verifying with ICMR guidelines...", hi: "ICMR मानकों से जाँच हो रही है...",       mr: "ICMR मानकांशी तपासत आहे..." },
  { en: "Generating plain summary...",       hi: "सरल सारांश बन रहा है...",                mr: "साधा सारांश तयार होत आहे..." },
  { en: "Translating to Hindi & Marathi...", hi: "हिंदी और मराठी में अनुवाद हो रहा है...", mr: "हिंदी आणि मराठीत भाषांतर होत आहे..." },
];

export function t(
  o: { en: string; hi: string; mr: string },
  l: Lang,
): string {
  return l === "hi" ? o.hi : l === "mr" ? o.mr : o.en;
}

export const PERSONAL_MESSAGES: Record<string, { msg: Record<string,string>; fact: Record<string,string> }> = {
  NORMAL: {
    msg: {
      en: "Your blood report looks healthy. Keep taking care of yourself.",
      hi: "आपकी रिपोर्ट स्वस्थ दिखती है। अपनी देखभाल करते रहें।",
      mr: "तुमचा अहवाल निरोगी दिसतो. स्वतःची काळजी घेत राहा.",
    },
    fact: {
      en: "People who monitor their health regularly are 40% more likely to catch conditions before symptoms appear.",
      hi: "जो लोग नियमित रूप से स्वास्थ्य की निगरानी करते हैं, उनमें लक्षण प्रकट होने से पहले स्थितियों का पता लगाने की संभावना 40% अधिक होती है।",
      mr: "जे लोक नियमितपणे आरोग्याचे निरीक्षण करतात ते लक्षणे दिसण्यापूर्वी 40% अधिक शक्यतेने स्थिती ओळखतात.",
    },
  },
  WATCH: {
    msg: {
      en: "Your body is sending early signals. You caught them in time.",
      hi: "आपका शरीर शुरुआती संकेत दे रहा है। आपने उन्हें समय पर पकड़ लिया।",
      mr: "तुमचे शरीर सुरुवातीचे संकेत देत आहे. तुम्ही ते वेळेत ओळखले.",
    },
    fact: {
      en: "Most conditions flagged at this stage are fully reversible with timely lifestyle adjustments.",
      hi: "इस चरण में चिह्नित अधिकांश स्थितियां समय पर जीवनशैली बदलाव से पूरी तरह ठीक हो सकती हैं।",
      mr: "या टप्प्यावर ओळखल्या गेलेल्या बहुतेक स्थिती वेळेवर जीवनशैली बदलांसह पूर्णपणे बरे होतात.",
    },
  },
  ACT_NOW: {
    msg: {
      en: "Some values need attention — but you're taking the right step by knowing.",
      hi: "कुछ मानों पर ध्यान देने की ज़रूरत है — लेकिन जानकारी लेना सही कदम है।",
      mr: "काही मूल्यांकडे लक्ष देणे आवश्यक आहे — पण जाणून घेणे योग्य पाऊल आहे.",
    },
    fact: {
      en: "Acting within 2 weeks of abnormal results significantly improves outcomes for most conditions.",
      hi: "असामान्य परिणामों के 2 सप्ताह के भीतर कार्रवाई करने से अधिकांश स्थितियों के परिणाम काफी बेहतर होते हैं।",
      mr: "असामान्य परिणामांच्या 2 आठवड्यांत कारवाई केल्यास बहुतेक स्थितींचे परिणाम लक्षणीयरीत्या सुधारतात.",
    },
  },
  EMERGENCY: {
    msg: {
      en: "Please see a doctor today. You're doing the right thing by knowing.",
      hi: "कृपया आज डॉक्टर से मिलें। जानकारी लेकर आप सही काम कर रहे हैं।",
      mr: "कृपया आज डॉक्टरांना भेटा. जाणून घेऊन तुम्ही योग्य गोष्ट करत आहात.",
    },
    fact: {
      en: "Immediate action on critical values has a proven impact on recovery. Every hour matters.",
      hi: "महत्वपूर्ण मानों पर तत्काल कार्रवाई से रिकवरी पर सिद्ध प्रभाव पड़ता है। हर घंटा मायने रखता है।",
      mr: "गंभीर मूल्यांवर त्वरित कारवाई केल्याने बरे होण्यावर सिद्ध परिणाम होतो. प्रत्येक तास महत्त्वाचा आहे.",
    },
  },
  UNKNOWN: {
    msg: {
      en: "Part of your report could not be auto-verified. A doctor can confirm what these values mean for you.",
      hi: "आपकी रिपोर्ट का कुछ हिस्सा स्वचालित रूप से सत्यापित नहीं हो सका। डॉक्टर इन मानों का अर्थ स्पष्ट कर सकते हैं।",
      mr: "तुमच्या अहवालाचा काही भाग आपोआप सत्यापित होऊ शकला नाही. डॉक्टर या मूल्यांचा अर्थ स्पष्ट करू शकतात.",
    },
    fact: {
      en: "When ranges are unclear, a clinician’s review is the safest next step.",
      hi: "जब सीमाएं स्पष्ट न हों, तो चिकित्सक की समीक्षा सबसे सुरक्षित कदम है।",
      mr: "मर्यादा स्पष्ट नसताना डॉक्टरांचे पुनरावलोकन सर्वात सुरक्षित पाऊल आहे.",
    },
  },
};

/** `sessionStorage` is per-tab; new-tab `/print` reads this snapshot (written before opening print). */
export const BODH_PRINT_SNAPSHOT_KEY = "bodh_result_print";