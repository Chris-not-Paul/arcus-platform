import {
  useEffect,
  useMemo,
  useState,
} from "react";

import LanguageContext from "./languageContext";

const translations = {
  en: {
    about: "About",
    analytics: "Analytics",
    atlas: "Atlas",
    data: "Data",
    plans: "Plans",
    infrastructureFailureObservatory:
      "Infrastructure Failure Observatory",
    enterprise: "Enterprise",
    methodology: "Methodology",
    professional: "Professional",
    publications: "Publications",
  },
  it: {
    about: "Chi siamo",
    analytics: "Analytics",
    atlas: "Atlante",
    data: "Dati",
    plans: "Piani",
    infrastructureFailureObservatory:
      "Osservatorio sui Cedimenti Infrastrutturali",
    enterprise: "Enterprise",
    methodology: "Metodologia",
    professional: "Professional",
    publications: "Pubblicazioni",
  },
};

function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem("arcus-language") || "en";
  });

  useEffect(() => {
    localStorage.setItem(
      "arcus-language",
      language
    );

    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(() => {
    const dictionary =
      translations[language] || translations.en;

    return {
      language,
      setLanguage,
      t: (key) => dictionary[key] || key,
    };
  }, [language]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export default LanguageProvider;
