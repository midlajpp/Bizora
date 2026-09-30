const Invoice = require('../models/Invoice');

/**
 * Generate next unique sequential invoice number for a given user
 * E.g., INV-0001, INV-0002...
 * Continues from highest existing numeric invoice number for this user.
 */
const generateInvoiceNumber = async (userId) => {
  const invoices = await Invoice.find({ userId }).select('invoiceNumber');

  let maxNum = 0;
  for (const inv of invoices) {
    if (inv.invoiceNumber) {
      const match = inv.invoiceNumber.match(/\d+/g);
      if (match) {
        const num = parseInt(match[match.length - 1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  }

  let nextNum = maxNum > 0 ? maxNum + 1 : 1;
  let candidate = `INV-${String(nextNum).padStart(4, '0')}`;

  let exists = await Invoice.findOne({ userId, invoiceNumber: candidate });
  while (exists) {
    nextNum++;
    candidate = `INV-${String(nextNum).padStart(4, '0')}`;
    exists = await Invoice.findOne({ userId, invoiceNumber: candidate });
  }

  return candidate;
};

module.exports = { generateInvoiceNumber };

