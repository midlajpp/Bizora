const CdpClient = require('./cdpClient');

async function testVerification() {
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

  const invoicesToTest = [
    { id: '6ac14ab4fb6a7056a39ba7ab', name: 'INV-0005 (1 Item)' },
    { id: '6acc565e73db23aab3464a16', name: 'Multi-Item Invoice (16 Items)' }
  ];

  for (const inv of invoicesToTest) {
    console.log(`\n========================================`);
    console.log(`Testing Invoice: ${inv.name}`);
    console.log(`========================================`);

    await cdp.navigate(`http://127.0.0.1:5173/invoices/${inv.id}`);
    await new Promise(r => setTimeout(r, 2500));

    const check = await cdp.evaluate(`
      (async () => {
        const previewImages = document.querySelectorAll('.invoice-paper-page img');
        const pdfContainerImages = document.querySelectorAll('[style*="position: fixed"] img');
        const previewPageCount = document.querySelectorAll('.invoice-paper-page').length;
        
        const { generateOptimizedInvoicePdf } = await import('/src/utils/pdfGenerator.js');
        const cont = document.querySelector('[style*="position: fixed"]') || document.querySelector('.invoice-paper-pages-container');
        const pdfRes = await generateOptimizedInvoicePdf(cont, { invoiceNumber: '${inv.name}' });

        // Check text content
        const page1Text = document.querySelector('.invoice-paper-page')?.innerText || '';
        const hasBusinessName = page1Text.includes('BIZORA') || page1Text.includes('Midlaj');
        const hasInvoiceTitle = page1Text.includes('INVOICE');
        const hasGrandTotal = page1Text.includes('Grand Total') || page1Text.includes('Total');

        return {
          previewImagesCount: previewImages.length,
          pdfContainerImagesCount: pdfContainerImages.length,
          previewPageCount,
          pdfPagesCount: pdfRes.pagesCount,
          pdfSizeBytes: pdfRes.byteSize,
          pdfSizeFormatted: pdfRes.formattedSize,
          isUnder1MB: pdfRes.byteSize < 1048576,
          hasBusinessName,
          hasInvoiceTitle,
          hasGrandTotal
        };
      })()
    `);

    console.log('Result:', JSON.stringify(check, null, 2));
  }

  await cdp.close();
}

testVerification().catch(console.error);
