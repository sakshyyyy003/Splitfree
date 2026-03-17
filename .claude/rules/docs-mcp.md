# Documentation MCP Server Rules

## MANDATORY: Use bob-the-builder-docs-mcp for Library APIs

A local Docs MCP Server (`bob-the-builder-docs-mcp`) is running with indexed, up-to-date documentation for this project's dependencies. **You MUST use it instead of relying on training data** for any library-specific code.

### When to Use

If a task involves a specific framework, library, or API — either explicitly or implicitly — use the bob-the-builder-docs-mcp tools to fetch the latest documentation instead of relying on training data. This applies to:

- Writing or modifying code that uses any project dependency
- Answering questions about library APIs, configuration, or patterns
- Debugging issues that may stem from API changes or deprecations
- Suggesting library usage patterns or best practices

### How to Use

1. Search for the relevant library documentation using the bob-the-builder-docs-mcp tools
2. Use the returned documentation to inform your code — not your training data
3. If the bob-the-builder-docs-mcp is unavailable, explicitly warn: "Docs MCP server is not available — this code may use outdated APIs"

### Why This Exists

LLM training data contains deprecated and outdated API patterns. Libraries evolve faster than models are trained. The bob-the-builder-docs-mcp provides real-time, version-specific documentation indexed from official sources.

**Do NOT guess APIs from memory. Always verify against indexed documentation.**
