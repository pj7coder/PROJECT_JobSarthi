// ============================================================
// JobSarthi i18n Engine — EN / FR / AR (RTL)
// Usage: window.i18n.setLang('ar')
// ============================================================

(function () {
  const translations = {
    en: {
      // Nav
      nav_about: "About",
      nav_find_job: "Find a Job",
      nav_hire: "Hire Talent",
      // Hero
      hero_headline: "Welcome to JobSarthi",
      hero_subtitle: "Your intelligent companion in navigating modern careers. Powered by Sarthi AI, connecting talented seekers with top company recruiter pipelines.",
      hero_cta: "Get Started",
      // Portal
      portal_title: "Choose Your Journey",
      portal_subtitle: "Select one of our customized dashboards below to begin.",
      seeker_title: "Want to Find a Job",
      seeker_desc: "Create your profile, complete assessments, earn skills validation, and talk to your career companion Sarthi AI.",
      recruiter_title: "Need an Employee",
      recruiter_desc: "Post listings, manage active applicant pools, view verified skill assessments, and optimize hiring pipelines.",
      // Stats
      stat_dispatch: "Average Application Dispatch Time",
      stat_ats: "ATS Compatibility Pass Rate",
      stat_brands: "Direct Pipelines to 250+ Top Brands",
      stat_brands_desc: "Skip the traditional application queue. JobSarthi's algorithmic matching maps your skills, portfolio metrics, and verified test credentials directly to key hiring decision makers at leading technology, banking, and creative companies.",
      // Reviews
      reviews_title: "User Success Reviews",
      reviews_subtitle: "Hear from both finders and recruiters who rely on JobSarthi.",
      // Sarthi tools
      tool_interview: "Interview Mode",
      tool_interview_desc: "Real-time voice mock trials",
      tool_resume: "Resume Analyser",
      tool_resume_desc: "Instant ATS score & tips",
      tool_tracker: "Job Tracker",
      tool_tracker_desc: "Visual application pipeline",
      tool_guide: "Career Guide",
      tool_guide_desc: "AI roadmap recommendations",
      // Footer
      footer: "© 2026 JobSarthi Platform. All rights reserved.",
      // Language selector
      lang_label: "Language",
    },
    hi: {
      // Nav
      nav_about: "परिचय",
      nav_find_job: "नौकरी खोजें",
      nav_hire: "प्रतिभा नियुक्त करें",
      // Hero
      hero_headline: "जॉबसारथी में आपका स्वागत है",
      hero_subtitle: "आधुनिक करियर को दिशा देने में आपका बुद्धिमान साथी। सारथी एआई द्वारा संचालित, जो प्रतिभाशाली नौकरी चाहने वालों को शीर्ष कंपनियों के नियोक्ताओं से जोड़ता है।",
      hero_cta: "शुरू करें",
      // Portal
      portal_title: "अपना सफर चुनें",
      portal_subtitle: "शुरू करने के लिए नीचे दिए गए हमारे अनुकूलित डैशबोर्ड में से किसी एक को चुनें।",
      seeker_title: "नौकरी ढूंढनी है",
      seeker_desc: "अपनी प्रोफ़ाइल बनाएं, मूल्यांकन पूरा करें, कौशल सत्यापन प्राप्त करें, और अपने करियर साथी सारथी एआई से बात करें।",
      recruiter_title: "कर्मचारी की आवश्यकता है",
      recruiter_desc: "नौकरियां पोस्ट करें, सक्रिय आवेदकों का प्रबंधन करें, सत्यापित कौशल मूल्यांकन देखें और भर्ती प्रक्रियाओं को अनुकूलित करें।",
      // Stats
      stat_dispatch: "औसत आवेदन प्रेषण समय",
      stat_ats: "एटीएस अनुकूलता पास दर",
      stat_brands: "250+ शीर्ष ब्रांडों से सीधा संपर्क",
      stat_brands_desc: "पारंपरिक आवेदन कतार से बचें। जॉबसारथी का एल्गोरिथम मिलान आपके कौशल, पोर्टफोलियो मेट्रिक्स और सत्यापित परीक्षण क्रेडेंशियल्स को सीधे प्रमुख नियोक्ताओं से जोड़ता है।",
      // Reviews
      reviews_title: "उपयोगकर्ता सफलता समीक्षाएँ",
      reviews_subtitle: "नौकरी चाहने वालों और नियोक्ताओं दोनों की प्रतिक्रियाएँ सुनें जो जॉबसारथी पर भरोसा करते हैं।",
      // Sarthi tools
      tool_interview: "साक्षात्कार मोड",
      tool_interview_desc: "वास्तविक समय में आवाज आधारित मॉक ट्रायल",
      tool_resume: "रिज्यूमे विश्लेषक",
      tool_resume_desc: "त्वरित एटीएस स्कोर और सुझाव",
      tool_tracker: "जॉब ट्रैकर",
      tool_tracker_desc: "विज़ुअल एप्लिकेशन पाइपलाइन",
      tool_guide: "करियर गाइड",
      tool_guide_desc: "एआई रोडमैप सिफारिशें",
      // Footer
      footer: "© 2026 जॉबसारथी प्लेटफॉर्म। सर्वाधिकार सुरक्षित।",
      // Language selector
      lang_label: "भाषा",
    }
  };

  let currentLang = localStorage.getItem('js_lang') || 'en';

  function setLang(lang) {
    if (!translations[lang]) return;
    currentLang = lang;
    localStorage.setItem('js_lang', lang);

    const isRTL = lang === 'ar';
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');

    // Apply Arabic typography adjustments
    document.documentElement.classList.toggle('lang-ar', isRTL);
    document.documentElement.classList.toggle('lang-rtl', isRTL);

    // Translate all data-i18n elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (translations[lang][key] !== undefined) {
        el.textContent = translations[lang][key];
      }
    });

    // Update active state on language buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('lang-btn-active', btn.getAttribute('data-lang') === lang);
    });
  }

  function t(key) {
    return (translations[currentLang] || translations.en)[key] || key;
  }

  function getCurrentLang() { return currentLang; }

  window.i18n = { setLang, t, getCurrentLang, translations };

  // Auto-apply on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setLang(currentLang));
  } else {
    setLang(currentLang);
  }
})();
