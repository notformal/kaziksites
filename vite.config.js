import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { themes } from "./src/themes.js";
import {
  brandDescription,
  headTags,
  iconSvg,
  ogImagePng,
  robotsTxt,
  sitemapXml,
  webmanifest,
} from "./scripts/site-assets.mjs";

/**
 * Brand-aware production build.
 *
 * `VITE_BRAND` selects the brand (set by the build:aurora|ember|royale scripts).
 * `SITE_URL` (optional) enables absolute URLs — canonical, og:url and sitemap.xml.
 * Without it the build stays valid but omits those, rather than inventing a domain.
 */
export default defineConfig(() => {
  const brand = themes[process.env.VITE_BRAND] ? process.env.VITE_BRAND : "aurora";
  const theme = themes[brand];
  const siteUrl = (process.env.SITE_URL || "").trim().replace(/\/+$/, "");

  return {
    base: "./",
    plugins: [
      react(),
      {
        name: "brand-site-assets",
        // Brand the document head so crawlers and social scrapers (which never
        // run JS) see the right title, description and preview card.
        transformIndexHtml(html) {
          const title = `${theme.name} — Social Casino`;
          return html
            .replace('<html lang="en">', `<html lang="en" data-build-brand="${brand}">`)
            .replace(
              '<meta name="description" content="Premium social casino showcase"/>',
              `<meta name="description" content="${brandDescription(theme).replace(/"/g, "&quot;")}"/>`,
            )
            .replace(
              '<meta name="theme-color" content="#080b12"/>',
              `<meta name="theme-color" content="${theme.accent}"/>`,
            )
            .replace("<title>Nova Casino</title>", `<title>${title}</title>`)
            .replace("</head>", `${headTags({ brand, theme, siteUrl })}\n</head>`);
        },
        generateBundle() {
          const emit = (fileName, source) => this.emitFile({ type: "asset", fileName, source });
          emit("icon.svg", iconSvg(theme));
          emit("site.webmanifest", webmanifest(brand, theme));
          emit("og-image.png", ogImagePng(theme));
          emit("robots.txt", robotsTxt(siteUrl));
          if (siteUrl) emit("sitemap.xml", sitemapXml(siteUrl));
        },
      },
    ],
    build: { sourcemap: false },
    server: {
      host: "127.0.0.1",
      // The repo also contains the `platform/` workspace and this app's own
      // build output. Watching either makes the dev server reload the page for
      // every file a *different* build writes — thousands of reloads, and
      // eventually the watcher falls over. Neither is a source input here.
      watch: {
        ignored: ["**/platform/**", "**/dist/**", "**/node_modules/**", "**/server/data/**"],
      },
    },
    preview: { host: "127.0.0.1" },
    // The slot/dice maths lives under public/ (it must be served verbatim), so
    // its tests import across that boundary and live in src/ alongside the specs.
    test: { include: ["src/**/*.test.js"] },
  };
});
