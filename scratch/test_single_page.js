const CdpClient = require('./cdpClient');

async function testSingle() {
  const cdp = new CdpClient();
  await cdp.launch();
  await cdp.init();

  const tokenRes = await fetch('http://127.0.0.1:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'midlajppparappanangadi@gmail.com',
      password: '7736@Bizora'
    })
  }).then(r => r.json());

  await cdp.navigate('http://127.0.0.1:5173/login');
  await cdp.evaluate(`
    localStorage.setItem('bizora_token', ${JSON.stringify(tokenRes.token)});
    localStorage.setItem('bizora_user', ${JSON.stringify(JSON.stringify(tokenRes.user || tokenRes.data))});
  `);

  await cdp.navigate('http://127.0.0.1:5173/invoices/6ac14ab4fb6a7056a39ba7ab');
  await new Promise(r => setTimeout(r, 2000));

  const res = await cdp.evaluate(`
    (async () => {
      const { generateLegacyUnoptimizedPdf, generateOptimizedInvoicePdf } = await import('/src/utils/pdfGenerator.js');
      const cont = document.querySelector('[style*="position: fixed"]') || document.querySelector('.invoice-paper-pages-container');
      const oldRes = await generateLegacyUnoptimizedPdf(cont, { invoiceNumber: 'INV-0005' });
      const newRes = await generateOptimizedInvoicePdf(cont, { invoiceNumber: 'INV-0005' });
      return {
        beforeBytes: oldRes.byteSize,
        beforeFormatted: oldRes.formattedSize,
        afterBytes: newRes.byteSize,
        afterFormatted: newRes.formattedSize,
        pages: newRes.pagesCount,
        reduction: ((1 - (newRes.byteSize / oldRes.byteSize)) * 100).toFixed(1) + '%'
      };
    })()
  `);

  console.log('INV-0005 (1 Item) Results:', JSON.stringify(res, null, 2));
  await cdp.close();
}

testSingle().catch(console.error);
