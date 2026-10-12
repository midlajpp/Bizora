const { spawn } = require('child_process');
const http = require('http');
const os = require('os');
const path = require('path');

class CdpClient {
  constructor(port = 9555) {
    this.port = port;
    this.chromeProcess = null;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
  }

  async launch(chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe') {
    const userDataDir = path.join(os.tmpdir(), 'chrome-bizora-' + Date.now());
    this.chromeProcess = spawn(chromePath, [
      '--headless=new',
      '--disable-gpu',
      '--no-proxy-server',
      `--remote-debugging-port=${this.port}`,
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${userDataDir}`,
      '--window-size=1280,900'
    ]);

    // Wait until port is accessible
    for (let i = 0; i < 30; i++) {
      try {
        await new Promise(r => setTimeout(r, 200));
        const targets = await this.httpGet(`http://127.0.0.1:${this.port}/json/list`);
        if (targets && targets.length > 0) {
          const pageTarget = targets.find(t => t.type === 'page') || targets[0];
          await this.connectWs(pageTarget.webSocketDebuggerUrl);
          return;
        }
      } catch (err) {
        // Retry
      }
    }
    throw new Error('Failed to connect to Chrome CDP within timeout');
  }

  httpGet(url) {
    return new Promise((resolve, reject) => {
      http.get(url, res => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve(body);
          }
        });
      }).on('error', reject);
    });
  }

  connectWs(wsUrl) {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = reject;
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const { resolve, reject } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) {
            reject(new Error(msg.error.message));
          } else {
            resolve(msg.result);
          }
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async init() {
    await this.send('Page.enable');
    await this.send('Runtime.enable');
    await this.send('DOM.enable');
  }

  async navigate(url) {
    await this.send('Page.navigate', { url });
    // Poll until document.readyState === 'complete'
    for (let i = 0; i < 50; i++) {
      await new Promise(r => setTimeout(r, 100));
      const res = await this.evaluate('document.readyState');
      if (res === 'complete') return;
    }
  }

  async setViewport(width, height, isMobile = false) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: isMobile ? 2 : 1,
      mobile: isMobile
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
    }
    return res.result?.value;
  }

  async close() {
    if (this.ws) {
      try { this.ws.close(); } catch (e) {}
    }
    if (this.chromeProcess) {
      try { this.chromeProcess.kill(); } catch (e) {}
    }
  }
}

module.exports = CdpClient;
