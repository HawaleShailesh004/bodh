"use client";

import { useApp } from "@/context/AppContext";

export default function SiteFooter() {
  const { lang } = useApp();

  const text =
    lang === "hi"
      ? "Bodh एक AI स्वास्थ्य साक्षरता उपकरण है — शैक्षिक उद्देश्यों के लिए। यह पेशेवर चिकित्सा सलाह, निदान या उपचार का विकल्प नहीं है। हमेशा अपने चिकित्सक से परामर्श करें।"
      : lang === "mr"
        ? "Bodh हे AI आरोग्य साक्षरता साधन आहे — शैक्षणिक हेतूंसाठी. हे व्यावसायिक वैद्यकीय सल्ला, निदान किंवा उपचाराचे स्थानिक नाही. नेहमी आपल्या डॉक्टरांचा सल्ला घ्या."
        : "Bodh is an AI-powered health literacy tool for educational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult your physician.";

  return (
    <footer className="border-t border-slate-200 bg-white py-8 text-center">
      <div className="mx-auto max-w-3xl px-4 text-xs leading-relaxed text-slate-500">{text}</div>
    </footer>
  );
}
