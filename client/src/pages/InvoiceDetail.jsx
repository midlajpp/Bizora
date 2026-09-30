import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  Printer,
  Download,
  Share2,
  Edit,
  Plus,
  Ban,
  Trash2,
  ArrowLeft
} from 'lucide-react';
import { getLogoUrl } from '../utils/logoUrl';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const InvoiceDetail = () => {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cash Modal
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [payNote, setPayNote] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Confirmations
  const [isCancelConfirm, setIsCancelConfirm] = useState(false);
  const [isDeleteConfirm, setIsDeleteConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // DOM Refs & Pagination
  const invoicePaperRef = useRef(null);
  const pdfPaperRef = useRef(null);
  const wrapperRef = useRef(null);
  const measuringRef = useRef(null);
  const page1HeaderRef = useRef(null);
  const page2HeaderRef = useRef(null);
  const tableHeaderRef = useRef(null);
  const itemRefs = useRef([]);
  const totalsFooterRef = useRef(null);

  const [pages, setPages] = useState([]);
  const [paperScale, setPaperScale] = useState(1);
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get(`/invoices/${id}`);
      if (res.data.success) {
        setInvoice(res.data.data);
      }
    } catch (err) {
      showToast('Failed to load invoice details', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Dynamic Pagination Height Calculation
  const computePagination = () => {
    if (!invoice || !invoice.items || invoice.items.length === 0) return;

    // 297mm in pixels at 96dpi = 1122.52px
    // 15mm top + 15mm bottom padding = 113.4px
    // Usable page height = ~1009.1px
    // Safety usable height = 980px to guarantee zero overflow
    const TARGET_USABLE_HEIGHT = 980;

    const p1HeaderH = page1HeaderRef.current?.offsetHeight || 260;
    const p2HeaderH = page2HeaderRef.current?.offsetHeight || 55;
    const tblHeaderH = tableHeaderRef.current?.offsetHeight || 40;
    const totalsH = totalsFooterRef.current?.offsetHeight || 220;

    const items = invoice.items || [];
    const itemHeights = items.map((_, idx) => itemRefs.current[idx]?.offsetHeight || 45);

    const calculatedPages = [];
    let currentItemIdx = 0;
    let isPage1 = true;

    while (currentItemIdx < items.length) {
      const headerH = isPage1 ? p1HeaderH : p2HeaderH;
      const availHeight = TARGET_USABLE_HEIGHT - headerH - tblHeaderH;

      let pageItems = [];
      let currentItemsHeight = 0;
      let showTotals = false;

      while (currentItemIdx < items.length) {
        const itemH = itemHeights[currentItemIdx];
        const isLastItem = currentItemIdx === items.length - 1;

        if (isLastItem) {
          // Check if both item and totals fit on this page
          if (currentItemsHeight + itemH + totalsH <= availHeight) {
            pageItems.push(items[currentItemIdx]);
            currentItemsHeight += itemH;
            showTotals = true;
            currentItemIdx++;
            break;
          } else {
            // If page already has items, reserve next page for item + totals
            if (pageItems.length > 0) {
              break;
            } else {
              // First item on this page, but item + totals won't fit together
              pageItems.push(items[currentItemIdx]);
              currentItemsHeight += itemH;
              showTotals = false;
              currentItemIdx++;
              break;
            }
          }
        } else {
          // Not last item
          if (currentItemsHeight + itemH <= availHeight) {
            pageItems.push(items[currentItemIdx]);
            currentItemsHeight += itemH;
            currentItemIdx++;
          } else {
            if (pageItems.length === 0) {
              // Force place single large item if first on page
              pageItems.push(items[currentItemIdx]);
              currentItemsHeight += itemH;
              currentItemIdx++;
            }
            break;
          }
        }
      }

      calculatedPages.push({
        pageNumber: calculatedPages.length + 1,
        isPage1: isPage1,
        items: pageItems,
        showTotalsAndFooter: showTotals
      });

      isPage1 = false;
    }

    // If totals & footer didn't fit on the last page with items, create dedicated final page
    const lastPage = calculatedPages[calculatedPages.length - 1];
    if (lastPage && !lastPage.showTotalsAndFooter) {
      calculatedPages.push({
        pageNumber: calculatedPages.length + 1,
        isPage1: false,
        items: [],
        showTotalsAndFooter: true
      });
    }

    setPages(calculatedPages);
  };

  useLayoutEffect(() => {
    if (invoice) {
      computePagination();
    }
  }, [invoice]);

  useEffect(() => {
    if (!invoice) return;

    const handleResize = () => {
      computePagination();

      if (wrapperRef.current) {
        const availableWidth = wrapperRef.current.clientWidth - 32;
        const a4WidthPx = 793.708;
        if (availableWidth < a4WidthPx) {
          setPaperScale(availableWidth / a4WidthPx);
        } else {
          setPaperScale(1);
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [invoice, pages.length]);

  const handlePrint = () => {
    window.print();
  };

  const ensureImagesLoaded = async (element) => {
    const images = element.querySelectorAll('img');
    const promises = Array.from(images).map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    });
    await Promise.all(promises);
  };

  const handleDownloadPDF = async () => {
    // Capture from unscaled pdfPaperRef to guarantee mobile PDF is identical to desktop PDF
    const exportContainer = pdfPaperRef.current || invoicePaperRef.current;
    if (!exportContainer) return;

    try {
      showToast('Generating print-ready A4 PDF document...', 'info');
      
      const pageElements = exportContainer.querySelectorAll('.pdf-export-page, .invoice-paper-page');
      if (!pageElements || pageElements.length === 0) return;

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

        // Exact A4 dimensions: 210mm x 297mm
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
      }

      pdf.save(`${invoice.invoiceNumber}.pdf`);
      showToast('A4 PDF downloaded successfully!', 'success');
    } catch (err) {
      console.error('PDF Generation Error:', err);
      showToast('Failed to generate A4 PDF', 'error');
    }
  };

  const handleShare = async () => {
    const text = `Invoice ${invoice.invoiceNumber} for ${invoice.customerId?.name}: Total ${formatCurrency(invoice.total)}, Pending Cash: ${formatCurrency(invoice.pendingAmount)}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invoice ${invoice.invoiceNumber}`,
          text: text,
          url: window.location.href
        });
      } catch (err) {
        // User cancelled share
      }
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast('Invoice summary copied to clipboard!', 'success');
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!payAmount) return;

    try {
      setIsSubmittingPayment(true);
      const res = await axiosClient.post('/payments', {
        invoiceId: invoice._id,
        amount: Number(payAmount),
        paymentDate: payDate,
        note: payNote
      });

      showToast(res.data.message || 'Cash received recorded successfully!', 'success');
      setIsPayModalOpen(false);
      fetchInvoice();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to record cash received', 'error');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleCancelInvoice = async () => {
    try {
      setIsProcessing(true);
      const res = await axiosClient.patch(`/invoices/${invoice._id}/cancel`);
      showToast(res.data.message || 'Invoice cancelled', 'success');
      setIsCancelConfirm(false);
      fetchInvoice();
    } catch (err) {
      showToast('Failed to cancel invoice', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteInvoice = async () => {
    try {
      setIsProcessing(true);
      await axiosClient.delete(`/invoices/${invoice._id}`);
      showToast('Invoice deleted', 'success');
      navigate('/invoices');
    } catch (err) {
      showToast('Failed to delete invoice', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amt) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amt || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return <LoadingSpinner fullPage text="Rendering invoice document..." />;
  }

  if (!invoice) {
    return (
      <div className="page-container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <h2>Invoice Not Found</h2>
        <Link to="/invoices" className="btn btn-outline" style={{ marginTop: '1rem' }}>
          <ArrowLeft size={16} /> Back to Invoices
        </Link>
      </div>
    );
  }

  const business = invoice.userId || {};
  const customer = invoice.customerId || {};

  let badgeClass = 'badge-pending';
  if (invoice.paymentStatus === 'Paid') badgeClass = 'badge-paid';
  if (invoice.paymentStatus === 'Partially Paid') badgeClass = 'badge-partially';
  if (invoice.paymentStatus === 'Cancelled') badgeClass = 'badge-cancelled';

  const activePages = pages.length > 0 ? pages : [
    { pageNumber: 1, isPage1: true, items: invoice.items || [], showTotalsAndFooter: true }
  ];

  // Helper to render an individual A4 invoice page
  const renderA4Page = (pg, pageIdx, totalPages, isExport = false) => {
    return (
      <div
        key={pageIdx}
        className={isExport ? "pdf-export-page" : "invoice-paper-page"}
        style={{
          width: '210mm',
          height: '297mm',
          boxSizing: 'border-box',
          padding: '15mm',
          backgroundColor: '#ffffff',
          color: '#0f172a',
          borderRadius: isExport ? '0' : '4px',
          boxShadow: isExport ? 'none' : '0 10px 25px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative'
        }}
      >
        <div>
          {/* Top Header: Page 1 vs Continuation Page */}
          {pg.isPage1 ? (
            <>
              {/* Page 1 Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #e2e8f0', paddingBottom: '1.5rem', marginBottom: '1.5rem', gap: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
                  {business.businessLogo && (
                    <div style={{ maxWidth: '140px', maxHeight: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <img
                        src={getLogoUrl(business.businessLogo)}
                        alt={business.businessName || 'Business Logo'}
                        crossOrigin="anonymous"
                        style={{ maxWidth: '140px', maxHeight: '70px', objectFit: 'contain', display: 'block' }}
                      />
                    </div>
                  )}
                  <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
                      {business.businessName || business.name || 'BIZORA'}
                    </h1>
                    <div style={{ fontSize: '0.875rem', color: '#475569', marginTop: '0.25rem', lineHeight: 1.4 }}>
                      {business.businessAddress && <div>{business.businessAddress}</div>}
                      {business.businessPhone && <div>Phone: {business.businessPhone}</div>}
                      {business.businessEmail && <div>Email: {business.businessEmail}</div>}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>INVOICE</h2>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginTop: '0.25rem' }}>
                    {invoice.invoiceNumber}
                  </div>
                  <div style={{ marginTop: '0.5rem' }}>
                    <span className={`badge ${badgeClass}`} style={{ fontSize: '0.8125rem', padding: '0.35rem 0.875rem' }}>
                      {invoice.paymentStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bill To & Dates Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '1.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>
                    Billed To:
                  </span>
                  <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', marginTop: '0.25rem' }}>
                    {customer.name || 'Client'}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.4, marginTop: '0.25rem' }}>
                    {customer.address && <div>{customer.address}</div>}
                    {customer.phone && <div>Phone: {customer.phone}</div>}
                    {customer.email && <div>Email: {customer.email}</div>}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end', fontSize: '0.875rem' }}>
                  <div>
                    <span style={{ color: '#64748b', marginRight: '8px' }}>Invoice Date:</span>
                    <strong style={{ color: '#0f172a' }}>{formatDate(invoice.invoiceDate)}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', marginRight: '8px' }}>Due Date:</span>
                    <strong style={{ color: '#0f172a' }}>{formatDate(invoice.dueDate)}</strong>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Page 2+ Compact Header */
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {business.businessLogo && (
                  <img
                    src={getLogoUrl(business.businessLogo)}
                    alt=""
                    crossOrigin="anonymous"
                    style={{ maxHeight: '30px', maxWidth: '80px', objectFit: 'contain' }}
                  />
                )}
                <span style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a' }}>
                  {business.businessName || business.name || 'BIZORA'}
                </span>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.875rem', color: '#475569' }}>
                <strong style={{ color: '#0f172a' }}>Invoice #{invoice.invoiceNumber}</strong> • Continued (Page {pg.pageNumber} of {totalPages})
              </div>
            </div>
          )}

          {/* Repeated Table Header & Items */}
          <div style={{ marginBottom: '1.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#334155' }}>Service / Item</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#334155', width: '60px' }}>Qty</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#334155', width: '100px' }}>Rate</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#334155', width: '110px' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {pg.items.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.875rem 1rem', color: '#0f172a' }}>
                      <div style={{ fontWeight: 700 }}>{item.serviceName}</div>
                      {item.description && (
                        <div style={{ fontSize: '0.8125rem', color: '#64748b', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                          {item.description}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'center', color: '#334155', width: '60px' }}>{item.qty}</td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right', color: '#334155', width: '100px' }}>{formatCurrency(item.rate)}</td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontWeight: 700, color: '#0f172a', width: '110px' }}>{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Section of Page */}
        <div>
          {pg.showTotalsAndFooter ? (
            /* Final Page Totals + Footer */
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'nowrap', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ maxWidth: '380px', flex: 1 }}>
                  {invoice.notes && (
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>
                        Notes & Terms:
                      </span>
                      <p style={{ fontSize: '0.8125rem', color: '#475569', marginTop: '0.25rem', fontStyle: 'italic', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                        {invoice.notes}
                      </p>
                    </div>
                  )}
                </div>

                <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9375rem', flexShrink: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                    <span>Subtotal:</span>
                    <span>{formatCurrency(invoice.subtotal)}</span>
                  </div>

                  {invoice.discount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#d97706' }}>
                      <span>Discount:</span>
                      <span>- {formatCurrency(invoice.discount)}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', borderTop: '2px solid #cbd5e1', paddingTop: '0.5rem' }}>
                    <span>Grand Total:</span>
                    <span>{formatCurrency(invoice.total)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669', fontWeight: 600 }}>
                    <span>Cash Received:</span>
                    <span>{formatCurrency(invoice.paidAmount)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: invoice.pendingAmount > 0 ? '#dc2626' : '#475569', fontWeight: 700 }}>
                    <span>Pending Cash:</span>
                    <span>{formatCurrency(invoice.pendingAmount)}</span>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
                <span>Generated via Bizora Invoice & Cash Management System • Thank you for your business!</span>
                <span>Page {pg.pageNumber} of {totalPages}</span>
              </div>
            </div>
          ) : (
            /* Interim Page Footer */
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
              <span>Invoice #{invoice.invoiceNumber} • Continued on next page</span>
              <span>Page {pg.pageNumber} of {totalPages}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="page-container">
      {/* Top Action Toolbar */}
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <Link to="/invoices" className="btn btn-outline btn-sm">
          <ArrowLeft size={16} /> All Invoices
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-sm" onClick={handlePrint}>
            <Printer size={16} /> Print
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleDownloadPDF}>
            <Download size={16} /> Download PDF
          </button>
          <button className="btn btn-outline btn-sm" onClick={handleShare}>
            <Share2 size={16} /> Share
          </button>
          <Link to={`/invoices/${invoice._id}/edit`} className="btn btn-outline btn-sm">
            <Edit size={16} /> Edit
          </Link>

          {invoice.paymentStatus !== 'Paid' && invoice.paymentStatus !== 'Cancelled' && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setPayAmount(invoice.pendingAmount);
                setPayDate(new Date().toISOString().split('T')[0]);
                setIsPayModalOpen(true);
              }}
            >
              <Plus size={16} /> Record Cash
            </button>
          )}

          {invoice.paymentStatus !== 'Cancelled' && (
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setIsCancelConfirm(true)}
              style={{ color: 'var(--warning)', borderColor: 'rgba(245, 158, 11, 0.4)' }}
            >
              <Ban size={16} /> Cancel
            </button>
          )}

          <button className="btn btn-danger btn-sm" onClick={() => setIsDeleteConfirm(true)}>
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </div>

      {/* OFF-SCREEN DOM MEASUREMENT CONTAINER */}
      <div
        ref={measuringRef}
        style={{
          position: 'absolute',
          top: '-9999px',
          left: '-9999px',
          width: '793.7px',
          visibility: 'hidden',
          pointerEvents: 'none',
          boxSizing: 'border-box',
          padding: '56.7px'
        }}
      >
        {/* 1. Page 1 Header + Billed To */}
        <div ref={page1HeaderRef}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #e2e8f0', paddingBottom: '1.5rem', marginBottom: '1.5rem', gap: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
              {business.businessLogo && (
                <div style={{ maxWidth: '140px', maxHeight: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <img
                    src={getLogoUrl(business.businessLogo)}
                    alt=""
                    onLoad={computePagination}
                    style={{ maxWidth: '140px', maxHeight: '70px', objectFit: 'contain', display: 'block' }}
                  />
                </div>
              )}
              <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
                  {business.businessName || business.name || 'BIZORA'}
                </h1>
                <div style={{ fontSize: '0.875rem', color: '#475569', marginTop: '0.25rem', lineHeight: 1.4 }}>
                  {business.businessAddress && <div>{business.businessAddress}</div>}
                  {business.businessPhone && <div>Phone: {business.businessPhone}</div>}
                  {business.businessEmail && <div>Email: {business.businessEmail}</div>}
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>INVOICE</h2>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginTop: '0.25rem' }}>
                {invoice.invoiceNumber}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '1.5rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>
                Billed To:
              </span>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', marginTop: '0.25rem' }}>
                {customer.name || 'Client'}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.4, marginTop: '0.25rem' }}>
                {customer.address && <div>{customer.address}</div>}
                {customer.phone && <div>Phone: {customer.phone}</div>}
                {customer.email && <div>Email: {customer.email}</div>}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end', fontSize: '0.875rem' }}>
              <div>
                <span style={{ color: '#64748b', marginRight: '8px' }}>Invoice Date:</span>
                <strong style={{ color: '#0f172a' }}>{formatDate(invoice.invoiceDate)}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', marginRight: '8px' }}>Due Date:</span>
                <strong style={{ color: '#0f172a' }}>{formatDate(invoice.dueDate)}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Page 2+ Continuation Header */}
        <div ref={page2HeaderRef} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {business.businessLogo && (
              <img src={getLogoUrl(business.businessLogo)} alt="" style={{ maxHeight: '30px', maxWidth: '80px', objectFit: 'contain' }} />
            )}
            <span style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a' }}>
              {business.businessName || business.name || 'BIZORA'}
            </span>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.875rem', color: '#475569' }}>
            <strong style={{ color: '#0f172a' }}>Invoice #{invoice.invoiceNumber}</strong> • Continued
          </div>
        </div>

        {/* 3. Table Header */}
        <div ref={tableHeaderRef}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#334155' }}>Service / Item</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#334155', width: '60px' }}>Qty</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#334155', width: '100px' }}>Rate</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#334155', width: '110px' }}>Amount</th>
              </tr>
            </thead>
          </table>
        </div>

        {/* 4. Item Rows */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <tbody>
            {invoice.items?.map((item, idx) => (
              <tr
                key={idx}
                ref={(el) => (itemRefs.current[idx] = el)}
                style={{ borderBottom: '1px solid #e2e8f0' }}
              >
                <td style={{ padding: '0.875rem 1rem', color: '#0f172a' }}>
                  <div style={{ fontWeight: 700 }}>{item.serviceName}</div>
                  {item.description && (
                    <div style={{ fontSize: '0.8125rem', color: '#64748b', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                      {item.description}
                    </div>
                  )}
                </td>
                <td style={{ padding: '0.875rem 1rem', textAlign: 'center', color: '#334155', width: '60px' }}>{item.qty}</td>
                <td style={{ padding: '0.875rem 1rem', textAlign: 'right', color: '#334155', width: '100px' }}>{formatCurrency(item.rate)}</td>
                <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontWeight: 700, color: '#0f172a', width: '110px' }}>{formatCurrency(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 5. Totals & Footer Block */}
        <div ref={totalsFooterRef} style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'nowrap', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ maxWidth: '380px', flex: 1 }}>
              {invoice.notes && (
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>
                    Notes & Terms:
                  </span>
                  <p style={{ fontSize: '0.8125rem', color: '#475569', marginTop: '0.25rem', fontStyle: 'italic', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                    {invoice.notes}
                  </p>
                </div>
              )}
            </div>

            <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9375rem', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>Subtotal:</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>

              {invoice.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#d97706' }}>
                  <span>Discount:</span>
                  <span>- {formatCurrency(invoice.discount)}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', borderTop: '2px solid #cbd5e1', paddingTop: '0.5rem' }}>
                <span>Grand Total:</span>
                <span>{formatCurrency(invoice.total)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669', fontWeight: 600 }}>
                <span>Cash Received:</span>
                <span>{formatCurrency(invoice.paidAmount)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: invoice.pendingAmount > 0 ? '#dc2626' : '#475569', fontWeight: 700 }}>
                <span>Pending Cash:</span>
                <span>{formatCurrency(invoice.pendingAmount)}</span>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
            <span>Generated via Bizora Invoice & Cash Management System • Thank you for your business!</span>
          </div>
        </div>
      </div>

      {/* DEDICATED UNSCALED A4 CONTAINER FOR PDF EXPORT (GUARANTEES MOBILE PDF MATCHES DESKTOP PDF PERFECTLY) */}
      <div
        ref={pdfPaperRef}
        className="no-print"
        style={{
          position: 'fixed',
          top: 0,
          left: '-9999px',
          width: '793.708px',
          zIndex: -9999,
          visibility: 'visible',
          pointerEvents: 'none',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, transform: 'none' }}>
          {activePages.map((pg, pageIdx) => renderA4Page(pg, pageIdx, activePages.length, true))}
        </div>
      </div>

      {/* PRINTABLE MULTI-PAGE INVOICE PAPER PREVIEW */}
      <div className="invoice-paper-wrapper" ref={wrapperRef}>
        <div
          className="invoice-paper-scale-container"
          style={{
            height: paperScale < 1 ? `${(activePages.length * 1122.52 + (activePages.length - 1) * 24) * paperScale}px` : 'auto',
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            overflow: 'hidden'
          }}
        >
          <div
            ref={invoicePaperRef}
            className="invoice-paper-pages-container"
            style={{
              transform: paperScale < 1 ? `scale(${paperScale})` : 'none',
              transformOrigin: 'top center',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px'
            }}
          >
            {activePages.map((pg, pageIdx) => renderA4Page(pg, pageIdx, activePages.length, false))}
          </div>
        </div>
      </div>

      {/* Cash Received History for Invoice (No-Print) */}
      <div className="card no-print" style={{ maxWidth: '850px', margin: '0 auto' }}>
        <div className="card-header">
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Cash Received Transactions</h3>
          {invoice.paymentStatus !== 'Paid' && invoice.paymentStatus !== 'Cancelled' && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setPayAmount(invoice.pendingAmount);
                setPayDate(new Date().toISOString().split('T')[0]);
                setIsPayModalOpen(true);
              }}
            >
              <Plus size={14} /> Add Cash Received
            </button>
          )}
        </div>

        {!invoice.payments || invoice.payments.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            No cash received records for this invoice yet.
          </p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Cash Received</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {invoice.payments.map((p) => (
                  <tr key={p._id}>
                    <td>{formatDate(p.paymentDate)}</td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(p.amount)}</td>
                    <td style={{ color: 'var(--text-subtle)' }}>{p.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Cash Modal */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title={`Record Cash Received for ${invoice.invoiceNumber}`}
      >
        <form onSubmit={handleRecordPayment}>
          <div className="form-group">
            <label className="form-label">Cash Received Amount (₹) *</label>
            <input
              type="number"
              min="0.01"
              max={invoice.pendingAmount}
              step="any"
              className="form-input"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Date *</label>
            <input
              type="date"
              className="form-input"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Note / Remark</label>
            <input
              type="text"
              className="form-input"
              value={payNote}
              onChange={(e) => setPayNote(e.target.value)}
              placeholder="e.g. Received in cash"
            />
          </div>

          <div className="modal-footer" style={{ paddingBottom: 0, paddingRight: 0 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsPayModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmittingPayment}>
              {isSubmittingPayment ? 'Saving...' : 'Save Cash Received'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Cancel Confirm */}
      <ConfirmDialog
        isOpen={isCancelConfirm}
        onClose={() => setIsCancelConfirm(false)}
        onConfirm={handleCancelInvoice}
        title="Cancel Invoice"
        message="Are you sure you want to cancel this invoice?"
        isDanger={false}
        isLoading={isProcessing}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={isDeleteConfirm}
        onClose={() => setIsDeleteConfirm(false)}
        onConfirm={handleDeleteInvoice}
        title="Delete Invoice"
        message="Are you sure you want to delete this invoice permanently?"
        isLoading={isProcessing}
      />
    </div>
  );
};

export default InvoiceDetail;
