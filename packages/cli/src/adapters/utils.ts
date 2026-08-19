import YAML from 'yaml';

/**
 * Ensures path uses forward slashes regardless of OS.
 */
export function normalizePathSeparators(pathStr: string): string {
  return pathStr.replace(/\\/g, '/');
}

/**
 * Serializes an object to standard YAML string.
 */
export function stringifyYaml(data: unknown): string {
  return YAML.stringify(data, {
    indent: 2,
    lineWidth: 0,
  });
}

/**
 * Creates Markdown content with leading YAML frontmatter.
 */
export function stringifyFrontmatter(
  frontmatter: Record<string, unknown>,
  body: string
): string {
  const yamlStr = stringifyYaml(frontmatter).trim();
  const trimmedBody = body.trim();
  return `---\n${yamlStr}\n---\n\n${trimmedBody}\n`;
}

/**
 * Formats a slug string from text.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Enforces a strict line budget on generated text, trimming if necessary.
 */
export function enforceLineBudget(content: string, maxLines: number): string {
  const lines = content.split(/\r?\n/);
  if (lines.length <= maxLines) {
    return content;
  }
  const truncated = lines.slice(0, maxLines - 3);
  truncated.push('<!-- Line budget limit reached. Truncated for context efficiency. -->');
  return truncated.join('\n') + '\n';
}
