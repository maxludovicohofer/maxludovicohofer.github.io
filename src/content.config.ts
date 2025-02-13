import { defineCollection, reference, z } from "astro:content";
import { file, glob } from "astro/loaders";

const documents = z.object({
  draft: z.boolean().optional(),
});

const posts = documents.extend({
  title: z.string().optional(),
  highlight: z.boolean().optional(),
  publishingDate: z.date().max(new Date()).optional(),
  youTubeID: z.string().optional(),
  youTubeAspectRatio: z.enum(["16/9", "16/10"]).optional(),
});

// Define your collection(s)
const projects = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "src/data/projects" }),
  schema: posts.extend({
    category: z.enum(["Game", "Prototype", "Tool"]).optional(),
    developmentTime: z.string().duration(),
    team: z.number().int().positive().optional(),
    roles: z.array(z.string()).optional(),
    tech: z.array(reference("tech")),
    downloadLinks: z.array(z.string().url()).optional(),
    awards: z.array(z.string()).optional(),
  }),
});

const thoughts = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "src/data/thoughts" }),
  schema: posts,
});

const tech = defineCollection({
  loader: file("src/data/tech.yaml"),
  schema: z.object({
    id: z.string(),
    experience: z.string().duration(),
    group: z.string().optional(),
    functionalities: z.string().array().optional(),
  }),
});

const docs = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "src/data/docs" }),
  schema: documents,
});

const roles = defineCollection({
  loader: file("src/data/roles.yaml"),
  schema: z.object({
    id: z.string(),
    homepageTitle: z.string().optional(),
  }),
});

// Export a single `collections` object to register your collection(s)
export const collections = {
  projects,
  thoughts,
  tech,
  docs,
  roles,
};
