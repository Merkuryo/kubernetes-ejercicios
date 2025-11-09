const https = require('https');
const http = require('http');
const k8s = require('@kubernetes/client-node');
const fs = require('fs');
const path = require('path');

const kc = new k8s.KubeConfig();
kc.loadFromCluster();

const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
const appsApi = kc.makeApiClient(k8s.AppsV1Api);
const customObjectsApi = kc.makeApiClient(k8s.CustomObjectsApi);
const batchApi = kc.makeApiClient(k8s.BatchV1Api);

const GROUP = 'stable.dwk';
const VERSION = 'v1';
const PLURAL = 'dummysites';

// State tracking: store active DummySites
const activeDummySites = new Map();

/**
 * Download HTML content from a URL
 */
async function downloadHtml(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const request = protocol.get(url, { redirect: 'follow', timeout: 10000 }, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        // Modify HTML to fix relative links (basic approach)
        const baseUrl = url.split('/').slice(0, 3).join('/');
        const modifiedHtml = data
          .replace(/href="\/(?!\/)/g, `href="${baseUrl}/`)
          .replace(/src="\/(?!\/)/g, `src="${baseUrl}/`)
          .replace(/href="(?!http|\/\/|#)/g, (match) => {
            const relPath = match.substring(6);
            try {
              const resolved = new URL(relPath, url).href;
              return `href="${resolved}`;
            } catch {
              return match;
            }
          });
        
        resolve(modifiedHtml);
      });
    });

    request.on('error', (error) => {
      console.error(`Error downloading ${url}:`, error.message);
      reject(error);
    });

    request.on('timeout', () => {
      request.destroy();
      reject(new Error(`Timeout downloading ${url}`));
    });
  });
}

/**
 * Create a Deployment for the DummySite
 */
async function createDeployment(namespace, name, htmlContent) {
  const imageName = `dummysite-${name}:latest`;
  
  // Create a simple Dockerfile content
  const dockerfile = `FROM nginx:alpine
COPY index.html /usr/share/nginx/html/index.html
`;

  const deployment = {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
      name: `${name}-deployment`,
      namespace: namespace,
      labels: {
        app: `dummysite-${name}`,
        'dummysite-name': name,
      },
    },
    spec: {
      replicas: 1,
      selector: {
        matchLabels: {
          app: `dummysite-${name}`,
        },
      },
      template: {
        metadata: {
          labels: {
            app: `dummysite-${name}`,
          },
        },
        spec: {
          containers: [
            {
              name: 'web-server',
              image: 'nginx:alpine',
              ports: [
                {
                  containerPort: 80,
                  name: 'http',
                },
              ],
              volumeMounts: [
                {
                  name: 'html-volume',
                  mountPath: '/usr/share/nginx/html',
                },
              ],
              livenessProbe: {
                httpGet: {
                  path: '/',
                  port: 80,
                },
                initialDelaySeconds: 5,
                periodSeconds: 10,
              },
              readinessProbe: {
                httpGet: {
                  path: '/',
                  port: 80,
                },
                initialDelaySeconds: 3,
                periodSeconds: 5,
              },
            },
          ],
          volumes: [
            {
              name: 'html-volume',
              configMap: {
                name: `${name}-html`,
              },
            },
          ],
        },
      },
    },
  };

  try {
    await appsApi.createNamespacedDeployment(namespace, deployment);
    console.log(`✓ Created Deployment ${name}-deployment in namespace ${namespace}`);
  } catch (error) {
    if (error.statusCode === 409) {
      console.log(`• Deployment ${name}-deployment already exists`);
    } else {
      console.error(`✗ Error creating Deployment:`, error.message);
      throw error;
    }
  }
}

/**
 * Create a ConfigMap to store the HTML content
 */
async function createConfigMap(namespace, name, htmlContent) {
  const configMap = {
    apiVersion: 'v1',
    kind: 'ConfigMap',
    metadata: {
      name: `${name}-html`,
      namespace: namespace,
      labels: {
        'dummysite-name': name,
      },
    },
    data: {
      'index.html': htmlContent,
    },
  };

  try {
    await k8sApi.createNamespacedConfigMap(namespace, configMap);
    console.log(`✓ Created ConfigMap ${name}-html in namespace ${namespace}`);
  } catch (error) {
    if (error.statusCode === 409) {
      // Update existing ConfigMap
      try {
        await k8sApi.patchNamespacedConfigMap(
          `${name}-html`,
          namespace,
          configMap,
          undefined,
          undefined,
          undefined,
          undefined,
          { headers: { 'Content-Type': 'application/merge-patch+json' } }
        );
        console.log(`✓ Updated ConfigMap ${name}-html in namespace ${namespace}`);
      } catch (patchError) {
        console.error(`✗ Error updating ConfigMap:`, patchError.message);
        throw patchError;
      }
    } else {
      console.error(`✗ Error creating ConfigMap:`, error.message);
      throw error;
    }
  }
}

/**
 * Create a Service for the Deployment
 */
async function createService(namespace, name) {
  const service = {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: {
      name: `${name}-service`,
      namespace: namespace,
      labels: {
        app: `dummysite-${name}`,
        'dummysite-name': name,
      },
    },
    spec: {
      selector: {
        app: `dummysite-${name}`,
      },
      ports: [
        {
          protocol: 'TCP',
          port: 80,
          targetPort: 80,
          name: 'http',
        },
      ],
      type: 'LoadBalancer',
    },
  };

  try {
    await k8sApi.createNamespacedService(namespace, service);
    console.log(`✓ Created Service ${name}-service in namespace ${namespace}`);
  } catch (error) {
    if (error.statusCode === 409) {
      console.log(`• Service ${name}-service already exists`);
    } else {
      console.error(`✗ Error creating Service:`, error.message);
      throw error;
    }
  }
}

/**
 * Handle a new or updated DummySite
 */
async function handleDummySiteAdded(dummysite) {
  const namespace = dummysite.metadata.namespace || 'default';
  const name = dummysite.metadata.name;
  const websiteUrl = dummysite.spec.website_url;

  console.log(`\n[NEW/UPDATED] DummySite: ${name}`);
  console.log(`  Namespace: ${namespace}`);
  console.log(`  Website URL: ${websiteUrl}`);

  try {
    // Download HTML content
    console.log(`  ⏳ Downloading HTML from ${websiteUrl}...`);
    const htmlContent = await downloadHtml(websiteUrl);
    console.log(`  ✓ Downloaded ${htmlContent.length} bytes`);

    // Create ConfigMap with HTML content
    console.log(`  ⏳ Creating ConfigMap...`);
    await createConfigMap(namespace, name, htmlContent);

    // Create Deployment
    console.log(`  ⏳ Creating Deployment...`);
    await createDeployment(namespace, name, htmlContent);

    // Create Service
    console.log(`  ⏳ Creating Service...`);
    await createService(namespace, name);

    console.log(`✓ Successfully processed DummySite ${name}\n`);
    activeDummySites.set(`${namespace}/${name}`, { name, namespace, url: websiteUrl });
  } catch (error) {
    console.error(`✗ Error processing DummySite ${name}:`, error.message);
  }
}

/**
 * Handle deletion of a DummySite
 */
async function handleDummySiteDeleted(dummysite) {
  const namespace = dummysite.metadata.namespace || 'default';
  const name = dummysite.metadata.name;

  console.log(`\n[DELETED] DummySite: ${name}`);
  console.log(`  Namespace: ${namespace}`);

  try {
    // Delete Deployment
    try {
      await appsApi.deleteNamespacedDeployment(`${name}-deployment`, namespace);
      console.log(`  ✓ Deleted Deployment ${name}-deployment`);
    } catch (error) {
      if (error.statusCode !== 404) throw error;
    }

    // Delete Service
    try {
      await k8sApi.deleteNamespacedService(`${name}-service`, namespace);
      console.log(`  ✓ Deleted Service ${name}-service`);
    } catch (error) {
      if (error.statusCode !== 404) throw error;
    }

    // Delete ConfigMap
    try {
      await k8sApi.deleteNamespacedConfigMap(`${name}-html`, namespace);
      console.log(`  ✓ Deleted ConfigMap ${name}-html`);
    } catch (error) {
      if (error.statusCode !== 404) throw error;
    }

    console.log(`✓ Successfully cleaned up DummySite ${name}\n`);
    activeDummySites.delete(`${namespace}/${name}`);
  } catch (error) {
    console.error(`✗ Error deleting DummySite ${name}:`, error.message);
  }
}

/**
 * Watch DummySite resources
 */
async function watchDummySites() {
  console.log('🔍 Starting to watch DummySite resources...\n');

  const watch = new k8s.Watch(kc);

  try {
    const watchReq = await watch.stream(
      `/apis/${GROUP}/${VERSION}/dummysites`,
      {},
      (type, apiObj) => {
        if (type === 'ADDED' || type === 'MODIFIED') {
          handleDummySiteAdded(apiObj);
        } else if (type === 'DELETED') {
          handleDummySiteDeleted(apiObj);
        }
      },
      (error) => {
        console.error('✗ Watch error:', error.message);
        // Reconnect after 5 seconds
        setTimeout(() => {
          console.log('↻ Attempting to reconnect...\n');
          watchDummySites();
        }, 5000);
      }
    );

    // Optional: handle close event
    watchReq.on('close', () => {
      console.log('\n⚠ Watch closed, attempting to reconnect...\n');
      setTimeout(() => {
        watchDummySites();
      }, 5000);
    });
  } catch (error) {
    console.error('✗ Error setting up watch:', error.message);
    setTimeout(() => {
      console.log('↻ Attempting to reconnect...\n');
      watchDummySites();
    }, 5000);
  }
}

/**
 * Load existing DummySites on startup
 */
async function loadExistingDummySites() {
  console.log('📦 Loading existing DummySite resources...\n');

  try {
    const response = await customObjectsApi.listClusterCustomObject(GROUP, VERSION, PLURAL);
    const dummysites = response.items || [];

    console.log(`Found ${dummysites.length} existing DummySite(s)\n`);

    for (const dummysite of dummysites) {
      await handleDummySiteAdded(dummysite);
    }
  } catch (error) {
    if (error.statusCode === 404) {
      console.log('No DummySites found yet\n');
    } else {
      console.error('✗ Error loading DummySites:', error.message);
    }
  }
}

/**
 * Health check endpoint
 */
async function startHealthCheck() {
  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'healthy',
        activeDummySites: activeDummySites.size,
        timestamp: new Date().toISOString(),
      }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(8080, () => {
    console.log('🏥 Health check server running on port 8080\n');
  });
}

/**
 * Main startup
 */
async function main() {
  console.log('════════════════════════════════════════════════════════════');
  console.log('  DummySite Custom Controller');
  console.log('  Kubernetes CRD Controller - Node.js Implementation');
  console.log('════════════════════════════════════════════════════════════\n');

  try {
    // Start health check
    await startHealthCheck();

    // Load existing DummySites
    await loadExistingDummySites();

    // Start watching for changes
    await watchDummySites();
  } catch (error) {
    console.error('✗ Fatal error:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

main().catch((error) => {
  console.error('✗ Fatal error during startup:', error);
  process.exit(1);
});
