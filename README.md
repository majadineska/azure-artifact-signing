# Azure Artifact Signing Demo — Electron + GitHub Actions

End-to-end demo showing how to sign a Windows Electron application using **Azure Artifact Signing** (formerly Azure Trusted Signing) in a GitHub Actions CI/CD pipeline.

## What This Demonstrates

- Building a Windows Electron installer (`.exe`) with `electron-builder`
- Signing the installer using `azure/trusted-signing-action` in GitHub Actions
- OIDC federated authentication (no secrets to rotate)
- Automated signature verification with PowerShell
- Artifact upload for distribution

## Architecture

```
  git push main
       │
       ▼
  ┌──────────────────────────────┐
  │     GitHub Actions            │
  │     (windows-latest)          │
  │                               │
  │  checkout ─► npm ci           │
  │      │                        │
  │      ▼                        │
  │  electron-builder ──► .exe    │
  │      │           (unsigned)   │
  │      ▼                        │
  │  azure/login (OIDC) ──────┐  │
  │      │                     │  │
  │      ▼                     │  │
  │  trusted-signing-action    │  │
  │      │    ┌────────────────┘  │
  │      │    │  Azure Artifact   │
  │      │    │  Signing Service  │
  │      │    │  (Managed HSM)    │
  │      │    └───────────────┐   │
  │      ▼                    │   │
  │  .exe (signed ✅) ◄──────┘   │
  │      │                        │
  │      ▼                        │
  │  upload-artifact              │
  └──────────────────────────────┘
```

## Project Structure

```
├── .github/workflows/
│   └── build-and-sign.yml     # GitHub Actions pipeline
├── .vscode/
│   └── mcp.json               # Microsoft Learn MCP server config
├── docs/
│   ├── AZURE_SETUP.md         # Step-by-step Azure resource setup
│   └── DEMO_GUIDE.md          # Customer presentation script
├── src/
│   ├── main.js                # Electron main process
│   ├── preload.js             # Electron preload script
│   └── index.html             # Electron renderer
├── package.json               # Electron + electron-builder config
└── README.md                  # This file
```

## Quick Start

### 1. Local Development

```bash
npm install
npm start          # Launch the Electron app locally
```

### 2. Azure Setup

Follow the complete guide in [`docs/AZURE_SETUP.md`](docs/AZURE_SETUP.md):

1. Register `Microsoft.CodeSigning` resource provider
2. Create an Artifact Signing account
3. Complete identity validation (Public or Private Trust)
4. Create a certificate profile
5. Assign RBAC roles to your service principal
6. Create Entra ID app with GitHub OIDC federated credential
7. Configure GitHub repository secrets

### 3. Run the Pipeline

Push to `main` or trigger manually via the Actions tab. The pipeline will:

1. Build the unsigned Electron installer
2. Authenticate to Azure via OIDC
3. Sign the `.exe` with Azure Artifact Signing
4. Verify the digital signature
5. Upload the signed artifact

### 4. Verify

Download the artifact, right-click the `.exe` → **Properties** → **Digital Signatures** tab.

## GitHub Secrets Required

| Secret | Description |
|---|---|
| `AZURE_CLIENT_ID` | Entra ID app registration client ID |
| `AZURE_TENANT_ID` | Azure AD tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID |
| `AZURE_SIGNING_ENDPOINT` | e.g. `https://eus.codesigning.azure.net` |
| `AZURE_SIGNING_ACCOUNT` | Artifact Signing account name |
| `AZURE_CERTIFICATE_PROFILE` | Certificate profile name |

## MCP Server

This project includes a pre-configured [Microsoft Learn MCP server](https://github.com/MicrosoftDocs/mcp) in `.vscode/mcp.json`. Open this project in VS Code and use Copilot Chat to search Azure documentation live:

- **`microsoft_docs_search`** — search Microsoft Learn articles
- **`microsoft_docs_fetch`** — fetch full article content
- **`microsoft_code_sample_search`** — find code samples

Example: *"Search docs for Azure Artifact Signing certificate profile configuration"*

## Key Resources

| Resource | Link |
|---|---|
| Azure Artifact Signing Overview | [learn.microsoft.com](https://learn.microsoft.com/azure/trusted-signing/overview) |
| Quickstart | [learn.microsoft.com](https://learn.microsoft.com/azure/trusted-signing/quickstart) |
| Signing Integrations | [learn.microsoft.com](https://learn.microsoft.com/azure/trusted-signing/how-to-signing-integrations) |
| Trusted Signing GitHub Action | [github.com/Azure/trusted-signing-action](https://github.com/Azure/trusted-signing-action) |
| GitHub OIDC for Azure | [docs.github.com](https://docs.github.com/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-azure) |
| Microsoft Learn MCP Server | [github.com/MicrosoftDocs/mcp](https://github.com/MicrosoftDocs/mcp) |
