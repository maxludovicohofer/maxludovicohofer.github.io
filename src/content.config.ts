import { defineCollection, reference, z } from "astro:content";
import { file, glob } from "astro/loaders";

const fileSchema = z.object({
  id: z.string(),
});

const roles = defineCollection({
  loader: file("src/data/roles.yaml"),
  schema: fileSchema.extend({
    matches: z.array(reference("roles")).optional(),
    notMatches: z.array(reference("roles")).optional(),
    workFields: z.string().array().optional(),
    specializations: z.string().array().optional(),
  }),
});

const roleContent = z.object({
  roles: z.array(reference("roles")),
});

const tech = defineCollection({
  loader: file("src/data/tech.yaml"),
  schema: fileSchema
    .extend({
      experience: z.string().duration(),
      group: z.string().optional(),
      functionalities: z
        .array(z.string().or(fileSchema.merge(roleContent)))
        .optional(),
    })
    .merge(roleContent),
});

const documents = z.object({
  draft: z.boolean().optional(),
});

const docs = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "src/data/docs" }),
  schema: documents,
});

const posts = documents
  .extend({
    title: z.string().optional(),
    publishingDate: z.date().max(new Date()).optional(),
    youTubeID: z.string().optional(),
    youTubeAspectRatio: z.enum(["16/9", "16/10", "1/1"]).optional(),
  })
  .merge(roleContent);

// Define your collection(s)
const projects = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "src/data/projects" }),
  schema: posts.extend({
    category: z.enum(["Game", "Prototype", "Tool"]).optional(),
    developmentTime: z.string().duration(),
    team: z.number().int().positive().optional(),
    tech: z.array(reference("tech")),
    downloadLinks: z.array(z.string().url()).optional(),
    awards: z.array(z.string()).optional(),
  }),
});

const thoughts = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "src/data/thoughts" }),
  schema: posts,
});

export const translationsPath = "src/data/translations";

const translations = defineCollection({
  loader: glob({ pattern: "**/[^_]*.json", base: translationsPath }),
  schema: z.record(
    z.object({
      translation: z.string(),
      api: z.enum(["deepl"]).optional(),
    })
  ),
});

// Export a single `collections` object to register your collection(s)
export const collections = {
  roles,
  tech,
  docs,
  projects,
  thoughts,
  translations,
};
