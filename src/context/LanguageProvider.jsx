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
    infrastructureFailureObservatory:
      "Infrastructure Failure Observatory",
    methodology: "Methodology",
    publications: "Publications",
  },
  it: {
    about: "Chi siamo",
    analytics: "Analytics",
    atlas: "Atlante",
    infrastructureFailureObservatory:
      "Osservatorio sui Cedimenti Infrastrutturali",
    methodology: "Metodologia",
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
