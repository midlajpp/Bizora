const { spawn } = require('child_process');
const http = require('http');

async function test() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9222',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + require('os').tmpdir() + '\\chrome-test-' + Date.now()
  ]);

  // Wait 1.5s for port to open
  await new Promise(r => setTimeout(r, 1500));

  http.get('http://127.0.0.1:9222/json/version', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Chrome CDP Version info:', JSON.parse(data).Browser);
      chrome.kill();
      process.exit(0);
    });
  }).on('error', err => {
    console.error('CDP Error:', err.message);
    chrome.kill();
    process.exit(1);
  });
}

test();
