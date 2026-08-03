# SpecDrift 🛡️🔍

> **AST-Driven API Leakage & Drift Analysis Engine**

SpecDrift is an offensive and defensive security analysis tool designed to uncover hidden, undocumented (**SHADOW**), and deprecated (**ZOMBIE**) API endpoints directly from client-side JavaScript source code. Unlike traditional regex-based scrapers, SpecDrift utilizes abstract syntax tree (AST) traversal via Babel to trace variable bindings, resolve minified dynamic parameters, and compare extracted routes against official OpenAPI/Swagger specifications.

---

## ✨ Features

- **🌳 AST-Based Extraction**: Uses `@babel/parser` and `@babel/traverse` to analyze JavaScript/TypeScript source code without relying on fragile regular expressions.
- **🌐 Dual-Mode Ingestion**:
  - **Local Mode**: Recursively scans build artifacts, bundle folders, or source code directories.
  - **Remote Mode**: Scrapes web applications, extracts `<script>` tags, and fetches live assets into memory.
- **🕵️ Scope & Variable Tracing**: Traces lexical variable assignments across scopes to resolve endpoints constructed dynamically or via minified identifiers.
- **⚡ OpenAPI / Swagger Delta Engine**: Parses OpenAPI 2.0, 3.0, and 3.1 specifications to classify routes into three statuses:
  - 🟢 **DOCUMENTED**: Endpoint matches official spec and is active.
  - 🔴 **SHADOW**: Endpoint exists in JS code but is missing from official documentation (Security Threat!).
  - 🟡 **ZOMBIE**: Endpoint exists in JS code but is marked as `deprecated` in the spec.
- **📊 Interactive CLI & Export**: Renders colored terminal reports with `cli-table3` and exports findings to JSON or Markdown formats.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: `v18.0.0` or higher
- **npm** or **pnpm**

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/your-username/specdrift.git
cd specdrift
npm install
npm run build
```

Link the executable globally (optional):

```bash
npm link
```

---

## 💻 Usage

### 1. Scan a Local Build Directory

Scan a local frontend output folder (e.g., `./dist` or `./build`) against a Swagger specification:

```bash
specdrift -d ./dist -s ./swagger.json
```

### 2. Crawl a Live Web Application

Fetch client-side JavaScript assets directly from a target URL:

```bash
specdrift -u https://example.com -s ./swagger.json
```

### 3. Save Analysis Reports

Export findings to a Markdown or JSON report:

```bash
specdrift -d ./dist -s ./swagger.json -o ./reports/drift-report.md -f markdown
```

### 4. Recon / No-Spec Mode

Scan code without a Swagger spec to quickly list all exposed API calls:

```bash
specdrift -d ./src
```

---

## 🎛️ CLI Options

| Flag | Short | Description | Example |
| :--- | :--- | :--- | :--- |
| `--url` | `-u` | Target remote web application URL | `-u https://target.com` |
| `--dir` | `-d` | Path to local directory containing JS files | `-d ./dist` |
| `--spec` | `-s` | Path to OpenAPI/Swagger spec file (JSON/YAML) | `-s ./swagger.json` |
| `--output` | `-o` | Output file path for exporting results | `-o report.json` |
| `--format` | `-f` | Output export format (`json` or `markdown`) | `-f markdown` |

---

## 🏗️ Architecture Overview

```
                          ┌──────────────────────────┐
                          │  Target Ingestion        │
                          │  (Local Dir / Remote URL)│
                          └─────────────┬────────────┘
                                        │
                                        ▼
                          ┌──────────────────────────┐
                          │  Babel AST Parser        │
                          │  (@babel/parser)         │
                          └─────────────┬────────────┘
                                        │
                                        ▼
                          ┌──────────────────────────┐
                          │  Scope & Call Visitor    │
                          │  (@babel/traverse)       │
                          └─────────────┬────────────┘
                                        │
                                        ▼
                          ┌──────────────────────────┐
                          │  Delta Matcher           │
                          │  (Swagger Comparison)    │
                          └─────────────┬────────────┘
                                        │
                                        ▼
                          ┌──────────────────────────┐
                          │  CLI Table / File Report │
                          └──────────────────────────┘
```

---

## 📁 Project Structure

```
specdrift/
├── src/
│   ├── cli/
│   │   ├── commands.ts      # Orchestration logic
│   │   └── index.ts         # Commander CLI entrypoint
│   ├── core/
│   │   ├── ast/             # AST Parsing & Scope resolution
│   │   ├── crawler/         # Local file scanner & Remote asset scraper
│   │   └── delta/           # Swagger parsing & Endpoint drift analyzer
│   ├── types/
│   │   └── endpoint.d.ts    # Global type definitions
│   └── utils/
│       ├── logger.ts        # Contextual terminal logger
│       └── reporter.ts      # CLI Table renderer & File exporter
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🧪 Development & Testing

Run unit and integration tests via Vitest:

```bash
npm test
```

Run in development mode using `tsx`:

```bash
npx tsx src/cli/index.ts -d ./test-sample -s ./swagger.json
```

---

## 📄 License

MIT © [SpecDrift Contributors]
