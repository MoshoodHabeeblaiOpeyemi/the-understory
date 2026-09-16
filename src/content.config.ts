// The Content Contract — defines what a "lesson" is.
// Every file in src/content/lessons/ must obey this schema,
// or the build fails and points at the offender.

import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const lessons = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/lessons" }),
  schema: z.object({
    title: z.string(), // lesson name, e.g. "What Happens When You Press Enter"
    module: z.number(), // which of the 17 modules (1-17)
    day: z.number(), // day number in the 167-day journey
  }),
});

export const collections = { lessons };
