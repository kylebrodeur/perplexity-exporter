import fs from 'fs';
import { createStealthBrowser, PERPLEXITY_API } from './browser-config.js';

const capturedRequests = [];
const capturedResponses = [];

async function captureRequests() {
  console.log('Launching browser...');
  const { browser, page } = await createStealthBrowser();

  // Intercept all network requests
  page.on('request', (request) => {
    const url = request.url();

    // Capture API requests to Perplexity
    if (url.includes('perplexity.ai') || url.includes('/api/')) {
      const requestData = {
        timestamp: new Date().toISOString(),
        method: request.method(),
        url: url,
        headers: request.headers(),
        postData: request.postData(),
      };

      capturedRequests.push(requestData);

      // Log interesting requests in real-time
      if (url.includes('thread') || url.includes('library') || url.includes('chat')) {
        console.log(`\n📡 REQUEST: ${request.method()} ${url}`);
        if (request.postData()) {
          console.log('   Body:', request.postData().substring(0, 200));
        }
      }
    }
  });

  // Intercept all network responses
  page.on('response', async (response) => {
    const url = response.url();

    // Capture API responses from Perplexity
    if (url.includes('perplexity.ai') || url.includes('/api/')) {
      try {
        const responseData = {
          timestamp: new Date().toISOString(),
          status: response.status(),
          url: url,
          headers: response.headers(),
          body: null,
        };

        // Try to get the response body
        try {
          const contentType = response.headers()['content-type'] || '';
          if (contentType.includes('application/json')) {
            responseData.body = await response.json();
          } else {
            responseData.body = await response.text();
          }
        } catch (e) {
          // Some responses can't be read
        }

        capturedResponses.push(responseData);

        // Log interesting responses in real-time
        if (url.includes('thread') || url.includes('library') || url.includes('chat')) {
          console.log(`\n✅ RESPONSE: ${response.status()} ${url}`);
          if (responseData.body) {
            const preview = JSON.stringify(responseData.body).substring(0, 300);
            console.log('   Body preview:', preview);
          }
        }
      } catch (e) {
        console.error('Error capturing response:', e.message);
      }
    }
  });

  console.log('\n🚀 Opening Perplexity...\n');
  console.log('INSTRUCTIONS:');
  console.log('1. Log in to Perplexity if needed');
  console.log('2. Navigate to your threads/library page');
  console.log('3. Wait for threads to load');
  console.log('4. Scroll down to load more threads (if applicable)');
  console.log('5. Click on a thread to see the detail view');
  console.log('6. Press Ctrl+C in the terminal when done capturing\n');

  await page.goto(PERPLEXITY_API.BASE_URL);

  // Wait for user to perform actions
  // Keep the browser open until manually closed
  await new Promise((resolve) => {
    process.on('SIGINT', () => {
      console.log('\n\n📝 Saving captured data...');
      resolve();
    });
  });

  // Save all captured data
  fs.writeFileSync('captured-requests.json', JSON.stringify(capturedRequests, null, 2));

  fs.writeFileSync('captured-responses.json', JSON.stringify(capturedResponses, null, 2));

  console.log(`✅ Saved ${capturedRequests.length} requests to captured-requests.json`);
  console.log(`✅ Saved ${capturedResponses.length} responses to captured-responses.json`);

  // Analyze and summarize the captured data
  const apiEndpoints = new Set();
  capturedRequests.forEach((req) => {
    const urlObj = new URL(req.url);
    apiEndpoints.add(`${req.method} ${urlObj.pathname}`);
  });

  console.log('\n📊 API Endpoints found:');
  Array.from(apiEndpoints)
    .filter(
      (endpoint) =>
        endpoint.includes('thread') || endpoint.includes('library') || endpoint.includes('chat')
    )
    .forEach((endpoint) => console.log(`   ${endpoint}`));

  await browser.close();
}

captureRequests().catch(console.error);
