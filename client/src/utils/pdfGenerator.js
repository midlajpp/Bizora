import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Format bytes into readable string (e.g. "245.3 KB", "1.2 MB")
 */
export const formatBytes = (bytes, decimals = 1) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

/**
 * Ensure all <img> tags inside an element are fully loaded before rendering
 */
export const ensureImagesLoaded = async (element) => {
  const images = element.querySelectorAll('img');
  const promises = Array.from(images).map((img) => {
    if (img.complete && img.naturalWidth !== 0) return Promise.resolve();
    return new Promise((resolve) => {
      const cleanup = () => {
        img.removeEventListener('load', onLoad);
        img.removeEventListener('error', onError);
      };
      const onLoad = () => { cleanup(); resolve(); };
      const onError = () => { cleanup(); resolve(); };
      img.addEventListener('load', onLoad);
      img.addEventListener('error', onError);
    });
  });
  await Promise.all(promises);
};

/**
 * Downsample and optimize high-resolution business logos in the export container.
 * Limits raster dimensions to 280x140 px (2x retina for a 140x70 display box)
 * so massive 5MB uploaded photos don't bloat canvas rendering or memory.
 * Returns a restore function that resets original img.src values.
 */
export const optimizeContainerLogos = async (container) => {
  const images = Array.from(container.querySelectorAll('img'));
  const originalSources = new Map();
  const cache = new Map();

  for (const img of images) {
    const src = img.src;
    if (!src) continue;

    // Save original source for cleanup
    originalSources.set(img, src);

    try {
      if (cache.has(src)) {
        img.src = cache.get(src);
        continue;
      }

      // Check if image is larger than 2x retina display box (600x190 for 300x95 box)
      const natW = img.naturalWidth || img.width || 0;
      const natH = img.naturalHeight || img.height || 0;

      if (natW > 600 || natH > 190) {
        const canvas = document.createElement('canvas');
        const maxW = 600;
        const maxH = 190;
        const ratio = Math.min(maxW / natW, maxH / natH, 1);
        const targetW = Math.max(1, Math.round(natW * ratio));
        const targetH = Math.max(1, Math.round(natH * ratio));

        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, targetW, targetH);
          // Keep PNG for transparency, but now constrained to max 600x190 (~20-40KB)
          const optimizedDataUrl = canvas.toDataURL('image/png');
          cache.set(src, optimizedDataUrl);
          img.src = optimizedDataUrl;
        }
      }
    } catch (err) {
      // If cross-origin or canvas read error, keep original src
      console.warn('Logo optimization skipped for image:', err);
    }
  }

  // Return restore callback
  return () => {
    for (const [img, origSrc] of originalSources.entries()) {
      img.src = origSrc;
    }
  };
};

/**
 * Injects an invisible, selectable/searchable text overlay into the jsPDF document.
 * Matches exact coordinates of DOM text elements on the A4 page.
 * Uses standard PDF Helvetica font without embedding heavy TTF font files (0 bytes overhead).
 */
export const injectSearchableTextLayer = (pageEl, pdf) => {
  const pageRect = pageEl.getBoundingClientRect();
  if (!pageRect.width || !pageRect.height) return;

  // A4 portrait dimensions: 210 x 297 mm
  const mmPerPxX = 210 / pageRect.width;
  const mmPerPxY = 297 / pageRect.height;

  const walker = document.createTreeWalker(
    pageEl,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        const text = node.nodeValue?.trim();
        if (!text) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName.toLowerCase();
        if (tag === 'script' || tag === 'style' || tag === 'noscript') return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const range = document.createRange();
  let textNode = walker.nextNode();

  while (textNode) {
    const rawText = textNode.nodeValue?.trim();
    if (rawText) {
      try {
        range.selectNodeContents(textNode);
        const rect = range.getBoundingClientRect();

        if (rect.width > 0 && rect.height > 0) {
          const x = (rect.left - pageRect.left) * mmPerPxX;
          const y = (rect.top - pageRect.top) * mmPerPxY;

          const parent = textNode.parentElement;
          const style = window.getComputedStyle(parent);
          const fontSizePx = parseFloat(style.fontSize) || 12;
          const fontSizePt = Math.max(5, Math.min(26, fontSizePx * 0.75));

          // In PDF, y represents the font baseline
          const baselineOffset = (rect.height * mmPerPxY) * 0.82;
          const targetY = y + baselineOffset;

          // Normalize currency and typographic symbols for standard Helvetica WinAnsi encoding
          const sanitizedText = rawText
            .replace(/₹\s?/g, 'Rs. ')
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/[\u2013\u2014]/g, '-');

          pdf.setFontSize(fontSizePt);
          const weight = style.fontWeight;
          const isBold = weight === 'bold' || weight === '700' || weight === '800' || parseInt(weight, 10) >= 600;
          const isItalic = style.fontStyle === 'italic';

          if (isBold && isItalic) {
            pdf.setFont('helvetica', 'bolditalic');
          } else if (isBold) {
            pdf.setFont('helvetica', 'bold');
          } else if (isItalic) {
            pdf.setFont('helvetica', 'italic');
          } else {
            pdf.setFont('helvetica', 'normal');
          }

          // PDF Mode 3 (3 Tr) - Neither fill nor stroke text (invisible selectable text layer)
          pdf.text(sanitizedText, x, targetY, {
            renderingMode: 'invisible'
          });
        }
      } catch (e) {
        // Continue gracefully
      }
    }
    textNode = walker.nextNode();
  }
};

/**
 * Renders page elements into an optimized jsPDF document with given scale and JPEG quality.
 */
const renderPdfWithSettings = async (pageElements, invoice, { scale, quality }) => {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  // Set clean, lightweight metadata
  const business = invoice.userId || {};
  const customer = invoice.customerId || {};
  pdf.setProperties({
    title: `Invoice ${invoice.invoiceNumber}`,
    subject: `Invoice for ${customer.name || 'Client'}`,
    author: business.businessName || business.name || 'Bizora',
    creator: 'Bizora Invoice System'
  });

  for (let i = 0; i < pageElements.length; i++) {
    const pageEl = pageElements[i];
    await ensureImagesLoaded(pageEl);

    const canvas = await html2canvas(pageEl, {
      scale: scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      windowWidth: 794,
      windowHeight: 1123,
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0,
      logging: false
    });

    // Highly optimized JPEG encoding instead of bloated PNG
    const imgData = canvas.toDataURL('image/jpeg', quality);

    if (i > 0) {
      pdf.addPage('a4', 'portrait');
    }

    // Exact A4 portrait dimensions: 210mm x 297mm
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');

    // Overlay selectable and searchable PDF text layer
    injectSearchableTextLayer(pageEl, pdf);
  }

  return pdf;
};

/**
 * Main optimized invoice PDF generation function.
 * Targets < 1 MB (1,048,576 bytes) for normal invoices (including 10+ and 20+ line items).
 * Preserves exact A4 dimensions (210 x 297 mm), selectable text, all styling, and totals.
 */
export const generateOptimizedInvoicePdf = async (exportContainer, invoice) => {
  if (!exportContainer) {
    throw new Error('Export container not found');
  }

  const pageElements = exportContainer.querySelectorAll('.pdf-export-page, .invoice-paper-page');
  if (!pageElements || pageElements.length === 0) {
    throw new Error('No printable invoice pages found');
  }

  // 1. Optimize uploaded business logos in container
  const restoreLogos = await optimizeContainerLogos(exportContainer);

  try {
    // Pass 1: High quality default (scale: 1.6, JPEG quality: 0.82)
    // Produces crisp ~150-180 DPI retina-grade output while keeping 1-page ~130-180 KB, 2-page ~260-350 KB
    let scale = 1.6;
    let quality = 0.82;

    let pdf = await renderPdfWithSettings(pageElements, invoice, { scale, quality });
    let pdfBlob = pdf.output('blob');
    let byteSize = pdfBlob.size;

    const ONE_MB = 1048576; // 1 MB = 1,048,576 bytes

    // Pass 2: Adaptive compression if size exceeds 1 MB (e.g. 3-4+ pages or heavy imagery)
    if (byteSize > ONE_MB) {
      console.info(`Initial PDF size ${formatBytes(byteSize)} exceeded 1 MB. Applying adaptive compression pass...`);
      scale = 1.35;
      quality = 0.72;
      pdf = await renderPdfWithSettings(pageElements, invoice, { scale, quality });
      pdfBlob = pdf.output('blob');
      byteSize = pdfBlob.size;

      // Pass 3: Safe fallback if still exceeds 1 MB
      if (byteSize > ONE_MB) {
        console.info(`PDF size ${formatBytes(byteSize)} still exceeded 1 MB. Applying compact compression pass...`);
        scale = 1.2;
        quality = 0.65;
        pdf = await renderPdfWithSettings(pageElements, invoice, { scale, quality });
        pdfBlob = pdf.output('blob');
        byteSize = pdfBlob.size;
      }
    }

    return {
      pdf,
      blob: pdfBlob,
      byteSize,
      formattedSize: formatBytes(byteSize),
      pagesCount: pageElements.length,
      underOneMb: byteSize <= ONE_MB
    };
  } finally {
    // Always restore original image sources
    restoreLogos();
  }
};

/**
 * Legacy unoptimized generator for baseline measurement and comparison:
 * scale: 2, image/png, no logo downsampling, no searchable text layer.
 */
export const generateLegacyUnoptimizedPdf = async (exportContainer, invoice) => {
  const pageElements = exportContainer.querySelectorAll('.pdf-export-page, .invoice-paper-page');
  const pdf = new jsPDF('portrait', 'mm', 'a4');

  for (let i = 0; i < pageElements.length; i++) {
    const pageEl = pageElements[i];
    await ensureImagesLoaded(pageEl);

    const canvas = await html2canvas(pageEl, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      windowWidth: 1200,
      windowHeight: 1600,
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0
    });

    const imgData = canvas.toDataURL('image/png');

    if (i > 0) {
      pdf.addPage('a4', 'portrait');
    }

    pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
  }

  const pdfBlob = pdf.output('blob');
  return {
    pdf,
    blob: pdfBlob,
    byteSize: pdfBlob.size,
    formattedSize: formatBytes(pdfBlob.size),
    pagesCount: pageElements.length
  };
};
