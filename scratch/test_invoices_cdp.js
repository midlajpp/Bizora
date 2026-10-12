const CdpClient = require('./cdpClient');
const fs = require('fs');
const path = require('path');

async function loginAdmin() {
  const res = await fetch('http://127.0.0.1:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'midlajppparappanangadi@gmail.com',
      password: '7736@Bizora'
    })
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error('Admin login failed: ' + JSON.stringify(data));
  }
  return { token: data.token, user: data.user || data.data };
}

async function createMultiPageTestInvoice(itemCount = 16) {
  const dotenv = require('../server/node_modules/dotenv');
  dotenv.config({ path: path.join(__dirname, '../server/.env') });
  const mongoose = require('../server/node_modules/mongoose');
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }

  const Invoice = require('../server/src/models/Invoice');
  const Customer = require('../server/src/models/Customer');
  const User = require('../server/src/models/User');

  // Find regular user who owns invoices
  const user = await User.findOne({ email: 'midlajpp018@gmail.com' }) || await User.findOne({ role: 'user' });
  if (!user) throw new Error('No user found');

  // Attach logo to this user
  const logosDir = path.join(__dirname, '../server/uploads/logos');
  if (fs.existsSync(logosDir)) {
    const files = fs.readdirSync(logosDir);
    if (files.length > 0) {
      user.businessLogo = `/uploads/logos/${files[0]}`;
      await user.save();
      console.log(`[Setup] Set businessLogo on user ${user.email}: ${user.businessLogo}`);
    }
  }

  // Find or create customer
  let customer = await Customer.findOne({ userId: user._id });
  if (!customer) {
    customer = await Customer.create({
      userId: user._id,
      name: 'Global Enterprise Corp',
      email: 'accounts@globalenterprise.com',
      phone: '+91 98450 12345',
      address: 'Plot 42, Tech Cyber City, Bangalore, Karnataka'
    });
  }

  const items = [];
  for (let i = 1; i <= itemCount; i++) {
    items.push({
      serviceName: `Cloud Infrastructure Service #${i} - Monthly Dedicated Compute`,
      description: `High performance compute node with NVMe storage, 32GB RAM, and automated daily backups for cluster node ${i}.`,
      qty: (i % 3) + 1,
      rate: 1500 + i * 100,
      amount: ((i % 3) + 1) * (1500 + i * 100)
    });
  }

  const subtotal = items.reduce((sum, it) => sum + it.amount, 0);
  const discount = 500;
  const total = subtotal - discount;

  const invoice = await Invoice.create({
    userId: user._id,
    customerId: customer._id,
    invoiceNumber: `TEST-INV-${Date.now().toString().slice(-4)}`,
    invoiceDate: new Date(),
    dueDate: new Date(Date.now() + 15 * 86400000),
    items,
    subtotal,
    discount,
    total,
    notes: 'Payment terms: Net 15 days. Please make direct wire transfer or UPI to Bizora business account.',
    paymentStatus: 'Pending',
    paidAmount: 0,
    pendingAmount: total
  });

  return invoice;
}

// Ensure business logo is set on admin profile so logo optimization is exercised
async function setAdminLogoIfEmpty(token) {
  const meRes = await fetch('http://127.0.0.1:5000/api/auth/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const meData = await meRes.json();
  if (meData.data && !meData.data.businessLogo) {
    // Check if there is an existing logo in uploads/logos
    const logosDir = path.join(__dirname, '../server/uploads/logos');
    if (fs.existsSync(logosDir)) {
      const files = fs.readdirSync(logosDir);
      if (files.length > 0) {
        const logoRelPath = `/uploads/logos/${files[0]}`;
        // Update user business logo directly in db
        const dotenv = require('../server/node_modules/dotenv');
        dotenv.config({ path: path.join(__dirname, '../server/.env') });
        const mongoose = require('../server/node_modules/mongoose');
        await mongoose.connect(process.env.MONGO_URI);
        const User = require('../server/src/models/User');
        await User.findByIdAndUpdate(meData.data._id, { businessLogo: logoRelPath });
        await mongoose.disconnect();
        console.log(`[Setup] Attached sample business logo ${logoRelPath} to admin account`);
      }
    }
  }
}

async function runTest() {
  console.log('--- 1. Authenticating Admin User ---');
  const { token, user } = await loginAdmin();
  console.log(`Authenticated: ${user.email} (Role: ${user.role})`);

  console.log('--- 2. Creating Multi-Page Test Invoice (16 items) ---');
  const multiPageInvoice = await createMultiPageTestInvoice(16);
  console.log(`Created multi-page invoice: ${multiPageInvoice.invoiceNumber} with ${multiPageInvoice.items.length} items (ID: ${multiPageInvoice._id})`);

  // Existing invoice INV-0001
  const existingInvoiceId = '6abd60faad752c027de70b51';

  const testInvoices = [
    { label: 'INV-0001 (Existing 8 Items with Logo)', id: existingInvoiceId },
    { label: `${multiPageInvoice.invoiceNumber} (Multi-Page 16 Items with Logo)`, id: multiPageInvoice._id }
  ];

  console.log('--- 3. Launching Headless Chrome via CDP ---');
  const cdp = new CdpClient();
  await cdp.launch();
  await cdp.init();

  const results = [];

  for (const testInv of testInvoices) {
    console.log(`\n======================================================`);
    console.log(`Testing Invoice: ${testInv.label}`);
    console.log(`======================================================`);

    // Navigate to /login first to establish localStorage domain context
    await cdp.navigate('http://127.0.0.1:5173/login');
    await cdp.evaluate(`
      localStorage.setItem('bizora_token', ${JSON.stringify(token)});
      localStorage.setItem('bizora_user', ${JSON.stringify(JSON.stringify(user))});
    `);

    // Navigate to the invoice detail page
    await cdp.navigate(`http://127.0.0.1:5173/invoices/${testInv.id}`);
    console.log(`Navigated to: http://127.0.0.1:5173/invoices/${testInv.id}`);

    // Wait for the invoice paper to be rendered
    let loaded = false;
    for (let i = 0; i < 50; i++) {
      await new Promise(r => setTimeout(r, 250));
      const status = await cdp.evaluate(`
        ({
          hasPaper: !!document.querySelector('.invoice-paper-page, .pdf-export-page'),
          path: window.location.pathname,
          text: document.body.innerText.slice(0, 100)
        })
      `);
      if (status?.hasPaper) {
        loaded = true;
        break;
      }
    }

    if (!loaded) {
      console.error('Invoice paper failed to render in DOM within timeout');
      continue;
    }

    // Give images a moment to settle
    await new Promise(r => setTimeout(r, 1000));

    const pageCount = await cdp.evaluate(`
      document.querySelectorAll('.pdf-export-page').length || document.querySelectorAll('.invoice-paper-page').length
    `);
    console.log(`Rendered A4 Page Count: ${pageCount}`);

    // Generate OLD (Before Optimization) PDF in the browser context
    console.log('Generating BEFORE (Unoptimized: scale 2, PNG, no text layer) PDF...');
    const oldPdfBase64 = await cdp.evaluate(`
      (async () => {
        const { generateLegacyUnoptimizedPdf } = await import('/src/utils/pdfGenerator.js');
        const exportContainer = document.querySelector('[style*="position: fixed"]') || document.querySelector('.invoice-paper-pages-container') || document.body;
        const res = await generateLegacyUnoptimizedPdf(exportContainer, { invoiceNumber: 'INV' });
        return res.pdf.output('datauristring').split(',')[1];
      })()
    `);

    const oldBuffer = Buffer.from(oldPdfBase64, 'base64');
    const oldFilePath = path.join(__dirname, `${testInv.id}_before.pdf`);
    fs.writeFileSync(oldFilePath, oldBuffer);
    console.log(`BEFORE PDF Size: ${oldBuffer.length} bytes (${(oldBuffer.length / 1024).toFixed(1)} KB / ${(oldBuffer.length / 1048576).toFixed(2)} MB)`);

    // Generate NEW (Optimized) PDF using our utility
    console.log('Generating AFTER (Optimized: scale 1.6, JPEG 0.82, logo downsampled, selectable text layer) PDF...');
    const newPdfData = await cdp.evaluate(`
      (async () => {
        const { generateOptimizedInvoicePdf } = await import('/src/utils/pdfGenerator.js');
        
        // Find container
        const exportContainer = document.querySelector('[style*="position: fixed"]') || document.querySelector('.invoice-paper-pages-container') || document.body;

        const res = await generateOptimizedInvoicePdf(exportContainer, window.__invoiceData || {
          invoiceNumber: document.querySelector('h2')?.nextElementSibling?.textContent?.trim() || 'INV',
          userId: {},
          customerId: {}
        });

        const base64 = res.pdf.output('datauristring').split(',')[1];
        return {
          base64,
          byteSize: res.byteSize,
          formattedSize: res.formattedSize,
          underOneMb: res.underOneMb,
          pagesCount: res.pagesCount
        };
      })()
    `);

    const newBuffer = Buffer.from(newPdfData.base64, 'base64');
    const newFilePath = path.join(__dirname, `${testInv.id}_after.pdf`);
    fs.writeFileSync(newFilePath, newBuffer);
    console.log(`AFTER PDF Size: ${newBuffer.length} bytes (${(newBuffer.length / 1024).toFixed(1)} KB / ${(newBuffer.length / 1048576).toFixed(2)} MB)`);

    // Verify text searchability in the generated PDF
    const pdfRawString = newBuffer.toString('latin1');
    const hasTextLayer = pdfRawString.includes('3 Tr') || pdfRawString.includes('BT');
    const hasInvoiceNumberText = pdfRawString.includes('INV');
    console.log(`Selectable Text Layer Present (3 Tr / BT): ${hasTextLayer}`);

    const sizeReduction = ((1 - (newBuffer.length / oldBuffer.length)) * 100).toFixed(1);
    console.log(`Reduction: ${sizeReduction}% smaller! Below 1 MB: ${newBuffer.length < 1048576 ? 'YES (PASS)' : 'NO'}`);

    results.push({
      invoice: testInv.label,
      pages: pageCount,
      beforeBytes: oldBuffer.length,
      beforeFormatted: `${(oldBuffer.length / 1024).toFixed(1)} KB (${(oldBuffer.length / 1048576).toFixed(2)} MB)`,
      afterBytes: newBuffer.length,
      afterFormatted: `${(newBuffer.length / 1024).toFixed(1)} KB (${(newBuffer.length / 1048576).toFixed(2)} MB)`,
      reduction: `${sizeReduction}%`,
      underOneMb: newBuffer.length < 1048576,
      hasSelectableText: hasTextLayer
    });
  }

  // Mobile Viewport Test (375 x 667)
  console.log(`\n======================================================`);
  console.log(`Mobile Viewport Test (375x667 iPhone SE)`);
  console.log(`======================================================`);
  await cdp.setViewport(375, 667, true);
  await cdp.navigate(`http://127.0.0.1:5173/invoices/${existingInvoiceId}`);
  await new Promise(r => setTimeout(r, 1500));

  const mobileRes = await cdp.evaluate(`
    (async () => {
      const { generateOptimizedInvoicePdf } = await import('/src/utils/pdfGenerator.js');
      const exportContainer = document.querySelector('[style*="position: fixed"]') || document.querySelector('.invoice-paper-pages-container');
      const res = await generateOptimizedInvoicePdf(exportContainer, { invoiceNumber: 'INV-0001' });
      return {
        byteSize: res.byteSize,
        formattedSize: res.formattedSize,
        underOneMb: res.underOneMb
      };
    })()
  `);
  console.log(`Mobile Viewport PDF Size: ${mobileRes.byteSize} bytes (${mobileRes.formattedSize}) - Below 1 MB: ${mobileRes.underOneMb}`);

  await cdp.close();

  console.log(`\n======================================================`);
  console.log(`BENCHMARK SUMMARY TABLE:`);
  console.log(`======================================================`);
  console.table(results);
}

runTest().catch(err => {
  console.error('Fatal benchmark error:', err);
  process.exit(1);
});
