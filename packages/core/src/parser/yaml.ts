import YAML from 'yaml';
import { z } from 'zod';

export interface YamlDiagnostic {
  message: string;
  line?: number;
  column?: number;
  snippet?: string;
}

export class YamlParseError extends Error {
  public line?: number;
  public column?: number;
  public snippet?: string;

  constructor(message: string, line?: number, column?: number, snippet?: string) {
    super(message);
    this.name = 'YamlParseError';
    this.line = line;
    this.column = column;
    this.snippet = snippet;
  }
}

/**
 * Extracts a contextual snippet around a specific line in text.
 */
function extractSnippet(content: string, line?: number): string | undefined {
  if (!line || line < 1) return undefined;
  const lines = content.split(/\r?\n/);
  const targetIndex = line - 1;
  const start = Math.max(0, targetIndex - 1);
  const end = Math.min(lines.length - 1, targetIndex + 1);

  return lines
    .slice(start, end + 1)
    .map((l, idx) => {
      const currentLine = start + idx + 1;
      const marker = currentLine === line ? '> ' : '  ';
      return `${marker}${currentLine} | ${l}`;
    })
    .join('\n');
}

/**
 * Parses raw YAML text with robust error diagnostics.
 */
export function parseYaml<Output = unknown>(
  content: string,
  schema?: z.ZodType<Output, z.ZodTypeDef, unknown>
): { success: true; data: Output } | { success: false; error: YamlDiagnostic } {
  try {
    const parsed = YAML.parse(content) as unknown;

    if (schema) {
      const result = schema.safeParse(parsed);
      if (!result.success) {
        const firstIssue = result.error.issues[0];
        const pathStr = firstIssue.path.length > 0 ? ` at path "${firstIssue.path.join('.')}"` : '';
        return {
          success: false,
          error: {
            message: `Schema validation failed${pathStr}: ${firstIssue.message}`,
          },
        };
      }
      return { success: true, data: result.data };
    }

    return { success: true, data: parsed as Output };
  } catch (err: unknown) {
    let line: number | undefined;
    let column: number | undefined;
    let message = 'Failed to parse YAML';

    if (err && typeof err === 'object') {
      const yamlErr = err as { message?: string; linePos?: Array<{ line: number; col: number }>; pos?: [number, number] };
      if (yamlErr.linePos && yamlErr.linePos.length > 0) {
        line = yamlErr.linePos[0].line;
        column = yamlErr.linePos[0].col;
      }
      if (yamlErr.message) {
        message = yamlErr.message;
      }
    } else if (typeof err === 'string') {
      message = err;
    }

    const snippet = extractSnippet(content, line);

    return {
      success: false,
      error: {
        message,
        line,
        column,
        snippet,
      },
    };
  }
}

/**
 * Parses raw YAML text or throws a formatted YamlParseError.
 */
export function parseYamlOrThrow<Output = unknown>(
  content: string,
  schema?: z.ZodType<Output, z.ZodTypeDef, unknown>
): Output {
  const result = parseYaml(content, schema);
  if (!result.success) {
    throw new YamlParseError(
      result.error.message,
      result.error.line,
      result.error.column,
      result.error.snippet
    );
  }
  return result.data;
}

export interface FrontmatterResult<T = Record<string, unknown>> {
  frontmatter: T;
  body: string;
  rawFrontmatter: string;
}

/**
 * Parses Markdown documents with YAML frontmatter.
 * Handles edge cases: CRLF line endings, empty frontmatter, and code blocks containing triple dashes.
 */
export function parseFrontmatter<Output = Record<string, unknown>>(
  content: string,
  schema?: z.ZodType<Output, z.ZodTypeDef, unknown>
): FrontmatterResult<Output> {
  // Strip BOM if present
  const cleanContent = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;

  // Regex to match leading frontmatter delimiter
  const frontmatterRegex = /^---\s*(?:\r?\n)([\s\S]*?)(?:\r?\n)---\s*(?:\r?\n|$)/;
  const match = cleanContent.match(frontmatterRegex);

  if (!match) {
    // No frontmatter found
    const defaultData = schema ? schema.parse({}) : ({} as Output);
    return {
      frontmatter: defaultData,
      body: cleanContent,
      rawFrontmatter: '',
    };
  }

  const rawYaml = match[1];
  const body = cleanContent.slice(match[0].length);

  // If empty frontmatter
  if (!rawYaml.trim()) {
    const defaultData = schema ? schema.parse({}) : ({} as Output);
    return {
      frontmatter: defaultData,
      body,
      rawFrontmatter: rawYaml,
    };
  }

  const parsed = parseYamlOrThrow<Output>(rawYaml, schema);
  return {
    frontmatter: parsed,
    body,
    rawFrontmatter: rawYaml,
  };
}
