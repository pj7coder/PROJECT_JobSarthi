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
    fr: {
      nav_about: "À Propos",
      nav_find_job: "Trouver un Emploi",
      nav_hire: "Recruter",
      hero_headline: "Bienvenue sur JobSarthi",
      hero_subtitle: "Votre compagnon intelligent pour naviguer dans les carrières modernes. Propulsé par Sarthi AI, reliant des talents aux meilleurs recruteurs.",
      hero_cta: "Commencer",
      portal_title: "Choisissez Votre Parcours",
      portal_subtitle: "Sélectionnez l'un de nos tableaux de bord personnalisés pour commencer.",
      seeker_title: "Trouver un Emploi",
      seeker_desc: "Créez votre profil, passez des évaluations, validez vos compétences et dialoguez avec Sarthi AI.",
      recruiter_title: "Recruter un Talent",
      recruiter_desc: "Publiez des offres, gérez vos candidats, consultez les évaluations et optimisez votre pipeline de recrutement.",
      stat_dispatch: "Temps Moyen de Dépôt de Candidature",
      stat_ats: "Taux de Compatibilité ATS",
      stat_brands: "Connexions Directes à 250+ Marques",
      stat_brands_desc: "Contournez la file traditionnelle. La correspondance algorithmique de JobSarthi connecte directement vos compétences aux meilleurs décideurs RH.",
      reviews_title: "Témoignages de Succès",
      reviews_subtitle: "Écoutez les candidats et recruteurs qui font confiance à JobSarthi.",
      tool_interview: "Mode Entretien",
      tool_interview_desc: "Simulations vocales en temps réel",
      tool_resume: "Analyseur de CV",
      tool_resume_desc: "Score ATS instantané & conseils",
      tool_tracker: "Suivi des Candidatures",
      tool_tracker_desc: "Pipeline visuel des candidatures",
      tool_guide: "Guide de Carrière",
      tool_guide_desc: "Feuille de route IA",
      footer: "© 2026 Plateforme JobSarthi. Tous droits réservés.",
      lang_label: "Langue",
    },
    ar: {
      nav_about: "حول",
      nav_find_job: "ابحث عن وظيفة",
      nav_hire: "استأجر موهبة",
      hero_headline: "مرحباً بك في جوب سارثي",
      hero_subtitle: "رفيقك الذكي في رحلة التطور المهني. مدعوم بذكاء سارثي الاصطناعي، يربطك بأفضل الشركات والمسؤولين عن التوظيف.",
      hero_cta: "ابدأ الآن",
      portal_title: "اختر مسارك",
      portal_subtitle: "اختر إحدى لوحات التحكم المخصصة للبدء.",
      seeker_title: "أبحث عن وظيفة",
      seeker_desc: "أنشئ ملفك الشخصي، أكمل التقييمات، احصل على تحقق المهارات، وتحدث مع مساعدك الذكي سارثي.",
      recruiter_title: "أبحث عن موظف",
      recruiter_desc: "انشر الوظائف، أدر المتقدمين، شاهد تقييمات المهارات الموثقة، وحسّن مسارات التوظيف.",
      stat_dispatch: "متوسط وقت إرسال الطلب",
      stat_ats: "معدل اجتياز فحص ATS",
      stat_brands: "روابط مباشرة مع 250+ علامة تجارية",
      stat_brands_desc: "تجاوز قائمة الانتظار التقليدية. يربط نظام المطابقة في جوب سارثي مهاراتك مباشرةً بصانعي قرارات التوظيف في أبرز شركات التقنية والمال.",
      reviews_title: "قصص نجاح المستخدمين",
      reviews_subtitle: "استمع لتجارب الباحثين عن عمل والمسؤولين عن التوظيف.",
      tool_interview: "نمط المقابلة",
      tool_interview_desc: "محاكاة مقابلات صوتية فورية",
      tool_resume: "محلل السيرة الذاتية",
      tool_resume_desc: "نتيجة ATS فورية ونصائح",
      tool_tracker: "متتبع الوظائف",
      tool_tracker_desc: "خط سير مرئي للطلبات",
      tool_guide: "دليل المسار المهني",
      tool_guide_desc: "خريطة طريق مدعومة بالذكاء الاصطناعي",
      footer: "© 2026 منصة جوب سارثي. جميع الحقوق محفوظة.",
      lang_label: "اللغة",
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
