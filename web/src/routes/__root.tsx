import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { LANG_BOOT_SCRIPT } from "#/constants/i18n.constants";
import {
  OG_IMAGE,
  PERSON_JSON_LD,
  SEO_DESCRIPTION,
  SEO_TITLE,
  SITE_NAME,
  SITE_URL,
  THEME_COLOR,
} from "#/constants/seo.constants";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: SEO_TITLE },
      { name: "description", content: SEO_DESCRIPTION },
      { name: "author", content: SITE_NAME },
      { name: "theme-color", content: THEME_COLOR },
      { property: "og:type", content: "profile" },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:url", content: `${SITE_URL}/` },
      { property: "og:title", content: SEO_TITLE },
      { property: "og:description", content: SEO_DESCRIPTION },
      { property: "og:image", content: OG_IMAGE.url },
      { property: "og:image:width", content: OG_IMAGE.width },
      { property: "og:image:height", content: OG_IMAGE.height },
      { property: "og:image:alt", content: OG_IMAGE.alt },
      { property: "og:locale", content: "en_US" },
      { property: "og:locale:alternate", content: "he_IL" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: SEO_TITLE },
      { name: "twitter:description", content: SEO_DESCRIPTION },
      { name: "twitter:image", content: OG_IMAGE.url },
      { name: "twitter:image:alt", content: OG_IMAGE.alt },
      { "script:ld+json": PERSON_JSON_LD },
    ],
    scripts: [{ children: LANG_BOOT_SCRIPT }],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "canonical", href: `${SITE_URL}/` },
      { rel: "icon", href: "/favicon.ico", sizes: "32x32" },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    // LANG_BOOT_SCRIPT may change lang and dir before React hydrates.
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}

        <Scripts />
      </body>
    </html>
  );
}
