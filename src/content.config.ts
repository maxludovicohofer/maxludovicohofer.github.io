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

const maxDate = new Date();
const minDate = new Date("1997-09-01");

const knowHow = defineCollection({
  loader: file("src/data/know-how.yaml"),
  schema: fileSchema.extend({
    start: z.date().max(maxDate).min(minDate),
    end: z.date().max(maxDate).min(minDate).optional(),
    school: z.boolean().optional(),
    dropOut: z.boolean().optional(),
    reasonForLeaving: z.string().optional(),
    skills: z.array(
      z.object({
        job: reference("roles"),
        achievements: z.string().array(),
        countAsWork: z.boolean().optional(),
      })
    ),
    translateId: z.boolean().optional(),
  }),
});

const certifications = defineCollection({
  loader: file("src/data/certifications.yaml"),
  schema: fileSchema.extend({
    institution: z.string(),
    date: z.date().max(maxDate).min(minDate),
    content: reference("projects").optional(),
    translateInstitution: z.boolean().optional(),
    type: z.enum(["award"]).optional(),
  }),
});

const languages = defineCollection({
  loader: file("src/data/languages.yaml"),
  schema: fileSchema.extend({
    code: z.string(),
    level: z.enum(["native", "fluent", "business", "everyday"]),
  }),
});

const documents = z.object({
  title: z.string().optional(),
  draft: z.boolean().optional(),
  publishingDate: z.date().max(maxDate).min(minDate).optional(),
});

const docs = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "src/data/docs" }),
  schema: documents,
});

const posts = documents
  .extend({
    youTubeID: z.string().optional(),
    youTubeAspectRatio: z.enum(["16/9", "16/10", "1/1", "3/4"]).optional(),
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
  ["know-how"]: knowHow,
  certifications,
  languages,
  docs,
  projects,
  thoughts,
  translations,
};
