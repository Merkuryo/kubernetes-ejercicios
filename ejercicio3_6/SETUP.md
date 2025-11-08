# GitHub Actions Setup Instructions

## ⚠️ Important: Manual Configuration Required

The GitHub Actions workflow is now in place, but **manual setup is required** to activate it. Follow these steps:

## Step 1: Create Google Artifact Repository

In Google Cloud Console:

```bash
gcloud artifacts repositories create docker-repo \
  --repository-format=docker \
  --location=europe-north1 \
  --project=dwk-gke-477617
```

Or through Google Cloud Console:
1. Go to Artifact Registry
2. Click "Create Repository"
3. Name: `docker-repo`
4. Format: `Docker`
5. Location: `europe-north1`

## Step 2: Locate Your Service Account JSON Key

The JSON key was generated at: `~/github-actions-key.json`

**IMPORTANT**: This file contains sensitive credentials. 

### Verify file contents:

```bash
cat ~/github-actions-key.json | head -5
# Should see:
# {
#   "type": "service_account",
#   "project_id": "dwk-gke-477617",
#   ...
```

## Step 3: Add GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

### Secret 1: GKE_PROJECT

- **Name**: `GKE_PROJECT`
- **Value**: `dwk-gke-477617`
- Click "Add secret"

### Secret 2: GKE_SA_KEY

- **Name**: `GKE_SA_KEY`
- **Value**: Copy the entire contents of `~/github-actions-key.json`
  
```bash
# Copy entire file contents
cat ~/github-actions-key.json | pbcopy  # macOS
# or
cat ~/github-actions-key.json | xclip -selection clipboard  # Linux
# or manually open and copy from editor
```

- Paste into the GitHub secret value field
- Click "Add secret"

### Verification

After adding secrets, you should see:

```
GKE_PROJECT    ••••••••••••
GKE_SA_KEY     ••••••••••••
```

## Step 4: Trigger the Workflow

The workflow will trigger automatically on:
- Push to `main` branch
- Changes to `ejercicio3_5/**` directory
- Changes to `.github/workflows/main.yaml`

To manually trigger, make a test change:

```bash
# Small edit to trigger workflow
echo "# Test trigger" >> ejercicio3_5/README.txt
git add ejercicio3_5/README.txt
git commit -m "test: Trigger GitHub Actions workflow"
git push origin main
```

## Step 5: Monitor Workflow Execution

1. Go to GitHub repository → **Actions** tab
2. You should see a running workflow: "Release application"
3. Click on the workflow run to see details
4. Green checkmark = success, Red X = failure

### Expected Workflow Steps

1. ✅ Checkout
2. ✅ Authenticate to Google Cloud
3. ✅ Set up Cloud SDK
4. ✅ Use gcloud CLI
5. ✅ Configure Docker for Artifact Registry
6. ✅ Get GKE credentials
7. ✅ Form the image name
8. ✅ Build Docker image
9. ✅ Publish image to Artifact Registry
10. ✅ Set up Kustomize
11. ✅ Deploy to GKE

## Troubleshooting

### Workflow doesn't trigger

**Check 1**: Verify secrets are added
- Go to Repository Settings → Secrets
- Both `GKE_PROJECT` and `GKE_SA_KEY` should be present

**Check 2**: Verify you pushed to main branch
```bash
git branch  # Should show * main
git log --oneline -1  # Latest commit should be on origin/main
```

**Check 3**: Verify workflow file syntax
```bash
# Check if yaml is valid
cat .github/workflows/main.yaml | head -20
```

### "Authenticate to Google Cloud" fails

**Cause**: Invalid `GKE_SA_KEY` secret

**Solution**:
1. Verify JSON file is valid:
   ```bash
   cat ~/github-actions-key.json | python -m json.tool > /dev/null && echo "Valid JSON"
   ```

2. Re-add secret to GitHub:
   - Copy entire file contents again
   - Update the secret in GitHub

### "docker push" fails

**Cause**: Service account doesn't have permission or registry doesn't exist

**Solution**:
1. Verify repository exists:
   ```bash
   gcloud artifacts repositories list --location=europe-north1 --project=dwk-gke-477617
   ```

2. Verify service account has roles:
   ```bash
   gcloud projects get-iam-policy dwk-gke-477617 \
     --flatten="bindings[].members" \
     --format='table(bindings.role)' \
     --filter="bindings.members:github-actions@dwk-gke-477617.iam.gserviceaccount.com"
   ```

### Deployment fails

**Check**: GKE cluster is running
```bash
gcloud container clusters list --zone europe-north1-b --project dwk-gke-477617
```

**Check**: Sufficient resources available
```bash
kubectl describe nodes | grep -E "(Name|Allocatable|Allocated)"
```

## Monitoring Deployments

After workflow succeeds, check the new deployment:

```bash
# Check latest image
kubectl describe deployment dwk-environments | grep Image

# Check pod status
kubectl get pods -l app=dwk-environments

# View service IP
kubectl get service dwk-environments-svc
```

## Security Reminders

✅ **DO**:
- Keep JSON key secret (never commit to git)
- Rotate keys regularly
- Use GitHub Secrets for all credentials
- Monitor workflow logs for errors

❌ **DON'T**:
- Paste JSON into chat/email
- Commit JSON to git
- Share GitHub secrets
- Store credentials in code

## Cleanup

### Remove old images from Artifact Registry

```bash
# List images
gcloud artifacts docker images list \
  --location=europe-north1 \
  --repository=docker-repo \
  --project=dwk-gke-477617

# Delete specific image
gcloud artifacts docker images delete \
  europe-north1-docker.pkg.dev/dwk-gke-477617/docker-repo/dwk-environments:main-abc123
```

### Disable workflow (if needed)

```bash
# Rename or disable workflow
mv .github/workflows/main.yaml .github/workflows/main.yaml.disabled
```

## Next Steps

Once the workflow is working:
1. ✅ Make a code change to `ejercicio3_5/`
2. ✅ Push to GitHub
3. ✅ Watch GitHub Actions build and deploy automatically
4. ✅ Verify new pod running with updated image
5. ✅ Celebrate continuous deployment! 🎉

## References

- [GitHub Actions Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Google Cloud Artifact Registry](https://cloud.google.com/artifact-registry)
- [GCP Service Accounts](https://cloud.google.com/iam/docs/service-accounts)
