/** The only markdown elements an answer may render; anything else is unwrapped to text. */
export const ANSWER_ELEMENTS = [
  "p",
  "strong",
  "em",
  "ul",
  "ol",
  "li",
  "a",
  "code",
  "br",
];

/** A bare http(s) URL the model wrote as plain text: not already in a link, an autolink or code, and without the sentence's trailing punctuation. */
export const BARE_URL =
  /(?<![<(`\w/])https?:\/\/[\w\-.~:/?#@!$&'*+,;=%]*[\w\-~/#@$&*+=%]/g;
