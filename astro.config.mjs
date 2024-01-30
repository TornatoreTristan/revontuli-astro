import { defineConfig } from "astro/config";
import vue from "@astrojs/vue";
import partytown from "@astrojs/partytown";
import minify from "astro-min";
import sitemap from "@astrojs/sitemap";

import robotsTxt from "astro-robots-txt";

// https://astro.build/config
export default defineConfig({
  site: "https://www.revontuli.fr",
  integrations: [vue(), partytown({
    config: {
      forward: ["dataLayer.push"]
    }
  }), minify(), sitemap(), robotsTxt()]
});