import fs from 'fs';

console.log('🔍 Analyzing captured data...\n');

// Read captured files
const requests = JSON.parse(fs.readFileSync('captured-requests.json', 'utf-8'));
const responses = JSON.parse(fs.readFileSync('captured-responses.json', 'utf-8'));

console.log(`📊 Total requests captured: ${requests.length}`);
console.log(`📊 Total responses captured: ${responses.length}\n`);

// Find thread-related endpoints
console.log('🔎 Thread-related endpoints:\n');

const threadEndpoints = new Map();

responses.forEach(response => {
  const url = new URL(response.url);
  const path = url.pathname;
  
  // Look for thread-related paths
  if (path.includes('thread') || path.includes('library') || 
      path.includes('chat') || path.includes('collection')) {
    
    const key = `${path} (${response.status})`;
    
    if (!threadEndpoints.has(key)) {
      threadEndpoints.set(key, {
        path,
        status: response.status,
        method: requests.find(r => r.url === response.url)?.method || 'GET',
        count: 0,
        hasArrayResponse: false,
        hasObjectResponse: false,
        sampleBody: null
      });
    }
    
    const endpoint = threadEndpoints.get(key);
    endpoint.count++;
    
    if (response.body) {
      if (Array.isArray(response.body)) {
        endpoint.hasArrayResponse = true;
        endpoint.sampleBody = response.body.slice(0, 2);
      } else if (typeof response.body === 'object') {
        endpoint.hasObjectResponse = true;
        if (!endpoint.sampleBody) {
          endpoint.sampleBody = response.body;
        }
      }
    }
  }
});

// Display findings
threadEndpoints.forEach((info, key) => {
  console.log(`\n📍 ${info.method} ${info.path}`);
  console.log(`   Status: ${info.status}`);
  console.log(`   Called: ${info.count} time(s)`);
  
  if (info.hasArrayResponse) {
    console.log(`   ✅ Returns array (likely list endpoint)`);
    if (info.sampleBody) {
      console.log(`   Sample items: ${info.sampleBody.length}`);
      const firstItem = info.sampleBody[0];
      if (firstItem) {
        console.log(`   First item keys: ${Object.keys(firstItem).join(', ')}`);
      }
    }
  }
  
  if (info.hasObjectResponse) {
    console.log(`   ✅ Returns object (likely detail endpoint)`);
    if (info.sampleBody) {
      const keys = Object.keys(info.sampleBody);
      console.log(`   Response keys: ${keys.slice(0, 10).join(', ')}${keys.length > 10 ? '...' : ''}`);
      
      // Look for thread-like properties
      if (info.sampleBody.messages || info.sampleBody.queries) {
        console.log(`   🎯 Likely thread detail endpoint!`);
      }
      if (info.sampleBody.threads || info.sampleBody.items) {
        console.log(`   🎯 Likely thread list endpoint!`);
      }
    }
  }
});

// Find authentication headers
console.log('\n\n🔐 Authentication headers used:\n');

const authHeaders = new Set();
requests.forEach(request => {
  Object.keys(request.headers).forEach(header => {
    if (header.toLowerCase().includes('auth') || 
        header.toLowerCase().includes('token') ||
        header.toLowerCase().includes('cookie') ||
        header.toLowerCase().startsWith('x-')) {
      authHeaders.add(header);
    }
  });
});

authHeaders.forEach(header => {
  console.log(`   ${header}`);
});

// Save analysis
const analysis = {
  summary: {
    totalRequests: requests.length,
    totalResponses: responses.length,
    threadEndpoints: Array.from(threadEndpoints.entries()).map(([key, value]) => value)
  },
  authHeaders: Array.from(authHeaders),
  recommendations: []
};

// Add recommendations
const listEndpoints = Array.from(threadEndpoints.values())
  .filter(e => e.hasArrayResponse);
const detailEndpoints = Array.from(threadEndpoints.values())
  .filter(e => e.hasObjectResponse && (e.path.includes('thread/') || e.path.includes('chat/')));

if (listEndpoints.length > 0) {
  analysis.recommendations.push({
    type: 'LIST_THREADS',
    endpoints: listEndpoints.map(e => `${e.method} ${e.path}`),
    confidence: 'high'
  });
}

if (detailEndpoints.length > 0) {
  analysis.recommendations.push({
    type: 'GET_THREAD_DETAIL',
    endpoints: detailEndpoints.map(e => `${e.method} ${e.path}`),
    confidence: 'high'
  });
}

fs.writeFileSync('analysis.json', JSON.stringify(analysis, null, 2));

console.log('\n\n💡 Recommendations:\n');
analysis.recommendations.forEach(rec => {
  console.log(`   ${rec.type}:`);
  rec.endpoints.forEach(endpoint => {
    console.log(`      ${endpoint}`);
  });
});

console.log('\n✅ Analysis saved to analysis.json');
console.log('\n📝 Next steps:');
console.log('   1. Review the endpoints above');
console.log('   2. Check captured-responses.json for the actual data structure');
console.log('   3. Update export-threads.js with the correct endpoints and headers');
