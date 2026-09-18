import type { APIRoute } from "astro";

// robots.txt is GENERATED, not a static file — so the domain lives in exactly
// one place (astro.config.mjs). Buying a new domain never edits this file.
// The sitemap integration reads the same origin, so they can't drift apart.
export const GET: APIRoute = ({ site }) => {
  if (!site) {
    throw new Error(
      "Set `site` in astro.config.mjs — robots.txt needs it for the Sitemap line.",
    );
  }

  const body = [
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${new URL("sitemap.xml", site).href}`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};