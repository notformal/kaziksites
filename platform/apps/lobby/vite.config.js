import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { BRANDS, brandById } from "../../config/index.mjs";

// Бренды описаны в platform/config/games.config.json — здесь только сборка.
export default defineConfig(({ mode }) => {
  const identity = brandById(mode);
  const brand = identity?.id ?? null;
  return {
    base: "./",
    plugins: [
      react(),
      identity && {
        name: "fixed-brand-html",
        transformIndexHtml(html) {
          return html
            .replace('<html lang="en">', `<html lang="en" data-build-brand="${brand}">`)
            .replace(
              '<meta name="theme-color" content="#080b12"/>',
              `<meta name="theme-color" content="${identity.themeColor}"/><meta name="casino-brand" content="${brand}"/>`,
            )
            .replace(
              "<title>Nova Casino</title>",
              `<title>${identity.name} — Social Casino</title>`,
            );
        },
      },
    ].filter(Boolean),
    define: {
      // Реестр брендов инжектируется из общего конфига: тема, цвета и имя бренда
      // существуют ровно в одном месте — platform/config/games.config.json.
      __BRAND_REGISTRY__: JSON.stringify(BRANDS),
      ...(brand ? { "import.meta.env.VITE_BRAND": JSON.stringify(brand) } : {}),
    },
    build: { sourcemap: false, outDir: brand ? `dist/${brand}` : "dist" },
    server: { host: "127.0.0.1" },
    preview: { host: "127.0.0.1" },
    test: { include: ["src/**/*.test.js"] },
  };
});
