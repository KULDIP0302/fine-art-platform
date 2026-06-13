const { PDFDocument, StandardFonts } = require('pdf-lib');

module.exports.generateReceiptPDF = async (order) => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const { height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const fmt = (amount) => `Rs.${Math.round(amount)}`;

  // Header
  page.setFont(font);
  page.setFontSize(20);
  page.drawText('FineArt Platform', { x: 50, y: height - 70 });
  page.setFontSize(16);
  page.drawText('RECEIPT', { x: 50, y: height - 100 });

  // Order Info
  page.setFont(fontRegular);
  page.setFontSize(12);
  page.drawText(`Order ID: #${order._id}`, { x: 50, y: height - 130 });
  page.drawText(`Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`, { x: 50, y: height - 150 });

  const buyer = order.buyer && typeof order.buyer === 'object' ? order.buyer : null;
  const buyerName = buyer?.name || 'Customer';
  const buyerEmail = buyer?.email || '';

  // Customer
  page.setFont(font);
  page.drawText('Customer:', { x: 50, y: height - 180 });
  page.setFont(fontRegular);
  page.drawText(String(buyerName), { x: 50, y: height - 200 });
  page.drawText(String(buyerEmail), { x: 50, y: height - 220 });

  // Items
  let y = height - 260;
  page.setFont(font);
  page.drawText('Items:', { x: 50, y });
  y -= 25;

  page.setFontSize(10);
  page.drawText('ITEM', { x: 50, y });
  page.drawText('QTY x RATE', { x: 300, y });
  page.drawText('TOTAL', { x: 450, y });
  y -= 20;

  const lineItems = Array.isArray(order.items) && order.items.length ? order.items : [];
  let subtotal = 0;

  const artworkTitle = (item) => {
    const aw = item.artwork;
    if (aw && typeof aw === 'object' && aw.title) return String(aw.title).slice(0, 40);
    if (order.artwork && typeof order.artwork === 'object' && order.artwork.title) {
      return String(order.artwork.title).slice(0, 40);
    }
    return 'Artwork';
  };

  if (lineItems.length === 0 && order.artwork) {
    const price = order.subtotalAmount != null ? Math.round(order.subtotalAmount) : (order.totalAmount || 0);
    const qty = 1;
    subtotal = price;
    page.drawText(artworkTitle({ artwork: order.artwork }), { x: 50, y });
    page.drawText(`${qty}x${fmt(price)}`, { x: 300, y });
    page.drawText(`${fmt(price)}`, { x: 450, y });
    y -= 18;
  } else {
    lineItems.forEach((item) => {
      const qty = item.quantity || 1;
      const rate = item.price != null ? item.price : 0;
      const itemTotal = rate * qty;
      subtotal += itemTotal;
      page.drawText(artworkTitle(item), { x: 50, y });
      page.drawText(`${qty}x${fmt(rate)}`, { x: 300, y });
      page.drawText(`${fmt(itemTotal)}`, { x: 450, y });
      y -= 18;
    });
  }

  // Totals
  page.setFontSize(12);
  page.drawText('Subtotal:', { x: 300, y });
  page.drawText(`${fmt(subtotal)}`, { x: 450, y });
  y -= 25;
  const feeFromOrder =
    order.platformFeeAmount != null
      ? Math.round(order.platformFeeAmount)
      : Math.round(subtotal * 0.1);
  page.drawText('Platform Fee:', { x: 300, y });
  page.drawText(`${fmt(feeFromOrder)}`, { x: 450, y });
  y -= 25;
  
  const grand = order.grandTotalAmount ?? order.totalAmount ?? order.total ?? 0;
  page.setFont(font);
  page.drawText('TOTAL:', { x: 300, y });
  page.drawText(`${fmt(grand)}`, { x: 450, y });

  // QR
  const qrData = `Order:${order._id}|Total:${grand}`;
  try {
    page.setFont(fontRegular);
    page.setFontSize(10);
    page.drawText('Verify: ' + qrData, { x: 50, y: y - 30, maxWidth: 500 });
  } catch (e) {}

  // Footer
  page.setFontSize(10);
  page.drawText('Thank you! FineArt Platform', { x: 50, y: 80 });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
};
