const CdpClient = require('./cdpClient');

async function run() {
  const cdp = new CdpClient();
  await cdp.launch();
  await cdp.init();

  const res = await fetch('http://127.0.0.1:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'midlajppparappanangadi@gmail.com', password: '7736@Bizora' })
  });
  const data = await res.json();
  const token = data.token;
  const user = data.user || data.data;

  await cdp.navigate('http://localhost:5173/login');
  await new Promise(r => setTimeout(r, 800));
  await cdp.evaluate(`
    localStorage.setItem('bizora_token', '${token}');
    localStorage.setItem('bizora_user', JSON.stringify(${JSON.stringify(user)}));
  `);

  await cdp.navigate('http://localhost:5173/invoices/6abd60faad752c027de70b51');
  await new Promise(r => setTimeout(r, 4000));

  const pageInfo = await cdp.evaluate(`
    (() => {
      const text = document.body.innerText;
      const buttons = Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim());
      const hasPaper = !!document.querySelector('.invoice-paper');
      const hasError = text.includes('Error') || text.includes('failed');
      const title = document.title;
      const url = window.location.href;
      return { url, title, buttons, hasPaper, hasError, previewText: text.substring(0, 400) };
    })()
  `);

  console.log('PAGE INFO:', JSON.stringify(pageInfo, null, 2));
  await cdp.close();
}

run().catch(console.error);
