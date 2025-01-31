export const cleanMarkdown = (markdown: string) =>
  markdown.replace(/{\/\*.*\*\/}/g, "").trim();
