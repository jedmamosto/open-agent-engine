import { describe, it, expect } from 'vitest';
import { parseYaml, parseYamlOrThrow, parseFrontmatter } from '../parser/yaml.js';
import { PersonaSchema } from '../schema/persona.js';

describe('YAML Parser & Diagnostics', () => {
  it('should parse valid YAML text without schema', () => {
    const raw = `
id: test-persona
name: Test Persona
system_prompt: Hello world
`;
    const res = parseYaml<{ id: string; name: string }>(raw);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.id).toBe('test-persona');
      expect(res.data.name).toBe('Test Persona');
    }
  });

  it('should parse and validate YAML with Zod schema', () => {
    const raw = `
id: qa-architect
name: QA Architect
system_prompt: System prompt text
permissions:
  tools:
    read_files: true
  mcp_servers:
    - playwright
`;
    const res = parseYaml(raw, PersonaSchema);
    expect(res.success).toBe(true);
    if (res.success && res.data.permissions?.tools) {
      expect(res.data.id).toBe('qa-architect');
      expect(res.data.permissions.tools['read_files']).toBe(true);
    }
  });

  it('should provide line/column and snippet diagnostics on YAML syntax error', () => {
    const invalidYaml = `
id: test
  bad_indent: 123
`;
    const res = parseYaml(invalidYaml);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.message).toBeTruthy();
      expect(res.error.line).toBeDefined();
    }
  });

  it('should provide schema validation errors when parsing invalid schema data', () => {
    const invalidData = `
id: "invalid id with spaces"
name: Valid Name
system_prompt: Valid Prompt
`;
    const res = parseYaml(invalidData, PersonaSchema);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.message).toContain('Schema validation failed');
    }
  });

  it('should throw YamlParseError on parseYamlOrThrow', () => {
    expect(() => parseYamlOrThrow('invalid: yaml: : error')).toThrow();
  });
});

describe('Frontmatter Parser', () => {
  it('should parse standard frontmatter with markdown body', () => {
    const content = `---
name: subagent-coordinator
description: Multi-agent coordination skill
version: 1.0.0
---
# Coordinator Guide

Here is the body content.
`;
    const res = parseFrontmatter<{ name: string; description: string; version: string }>(content);
    expect(res.frontmatter.name).toBe('subagent-coordinator');
    expect(res.frontmatter.version).toBe('1.0.0');
    expect(res.body).toContain('# Coordinator Guide');
  });

  it('should handle CRLF line endings in frontmatter', () => {
    const content = '---\r\nname: crlf-skill\r\ndescription: Handles CRLF\r\n---\r\n\r\n# Title\r\nCRLF body';
    const res = parseFrontmatter<{ name: string }>(content);
    expect(res.frontmatter.name).toBe('crlf-skill');
    expect(res.body).toContain('CRLF body');
  });

  it('should handle empty frontmatter', () => {
    const content = `---
---
# Just markdown
No frontmatter data here.
`;
    const res = parseFrontmatter(content);
    expect(res.frontmatter).toEqual({});
    expect(res.body).toContain('# Just markdown');
  });

  it('should return empty frontmatter when no delimiters are present', () => {
    const content = '# Pure Markdown\n\nNo frontmatter delimiters at all.';
    const res = parseFrontmatter(content);
    expect(res.frontmatter).toEqual({});
    expect(res.body).toBe(content);
  });

  it('should handle markdown bodies with fenced code blocks containing triple dashes', () => {
    const content = `---
name: sample-skill
description: Skill with nested dashes in body
---
# Body Title

Here is a code block:

\`\`\`markdown
---
nested: frontmatter
---
\`\`\`

Ending text.
`;
    const res = parseFrontmatter<{ name: string }>(content);
    expect(res.frontmatter.name).toBe('sample-skill');
    expect(res.body).toContain('```markdown');
    expect(res.body).toContain('nested: frontmatter');
  });

  it('should handle UTF-8 BOM at the start of the file', () => {
    const content = '\uFEFF---\nname: bom-skill\n---\nBody';
    const res = parseFrontmatter<{ name: string }>(content);
    expect(res.frontmatter.name).toBe('bom-skill');
    expect(res.body.trim()).toBe('Body');
  });
});
