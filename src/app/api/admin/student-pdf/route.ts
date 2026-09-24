import { NextRequest, NextResponse } from 'next/server';

async function getPuppeteer() {
  const puppeteer = await import('puppeteer');
  return puppeteer.default;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('id') || '';
  const stream = searchParams.get('stream') || '';
  const secret = searchParams.get('secret') || '';

  if (secret !== (process.env.PDF_SECRET || 'gurukul-pdf-2025')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!studentId) {
    return NextResponse.json({ error: 'id param required' }, { status: 400 });
  }

  try {
    const puppeteer = await getPuppeteer();
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage();
    // 210mm x 148mm ratio at 96 DPI
    await page.setViewport({ width: 794, height: 559, deviceScaleFactor: 1 });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const baseUrlObj = new URL(baseUrl);
    const cookieHeader = request.headers.get('cookie') || '';

    if (cookieHeader) {
      const cookies = cookieHeader.split(';').map(c => {
        const [name, ...rest] = c.trim().split('=');
        return { name: name.trim(), value: rest.join('=').trim(), domain: baseUrlObj.hostname };
      });
      if (cookies.length > 0) await page.setCookie(...cookies);
    }

    const printUrl = stream 
      ? `${baseUrl}/admin/bulk-print?stream=${encodeURIComponent(stream)}&pdf=1&studentId=${studentId}`
      : `${baseUrl}/result`;

    await page.goto(printUrl, { waitUntil: 'networkidle0', timeout: 60000 });
    await page.waitForSelector('.marksheet-wrapper, #marksheet', { timeout: 15000 });

    // Inject CSS to fit 210mm x 148mm with 0 gap
    await page.addStyleTag({
      content: `
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box !important; }
        html, body { width: 210mm !important; height: 148mm !important; margin: 0 !important; padding: 0 !important; background: white !important; overflow: hidden !important; }
        .no-print { display: none !important; }
        .marksheet-wrapper, #marksheet { 
          width: 210mm !important;
          height: 148mm !important;
          overflow: hidden !important;
          page-break-inside: avoid !important;
          display: block !important;
          box-shadow: none !important; 
          margin: 0 !important; 
          padding: 0 !important; 
        }
        @page { size: 210mm 148mm; margin: 0; }
      `
    });

    const pdfBuffer = await page.pdf({
      width: '210mm',
      height: '148mm',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
      pageRanges: '1',
    });

    await browser.close();

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="marksheet-${studentId}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error('Student PDF error:', err);
    return NextResponse.json({ error: 'PDF generation failed', details: err.message }, { status: 500 });
  }
}
