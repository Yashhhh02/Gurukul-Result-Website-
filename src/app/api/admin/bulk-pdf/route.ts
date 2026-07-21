import { NextRequest, NextResponse } from 'next/server';

async function getPuppeteer() {
  const puppeteer = await import('puppeteer');
  return puppeteer.default;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const stream = searchParams.get('stream') || '';
  const secret = searchParams.get('secret') || '';

  if (secret !== (process.env.PDF_SECRET || 'gurukul-pdf-2025')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!stream) {
    return NextResponse.json({ error: 'stream param required' }, { status: 400 });
  }

  try {
    const puppeteer = await getPuppeteer();
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });

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

    const printUrl = `${baseUrl}/admin/bulk-print?stream=${encodeURIComponent(stream)}&pdf=1`;
    await page.goto(printUrl, { waitUntil: 'networkidle0', timeout: 180000 });
    await page.waitForSelector('.marksheet-wrapper', { timeout: 30000 });
    await new Promise(r => setTimeout(r, 1500));

    // Inject print CSS to ensure each marksheet fits exactly one A4 page
    await page.addStyleTag({
      content: `
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box !important; }
        body { margin: 0 !important; padding: 0 !important; background: white !important; }
        .marksheet-wrapper {
          width: 210mm !important;
          height: 296mm !important;
          overflow: hidden !important;
          page-break-inside: avoid !important;
          page-break-after: always !important;
          break-after: page !important;
          display: block !important;
          box-shadow: none !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        .marksheet-wrapper:last-child {
          page-break-after: avoid !important;
          break-after: avoid !important;
        }
        .no-print { display: none !important; }
      `
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
    });

    await browser.close();

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="marksheets-${stream}-${new Date().toISOString().slice(0, 10)}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
      },
    });
  } catch (err: any) {
    console.error('PDF generation error:', err);
    return NextResponse.json({ error: 'PDF generation failed', details: err.message }, { status: 500 });
  }
}
