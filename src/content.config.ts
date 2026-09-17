// The Content Contract — defines what a "lesson" is.
// Every file in src/content/lessons/ must obey this schema,
// or the build fails and points at the offender.

import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const lessons = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/lessons" }),
  schema: z.object({
    title: z.string(), // lesson name, e.g. "What Happens When You Press Enter"
    subtitle: z.string().optional(), // one-line zoom-in under the title
    summary: z.string().max(280).optional(), // for cards, search, social
    module: z.number(), // which of the 18 modules (1-18)
    day: z.number(), // day number in the 193-day journey
    tags: z.array(z.string()).default([]), // search fuel
    // Terms this lesson introduces. Drives /glossary backlinks:
    // a term mentioned here + defined in src/data/glossary.json
    // automatically gets its "Introduced in Day X" link.
    glossary: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

// The second shelf: Field Notes — stand-alone essays that live outside
// the 193-day arc. Same contract style as lessons: every file obeys the
// schema or the build names the offender.
const fieldNotes = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/field-notes" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(), // "2026-09-03" in frontmatter → Date at build
    description: z.string().max(200), // card + search excerpt
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { lessons, fieldNotes };
