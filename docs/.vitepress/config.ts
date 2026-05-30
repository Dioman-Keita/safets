import { defineConfig } from "vitepress";

export default defineConfig({
  title: "SafeTS",
  description: "Finds common runtime crashes TypeScript can't detect",
  base: "/safets/",

  head: [
    ["link", { rel: "icon", href: "/safets/favicon.svg" }],
    ["meta", { name: "theme-color", content: "#ef4444" }],
  ],

  themeConfig: {
    logo: "/safets/logo.svg",
    siteTitle: "SafeTS",

    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "Patterns", link: "/guide/patterns" },
      { text: "CLI Reference", link: "/guide/cli" },
      {
        text: "v1.0.2",
        items: [
          { text: "Changelog", link: "/guide/changelog" },
          { text: "npm", link: "https://www.npmjs.com/package/@safets-org/cli" },
        ],
      },
    ],

    sidebar: [
      {
        text: "Introduction",
        items: [
          { text: "What is SafeTS?", link: "/guide/what-is-safets" },
          { text: "Getting Started", link: "/guide/getting-started" },
        ],
      },
      {
        text: "Core Concepts",
        items: [
          { text: "The 9 Patterns", link: "/guide/patterns" },
          { text: "How It Works", link: "/guide/how-it-works" },
          { text: "Baseline & CI", link: "/guide/baseline" },
        ],
      },
      {
        text: "Reference",
        items: [
          { text: "CLI Reference", link: "/guide/cli" },
          { text: "Changelog", link: "/guide/changelog" },
        ],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/Dioman-Keita/safets" },
      { icon: "npm", link: "https://www.npmjs.com/package/@safets-org/cli" },
    ],

    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © 2025 SafeTS",
    },

    search: {
      provider: "local",
    },

    editLink: {
      pattern: "https://github.com/Dioman-Keita/safets/edit/main/docs/:path",
      text: "Edit this page on GitHub",
    },
  },
});
