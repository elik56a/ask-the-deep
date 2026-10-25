export const SITE_URL = "https://eliyahukriel.dev";

export const SITE_NAME = "Eliyahu Kriel";

export const SEO_TITLE = "Eliyahu Kriel · Senior Full Stack Engineer";

export const SEO_DESCRIPTION =
  "Ask my AI agent about my work, skills and projects. It answers only from my own notes, and you can watch every step it takes: the search, each model call, the tokens and the cost.";

export const OG_IMAGE = {
  url: `${SITE_URL}/og.png`,
  width: "1200",
  height: "630",
  alt: "Eliyahu Kriel: ask my AI agent and watch every step on the way down.",
};

export const THEME_COLOR = "#06192f";

export const PERSON_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: SITE_NAME,
  jobTitle: "Senior Full Stack Engineer",
  url: SITE_URL,
  image: `${SITE_URL}/eliyahu.jpg`,
  sameAs: ["https://www.linkedin.com/in/elikri", "https://github.com/elik56a"],
  knowsAbout: [
    "React",
    "React Native",
    "TypeScript",
    "Node.js",
    "Python",
    "AWS",
    "Retrieval-augmented generation",
  ],
};
