// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    "@nuxt/eslint",
    "@nuxt/ui",
    "@nuxt/image",
    "@nuxt/scripts",
    "@nuxtjs/google-fonts",
    "@nuxtjs/i18n",
    "@sentry/nuxt/module",
  ],

  devtools: {
    enabled: true,
  },

  css: ["~/assets/css/main.css"],

  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL || "",
    encryptionKey:
      process.env.ENCRYPTION_KEY || "change-this-32-char-encryption-key",
    sessionSecret:
      process.env.SESSION_SECRET || "change-this-to-a-long-random-secret-min32",
  },

  i18n: {
    locales: [
      { code: "en", name: "English", file: "en.json" },
      { code: "pl", name: "Polski", file: "pl.json" },
      { code: "de", name: "Deutsch", file: "de.json" },
    ],
    defaultLocale: "en",
    langDir: "./locales/",
    strategy: "no_prefix",
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: "i18n_locale",
      redirectOn: "root",
    },
  },

  compatibilityDate: "2025-01-15",

  eslint: {
    config: {
      stylistic: {
        commaDangle: "never",
        braceStyle: "1tbs",
      },
    },
  },

  sentry: {
    org: "infinix-solutions",
    project: "infinixbackup",
    /**
     * Ignore a next line, beacause a Sentry SDK don't implement in config types a "url" param for Self-Hosted instances
     */
    // @ts-ignore-next-line
    url: "https://sentry.infinix-solutions.com/",
  },

  sourcemap: {
    client: "hidden",
  },
});