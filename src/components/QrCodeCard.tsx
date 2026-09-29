'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Button } from './Button';

export function QrCodeCard({ url, label }: { url: string; label: string }) {
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    QRCode.toDataURL(url, { margin: 2, width: 280 }).then(setDataUrl).catch(console.error);
  }, [url]);

  function download() {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-qr.png`;
    link.click();
  }

  async function copyUrl() {
    await navigator.clipboard.writeText(url);
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
      <h2 className="text-xl font-bold text-ink">QR code</h2>
      <p className="mt-2 text-sm text-slate-600">Use this stable link on slides, Canvas, your syllabus, office door, or email signature.</p>
      <div className="mt-5 grid place-items-center rounded-2xl bg-mist p-4">
        {dataUrl ? <img src={dataUrl} alt={`${label} QR code`} width={280} height={280} /> : <div className="h-[280px] w-[280px] animate-pulse rounded-2xl bg-slate-200" />}
      </div>
      <p className="mt-4 break-all rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">{url}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="button" onClick={download}>Download PNG</Button>
        <Button type="button" variant="secondary" onClick={copyUrl}>Copy URL</Button>
        <Button type="button" variant="secondary" onClick={() => window.print()}>Print</Button>
      </div>
    </div>
  );
}
