# Exercise 3.6: The project, step 15 - GitHub Actions CI/CD

## Overview

This exercise implements **continuous deployment (CD)** using GitHub Actions. The workflow automatically:
1. Builds Docker images on every push
2. Publishes images to Google Artifact Registry
3. Deploys the new image to GKE cluster

This enables true CI/CD - changes pushed to GitHub automatically flow through building, testing, and deployment.

## Architecture

```
Developer Push
     ↓
GitHub Repository
     ↓
GitHub Actions Workflow Triggered
     ↓
┌─────────────────────────┐
│ 1. Checkout code        │
│ 2. Authenticate to GCP  │
│ 3. Configure Docker     │
│ 4. Get GKE credentials  │
│ 5. Build Docker image   │
│ 6. Push to Registry     │
│ 7. Update Kustomize     │
│ 8. Deploy to cluster    │
│ 9. Verify rollout       │
└─────────────────────────┘
     ↓
Google Artifact Registry
     ↓
GKE Cluster (dwk-environments pod updated)
```

## Prerequisites

### 1. Google Cloud Service Account

Create a service account for GitHub Actions:

```bash
gcloud iam service-accounts create github-actions \
  --project=dwk-gke-477617 \
  --display-name="GitHub Actions"
```

### 2. Required IAM Roles

The service account needs these roles:

- **Kubernetes Engine Service Agent** (`roles/container.serviceAgent`)
  - Manage GKE cluster resources
  - Access service accounts

- **Storage Admin** (`roles/storage.admin`)
  - Full control of storage buckets

- **Artifact Registry Administrator** (`roles/artifactregistry.admin`)
  - Create and manage repositories

- **Artifact Registry Create-on-Push Repository Administrator** (`roles/artifactregistry.createOnPushRepositoryAdministrator`)
  - Manage artifacts in repositories
  - Auto-create repositories on push

Assign roles:
```bash
gcloud projects add-iam-policy-binding dwk-gke-477617 \
  --member=serviceAccount:github-actions@dwk-gke-477617.iam.gserviceaccount.com \
  --role=roles/container.serviceAgent

# ... repeat for other roles
```

### 3. Service Account Key

Generate JSON key for authentication:

```bash
gcloud iam service-accounts keys create ~/github-actions-key.json \
  --iam-account=github-actions@dwk-gke-477617.iam.gserviceaccount.com \
  --project=dwk-gke-477617
```

### 4. Google Artifact Registry

Create Docker repository:

```bash
gcloud artifacts repositories create docker-repo \
  --repository-format=docker \
  --location=europe-north1 \
  --project=dwk-gke-477617
```

## GitHub Secrets Configuration

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

### 1. GKE_PROJECT
- **Value**: `dwk-gke-477617` (your GCP project ID)

### 2. GKE_SA_KEY
- **Value**: Full contents of `~/github-actions-key.json`
- ⚠️ **CRITICAL**: Keep this secret secure - never commit to git

Location in GitHub:
```
Repository → Settings → Secrets and variables → Actions → New repository secret
```

## Workflow File: .github/workflows/main.yaml

### Trigger Configuration

```yaml
on:
  push:
    paths:
      - 'ejercicio3_5/**'      # Trigger on changes to ejercicio3_5
      - '.github/workflows/main.yaml'  # Trigger on workflow changes
```

### Environment Variables

```yaml
env:
  PROJECT_ID: ${{ secrets.GKE_PROJECT }}
  GKE_CLUSTER: dwk-cluster
  GKE_ZONE: europe-north1-b
  REGISTRY: europe-north1-docker.pkg.dev
  REPOSITORY: docker-repo
  IMAGE: dwk-environments
  SERVICE: dwk-environments
  BRANCH: ${{ github.ref_name }}
```

### Workflow Steps

#### 1. Checkout Code

```yaml
- name: Checkout
  uses: actions/checkout@v4
```

Clones the repository into the workflow runner.

#### 2. Authenticate to Google Cloud

```yaml
- name: Authenticate to Google Cloud
  uses: google-github-actions/auth@v2
  with:
    credentials_json: '${{ secrets.GKE_SA_KEY }}'
```

Uses the service account JSON key to authenticate to GCP.

#### 3. Setup Google Cloud SDK

```yaml
- name: Set up Cloud SDK
  uses: google-github-actions/setup-gcloud@v2

- name: Use gcloud CLI
  run: gcloud info
```

Installs and configures the `gcloud` CLI tool.

#### 4. Configure Docker for Artifact Registry

```yaml
- name: Configure Docker for Artifact Registry
  run: gcloud auth configure-docker ${{ env.REGISTRY }} --quiet
```

Configures Docker daemon to authenticate to Google Artifact Registry at `europe-north1-docker.pkg.dev`.

#### 5. Get GKE Cluster Credentials

```yaml
- name: Get GKE credentials
  uses: google-github-actions/get-gke-credentials@v2
  with:
    cluster_name: '${{ env.GKE_CLUSTER }}'
    project_id: '${{ env.PROJECT_ID }}'
    location: '${{ env.GKE_ZONE }}'
```

Retrieves kubeconfig credentials for the GKE cluster.

#### 6. Form Image Name

```yaml
- name: Form the image name
  run: echo "IMAGE_TAG=${{ env.REGISTRY }}/${{ env.PROJECT_ID }}/${{ env.REPOSITORY }}/${{ env.IMAGE }}:${{ env.BRANCH }}-${{ github.sha }}" >> $GITHUB_ENV
```

Creates the full image tag:
```
europe-north1-docker.pkg.dev/dwk-gke-477617/docker-repo/dwk-environments:main-a1b2c3d4e5f6
```

Components:
- `europe-north1-docker.pkg.dev`: Artifact Registry endpoint
- `dwk-gke-477617`: GCP project ID
- `docker-repo`: Repository name
- `dwk-environments`: Image name
- `main-a1b2c3d4e5f6`: Branch + commit SHA (unique per push)

#### 7. Build Docker Image

```yaml
- name: Build Docker image
  run: |
    cd ejercicio3_5
    docker build --tag ${{ env.IMAGE_TAG }} .
```

Builds the Dockerfile from `ejercicio3_5/` directory.

#### 8. Publish to Artifact Registry

```yaml
- name: Publish image to Artifact Registry
  run: docker push ${{ env.IMAGE_TAG }}
```

Pushes the image to Google Artifact Registry.

#### 9. Setup Kustomize

```yaml
- name: Set up Kustomize
  uses: imranismail/setup-kustomize@v2.1.0
```

Installs Kustomize tool for configuration management.

#### 10. Deploy to GKE

```yaml
- name: Deploy to GKE
  run: |
    cd ejercicio3_5
    kustomize edit set image PROJECT/IMAGE=${{ env.IMAGE_TAG }}
    kustomize build . | kubectl apply -f -
    kubectl rollout status deployment ${{ env.SERVICE }}
    kubectl get services -o wide
```

Steps:
1. Update `kustomization.yaml` with the new image
2. Build manifests with Kustomize
3. Apply to cluster
4. Wait for deployment to complete
5. Display services

## Image Naming Strategy

The workflow generates unique image tags:

```
europe-north1-docker.pkg.dev/dwk-gke-477617/docker-repo/dwk-environments:main-a1b2c3d4e5f6
                           └─────┬─────┘ └────┬────┘ └──────┬──────┘ └┬─┘ └────┬────┘
                           Registry    Project    Repository    Image    Branch-SHA
```

**Benefits:**
- ✅ Unique per commit (can revert)
- ✅ Tagged with branch name
- ✅ Easily identifies which commit built the image
- ✅ Multiple versions stored simultaneously

## Kustomize Integration

### Before Deployment

`kustomization.yaml`:
```yaml
images:
  - name: PROJECT/IMAGE
    newName: PROJECT/IMAGE
    newTag: latest
```

### During Deployment

The workflow runs:
```bash
kustomize edit set image PROJECT/IMAGE=europe-north1-docker.pkg.dev/dwk-gke-477617/docker-repo/dwk-environments:main-a1b2c3d4e5f6
```

### After Update

`kustomization.yaml` becomes:
```yaml
images:
  - name: PROJECT/IMAGE
    newName: europe-north1-docker.pkg.dev/dwk-gke-477617/docker-repo/dwk-environments
    newTag: main-a1b2c3d4e5f6
```

## Rollout Verification

```bash
kubectl rollout status deployment dwk-environments
```

This command:
- Waits until the deployment completes
- Handles RollingUpdate strategy
- Reports success or failure
- Prevents workflow from completing until deployment is ready

## Workflow Execution Monitoring

### View Workflow Runs

1. Go to GitHub repository
2. Click "Actions" tab
3. See all workflow runs

### View Run Details

Click on a specific run to see:
- Each step's output
- Build logs
- Error messages
- Execution time

### Real-time Logs

Streaming logs appear during execution:
- Green checkmark: Step succeeded
- Red X: Step failed
- Yellow dot: Step running

## Troubleshooting

### Workflow fails at "Authenticate to Google Cloud"

**Problem**: Invalid or missing `GKE_SA_KEY` secret
**Solution**:
```bash
# Verify secret content
cat ~/github-actions-key.json | wc -c  # Should be several KB

# Re-add to GitHub if corrupted
```

### Docker push fails

**Problem**: Artifact Registry authentication failed
**Solution**:
- Verify service account has Artifact Registry roles
- Check repository exists: `gcloud artifacts repositories list`
- Try manual push: `gcloud auth configure-docker && docker push <image>`

### Deployment fails with "ImagePullBackOff"

**Problem**: GKE can't pull image from registry
**Solution**:
- Verify image was pushed: `gcloud artifacts docker images list`
- Check cluster has proper network access
- Verify image path in kustomization.yaml

### Rollout times out

**Problem**: Pods not becoming Ready
**Solution**:
- Check pod logs: `kubectl logs -f deployment/dwk-environments`
- Verify health probes: `kubectl describe deployment dwk-environments`
- Check resource availability: `kubectl describe nodes`

## Security Best Practices

✅ **DO:**
- Store JSON key only in GitHub Secrets
- Rotate keys regularly
- Use service accounts (not user credentials)
- Limit IAM roles to minimum required
- Monitor deployment logs for anomalies

❌ **DON'T:**
- Commit `github-actions-key.json` to git
- Share secret values
- Use production keys in test workflows
- Grant overly broad IAM roles

## Next Steps

This workflow is the foundation for:
- **Environment-specific deployments** (dev/staging/prod overlays)
- **Automated testing** (add test step before build)
- **Rollback capabilities** (tagged releases)
- **Multi-service deployments** (multiple workflows)

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Google GitHub Actions](https://github.com/google-github-actions)
- [GCP Service Accounts](https://cloud.google.com/iam/docs/service-accounts)
- [Google Artifact Registry](https://cloud.google.com/artifact-registry)
- [Kustomize Documentation](https://kustomize.io/)

## Learning Outcomes

✅ Set up GitHub Actions workflow for CI/CD
✅ Configure Google Cloud service account authentication
✅ Automate Docker image building and publishing
✅ Deploy automatically to GKE on every push
✅ Use Kustomize for dynamic image management
✅ Monitor and troubleshoot workflow execution
✅ Implement GitOps principles (everything from git)
