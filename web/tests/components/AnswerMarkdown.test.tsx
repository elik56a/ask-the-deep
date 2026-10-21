import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { AnswerMarkdown } from "#/components/AnswerMarkdown";

const render = (text: string) =>
  renderToStaticMarkup(<AnswerMarkdown text={text} />);

it("renders bold text and lists", () => {
  const html = render("He works at **Phytech**:\n\n- React\n- Node.js");
  expect(html).toContain("<strong");
  expect(html).toContain("Phytech</strong>");
  expect(html).toContain("<li>React</li>");
});

it("never renders raw HTML", () => {
  const html = render('Hi <script>alert(1)</script><img src=x onerror="x">');
  expect(html).not.toContain("<script");
  expect(html).not.toContain("<img");
  expect(html).not.toContain("onerror");
});

it("opens links safely and drops javascript: urls", () => {
  const html = render(
    "[site](https://devconverter.dev) [bad](javascript:alert(1))",
  );
  expect(html).toContain('href="https://devconverter.dev"');
  expect(html).toContain('rel="noopener noreferrer"');
  expect(html).not.toContain("javascript:");
});

it("unwraps elements an answer may not use", () => {
  const html = render("# Title\n\n![x](https://example.com/x.png)");
  expect(html).not.toContain("<h1");
  expect(html).not.toContain("<img");
  expect(html).toContain("Title");
});
