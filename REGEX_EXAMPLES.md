# GitTLDR Search Examples

## Search Modes

GitTLDR supports three search modes:

### 1. Normal Mode (Default)
- Uses case-insensitive substring matching
- Example: `docker` matches `Dockerfile`, `docker-compose.yml`, `my-docker-setup.sh`

### 2. Exact Mode
- Requires exact case-insensitive match of the entire filename
- Example: `dockerfile` matches only `Dockerfile` (case-insensitive)
- Example: `package.json` matches only `package.json`

### 3. Regex Mode
- Uses JavaScript regular expressions for pattern matching
- Case sensitivity can be toggled independently

## Regex Examples for Common Use Cases

### Finding Dockerfiles
```regex
^[Dd]ockerfile
```
- Matches: `Dockerfile`, `dockerfile`, `Dockerfile.dev`, `Dockerfile.prod`
- Explanation: `^` = start of string, `[Dd]` = D or d, `ockerfile` = literal text

### Finding Docker-related files
```regex
[Dd]ocker
```
- Matches: `Dockerfile`, `docker-compose.yml`, `setup-docker.sh`, `my-docker-config.json`

### Finding specific file extensions
```regex
\.(js|ts|jsx|tsx)$
```
- Matches: `.js`, `.ts`, `.jsx`, `.tsx` files
- Explanation: `\.` = literal dot, `(js|ts|jsx|tsx)` = any of these extensions, `$` = end of string

### Finding configuration files
```regex
\.(json|yaml|yml|toml|ini|conf)$
```
- Matches: configuration files with common extensions

### Finding test files
```regex
\.(test|spec)\.(js|ts|jsx|tsx)$
```
- Matches: `component.test.js`, `utils.spec.ts`, etc.

### Finding files with specific patterns in names
```regex
^(index|main|app)\.(js|ts|jsx|tsx)$
```
- Matches: entry point files like `index.js`, `main.ts`, `app.jsx`

### Finding files by size pattern (when searching summaries)
```regex
(large|big|huge|massive)
```
- When "Search in summaries" is enabled, finds files with size-related descriptions

### Case-sensitive examples
With case-sensitive enabled:
```regex
^README\.md$
```
- Matches only `README.md` (exact case)

```regex
[A-Z][a-z]+\.js$
```
- Matches JavaScript files that start with a capital letter: `Component.js`, `Utils.js`

### Advanced patterns
```regex
^(?!test).*\.(js|ts)$
```
- Matches `.js` and `.ts` files that don't start with "test"
- Uses negative lookahead `(?!test)`

```regex
\/(src|lib|components)\/.*\.(js|ts|jsx|tsx)$
```
- Matches source files in specific directories

## Tips for Using Regex Mode

1. **Test your patterns**: Start simple and build complexity gradually
2. **Use anchors**: `^` for start, `$` for end of string when you need exact boundaries
3. **Escape special characters**: Use `\.` for literal dots, `\(` for literal parentheses
4. **Use character classes**: `[a-z]`, `[A-Z]`, `[0-9]`, `[a-zA-Z0-9]`
5. **Quantifiers**: `*` (zero or more), `+` (one or more), `?` (zero or one), `{n,m}` (between n and m)

## Search Scope Options

- **Filename only** (default): Searches only in file names
- **Filename + Summaries**: When "Search in summaries" is enabled, also searches in file content summaries

## Examples by File Type

### Python files
```regex
\.py$
```

### Web files
```regex
\.(html|css|scss|sass|less)$
```

### Image files
```regex
\.(jpg|jpeg|png|gif|svg|webp)$
```

### Documentation files
```regex
\.(md|rst|txt|doc|docx)$
```

### Build/Config files
```regex
^(webpack|rollup|vite|tsconfig|jsconfig|babel|eslint|prettier)\.(config\.)?(js|json|ts)$
```
