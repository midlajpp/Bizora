const CdpClient = require('./cdpClient');

async function check() {
  const cdp = new CdpClient();
  await cdp.launch();
  await cdp.init();
  await cdp.navigate('http://127.0.0.1:5173/login');
  const loc = await cdp.evaluate('window.location.href');
  console.log('Location:', loc);
  const title = await cdp.evaluate('document.title');
  console.log('Title:', title);
  const html = await cdp.evaluate('document.documentElement.outerHTML.slice(0, 300)');
  console.log('HTML snippet:', html);
  await cdp.close();
}

check();
