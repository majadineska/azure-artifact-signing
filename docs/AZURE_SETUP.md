# Azure Artifact Signing — Setup Guide

Complete step-by-step guide to configure Azure Artifact Signing for this demo.

---

## Prerequisites

- Azure subscription with **Owner** or **Contributor + User Access Administrator** role
- GitHub repository (this repo pushed to GitHub)
- Azure CLI installed (`az --version` ≥ 2.60)

---

## Step 1: Register the Resource Provider

```bash
az provider register --namespace Microsoft.CodeSigning
az provider show --namespace Microsoft.CodeSigning --query "registrationState"
# Wait until output shows "Registered"
```

## Step 2: Create an Artifact Signing Account

```bash
RESOURCE_GROUP="rg-artifact-signing-demo"
LOCATION="eastus"    # Also available: westus, westeurope, northeurope
ACCOUNT_NAME="signing-demo-account"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create the Artifact Signing account
az resource create \
  --resource-group $RESOURCE_GROUP \
  --resource-type "Microsoft.CodeSigning/codeSigningAccounts" \
  --name $ACCOUNT_NAME \
  --location $LOCATION \
  --properties '{
    "sku": { "name": "Basic" }
  }'
```

> **Note**: The endpoint URL will be `https://<location>.codesigning.azure.net`. For East US:
> `https://eus.codesigning.azure.net`

## Step 3: Complete Identity Validation

1. Navigate to **Azure Portal** → your Artifact Signing account → **Identity validation**
2. Click **+ New identity validation request**
3. Select **Public Trust** (for signing apps distributed to end users)
4. Fill in organization details:
   - Legal business name (must match official records)
   - Business website
   - Business address
   - Primary/secondary email contacts
5. Submit the request
6. **Wait for approval** — typically 1–7 business days. You will receive email updates.

> **Important**: Identity validation requires a verified legal business entity. For demo/testing,
> you can use **Private Trust** which is instant but the certificate will NOT be trusted on
> end-user machines.

## Step 4: Create a Certificate Profile

After identity validation is approved:

```bash
PROFILE_NAME="electron-app-signing"

az resource create \
  --resource-group $RESOURCE_GROUP \
  --resource-type "Microsoft.CodeSigning/codeSigningAccounts/certificateProfiles" \
  --name "$ACCOUNT_NAME/$PROFILE_NAME" \
  --properties '{
    "profileType": "PublicTrust",
    "includeStreetAddress": false,
    "includePostalCode": false,
    "identityValidationId": "<IDENTITY_VALIDATION_ID>"
  }'
```

> Replace `<IDENTITY_VALIDATION_ID>` with the ID from Step 3. Find it in the portal under
> Identity validation → your approved request → Properties → ID.

## Step 5: Assign RBAC Roles

The GitHub Actions service principal needs two roles:

```bash
# Get the Artifact Signing account resource ID
ACCOUNT_ID=$(az resource show \
  --resource-group $RESOURCE_GROUP \
  --resource-type "Microsoft.CodeSigning/codeSigningAccounts" \
  --name $ACCOUNT_NAME \
  --query id -o tsv)

# Role 1: Trusted Signing Certificate Profile Signer
# Allows the principal to sign using the certificate profile
az role assignment create \
  --assignee "<SERVICE_PRINCIPAL_CLIENT_ID>" \
  --role "Trusted Signing Certificate Profile Signer" \
  --scope $ACCOUNT_ID

# Role 2: Trusted Signing Identity Verifier (optional, for managing profiles)
az role assignment create \
  --assignee "<SERVICE_PRINCIPAL_CLIENT_ID>" \
  --role "Trusted Signing Identity Verifier" \
  --scope $ACCOUNT_ID
```

## Step 6: Create Entra ID App Registration with GitHub OIDC

### 6a. Create the App Registration

```bash
APP_NAME="github-artifact-signing-demo"

# Create the app
az ad app create --display-name $APP_NAME
APP_CLIENT_ID=$(az ad app list --display-name $APP_NAME --query "[0].appId" -o tsv)

# Create a service principal
az ad sp create --id $APP_CLIENT_ID
```

### 6b. Add Federated Credential for GitHub Actions

```bash
GITHUB_ORG="<YOUR_GITHUB_ORG>"
GITHUB_REPO="<YOUR_GITHUB_REPO>"

az ad app federated-credential create --id $APP_CLIENT_ID --parameters '{
  "name": "github-actions-main",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:'"$GITHUB_ORG/$GITHUB_REPO"':ref:refs/heads/main",
  "description": "GitHub Actions OIDC for main branch",
  "audiences": ["api://AzureADTokenExchange"]
}'
```

> **For workflow_dispatch**, add a second credential:
> ```bash
> az ad app federated-credential create --id $APP_CLIENT_ID --parameters '{
>   "name": "github-actions-dispatch",
>   "issuer": "https://token.actions.githubusercontent.com",
>   "subject": "repo:'"$GITHUB_ORG/$GITHUB_REPO"':environment:production",
>   "description": "GitHub Actions OIDC for workflow_dispatch",
>   "audiences": ["api://AzureADTokenExchange"]
> }'
> ```

### 6c. Assign RBAC Roles (from Step 5)

Use the `$APP_CLIENT_ID` from above as the `--assignee` in the role assignment commands.

## Step 7: Configure GitHub Repository Secrets

Go to **GitHub** → your repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Secret Name | Value | Example |
|---|---|---|
| `AZURE_CLIENT_ID` | App registration client ID | `12345678-abcd-...` |
| `AZURE_TENANT_ID` | Azure AD tenant ID | `87654321-dcba-...` |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID | `aaaabbbb-cccc-...` |
| `AZURE_SIGNING_ENDPOINT` | Artifact Signing endpoint URL | `https://eus.codesigning.azure.net` |
| `AZURE_SIGNING_ACCOUNT` | Artifact Signing account name | `signing-demo-account` |
| `AZURE_CERTIFICATE_PROFILE` | Certificate profile name | `electron-app-signing` |

### Finding Your Endpoint URL

The endpoint follows this pattern based on your account's region:

| Region | Endpoint |
|---|---|
| East US | `https://eus.codesigning.azure.net` |
| West US | `https://wus.codesigning.azure.net` |
| West Central US | `https://wcus.codesigning.azure.net` |
| West Europe | `https://weu.codesigning.azure.net` |
| North Europe | `https://neu.codesigning.azure.net` |

## Step 8: Test the Pipeline

```bash
git add .
git commit -m "feat: add Electron app with Azure Artifact Signing pipeline"
git push origin main
```

Navigate to **Actions** tab in GitHub to watch the pipeline. On success, the signed `.exe` will
be available as a downloadable artifact.

---

## Troubleshooting

### "Caller is not authorized"
- Ensure the service principal has the **Trusted Signing Certificate Profile Signer** role
- Verify the role is assigned at the **Artifact Signing account** scope (not just the resource group)

### "Certificate profile not found"
- Check the `AZURE_CERTIFICATE_PROFILE` secret matches exactly
- Ensure identity validation is **approved** and the profile is in **Active** status

### OIDC token errors
- Verify the federated credential `subject` claim matches your branch/environment
- Confirm `permissions: id-token: write` is in the workflow
- Check that the `audiences` value is `["api://AzureADTokenExchange"]`

### Build fails on electron-builder
- Ensure `node_modules` is not committed (check `.gitignore`)
- The workflow runs on `windows-latest` which is required for building Windows targets

---

## Useful Links

- [Azure Artifact Signing Quickstart](https://learn.microsoft.com/azure/trusted-signing/quickstart)
- [Trusted Signing Action on GitHub](https://github.com/Azure/trusted-signing-action)
- [GitHub OIDC with Azure](https://docs.github.com/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-azure)
- [Signing Integrations](https://learn.microsoft.com/azure/trusted-signing/how-to-signing-integrations)
