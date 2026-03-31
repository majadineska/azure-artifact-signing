# Demo Presentation Guide

Customer-facing presentation flow for Azure Artifact Signing with Electron.

---

## Demo Overview

| Item | Detail |
|---|---|
| **Duration** | 20–30 minutes |
| **Audience** | Development leads, DevOps engineers, security engineers |
| **Goal** | Show how Azure Artifact Signing replaces traditional EV code signing certificates with a cloud-managed, CI/CD-native solution |

---

## Presentation Flow

### 1. Problem Statement (3 min)

**Key talking points:**

- Traditional code signing with EV certificates requires **hardware security modules (HSMs)** or USB tokens
- HSMs create bottlenecks — only one person/machine can sign at a time
- Certificate renewal is manual, expensive ($200–$500/year), and error-prone
- Hardware tokens don't work in CI/CD pipelines (GitHub Actions, Azure DevOps)
- SmartScreen reputation is tied to individual certificates — rotating certs resets reputation

> **Demo tip**: Show a screenshot of a Windows SmartScreen warning for an unsigned app to emphasize the UX impact.

---

### 2. Introduce Azure Artifact Signing (3 min)

**Key talking points:**

- Fully managed code signing service — no HSMs, no hardware tokens
- Certificates issued and managed by Microsoft's PKI (Public CA)
- Certificates are **short-lived** (72 hours) and auto-rotated — no renewal burden
- SmartScreen reputation follows your **identity**, not individual certificates
- Native integration with GitHub Actions, Azure DevOps, and SignTool
- OIDC authentication — no secrets to manage or rotate
- Supports: PE files (.exe, .dll), MSIX, NuGet, and more

**Pricing**: ~$9.99/month for a Basic SKU (unlimited signatures)

---

### 3. Architecture Walkthrough (5 min)

Draw or show this flow:

```
Developer pushes code
        │
        ▼
┌─────────────────────┐
│  GitHub Actions      │
│  (windows-latest)    │
│                      │
│  1. npm ci           │
│  2. electron-builder │──▶ Unsigned .exe
│  3. azure/login      │
│  4. trusted-signing  │──▶ Signed .exe ✅
│     -action          │
│  5. upload-artifact  │
└─────────────────────┘
        │
        ▼
  Signed .exe artifact
  (downloadable from GitHub)
```

**Walk through each step of `.github/workflows/build-and-sign.yml`**:
- Show the OIDC permissions block
- Highlight that the Electron build produces an unsigned `.exe`
- Show the `azure/trusted-signing-action` step with its configuration
- Show the signature verification step (PowerShell `Get-AuthenticodeSignature`)

---

### 4. Azure Portal Tour (5 min)

Open Azure Portal and show:

1. **Artifact Signing Account** — the top-level resource
2. **Identity Validation** — show the approved validation (Public Trust)
3. **Certificate Profile** — show the active profile, note that certs are auto-rotated
4. **Activity Log** — show signing operations (optional)
5. **RBAC** — show the service principal with the Signer role

---

### 5. Live Demo — Trigger the Pipeline (10 min)

#### Option A: Push-triggered
```bash
# Make a small change
echo "// build $(date)" >> src/main.js
git add . && git commit -m "demo: trigger build"
git push origin main
```

#### Option B: Manual trigger
- Go to **Actions** tab → **Build and Sign Electron App** → **Run workflow**

**While the pipeline runs, narrate each step**:
1. "Here it's checking out the code..."
2. "Now installing Node.js dependencies..."
3. "electron-builder is creating the unsigned Windows installer..."
4. "Authenticating to Azure using OIDC — no secrets stored, just a federated token..."
5. "**This is the key step** — the trusted-signing-action is sending the .exe to Azure Artifact Signing. The file hash is sent to Azure, signed with our certificate, and the signature is embedded back into the .exe."
6. "Now we're verifying the signature with PowerShell's Get-AuthenticodeSignature..."
7. "Done! The signed installer is uploaded as an artifact."

#### Verify the Signature
1. Download the artifact from the Actions run
2. Right-click the `.exe` → **Properties** → **Digital Signatures** tab
3. Show:
   - **Signer**: Your organization name
   - **Timestamp**: RFC 3161 compliant timestamp
   - **Certificate chain**: Microsoft Identity Verification Root CA → Microsoft ID Verified CS EOC CA → Your cert

---

### 6. Live MCP Demo (Optional, 2 min)

If presenting in VS Code with this project open:

1. Open the Copilot Chat panel
2. The Microsoft Learn MCP server is pre-configured in `.vscode/mcp.json`
3. Ask: *"Search Microsoft Learn for Azure Artifact Signing certificate profiles"*
4. Show how the docs are fetched live — useful for the customer's team during onboarding

---

### 7. Q&A and Next Steps (5 min)

**Common questions:**

| Question | Answer |
|---|---|
| What file types can be signed? | PE (.exe, .dll, .sys), MSIX, App-X, NuGet, VBS, PowerShell |
| What about macOS signing? | Azure Artifact Signing is Windows-only. macOS uses Apple's notarization service |
| Is Private Trust available? | Yes — for internal-only distribution, no identity validation needed |
| Can we use Azure DevOps instead? | Yes — there's a native Azure DevOps task and SignTool integration |
| What about existing EV certificates? | You can migrate gradually — sign with both during transition |
| FIPS compliance? | Keys are stored in Azure Managed HSM (FIPS 140-2 Level 3) |

**Next steps for the customer:**
1. ☐ Register for Azure Artifact Signing (Basic SKU)
2. ☐ Submit identity validation request (Public Trust)
3. ☐ Set up Entra ID app registration with OIDC federation
4. ☐ Integrate into their existing CI/CD pipeline
5. ☐ Test with a Private Trust profile while waiting for Public Trust approval

---

## Pre-Demo Checklist

- [ ] Azure Artifact Signing account created and identity validation approved
- [ ] Certificate profile in Active state
- [ ] GitHub secrets configured (all 6)
- [ ] Pipeline has run at least once successfully
- [ ] Signed `.exe` downloaded and signature verified
- [ ] Azure Portal bookmarked to the Artifact Signing account
- [ ] VS Code open with this project and MCP server connected
