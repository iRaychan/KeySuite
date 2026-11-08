/* One-click technical reports. Product and Selection share the native print renderer. */
(() => {
  'use strict';
  const root = new URL('.', document.currentScript.src);
  let running = false;
  function namesFor(source) {
    try { return source.top.KeySuitePumpPdfNames; } catch (_) { return null; }
  }
  function reportEndpoint() {
    return new URL('api/technical-pdf', root);
  }
  function readDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }
  async function capture(report,signal) {
    const doc = report.document;
    await report.__KEYSUITE_PDF_BRAND_READY__;
    await doc.fonts?.ready;
    const copy = doc.documentElement.cloneNode(true);
    copy.querySelectorAll('script,base,link,iframe,object,embed,meta[http-equiv]').forEach(node => node.remove());
    const images = [...doc.querySelectorAll('img,svg image')];
    const copies = [...copy.querySelectorAll('img,svg image')];
    await Promise.all(images.map(async (img, index) => {
      const url = img.currentSrc || img.getAttribute('src') || img.getAttribute('href') || img.getAttribute('xlink:href');
      if (!url) return;
      const absolute = new URL(url, doc.baseURI);
      let data = absolute.href;
      if (absolute.protocol !== 'data:') {
        const response = await fetch(absolute,{signal});
        if (!response.ok) throw new Error('A technical report image could not load.');
        data = await readDataUrl(await response.blob());
      }
      const target = copies[index];
      if (img.localName === 'image') {
        target.removeAttribute('xlink:href');
        target.setAttribute('href', data);
      } else {
        target.removeAttribute('srcset');
        target.setAttribute('src', data);
      }
    }));
    return '<!doctype html>' + copy.outerHTML;
  }
  function openReport(source, html, filename, title) {
    if (running) return;
    const names = namesFor(source), ticket = names?.ticket?.(filename);
    if (names && /^Item\s+\d+\s*-/i.test(filename) && !ticket) {
      source.alert('The PDF Item No. changed. Please try again.');
      return;
    }
    const brand = window.KeySuiteSelectorBrand;
    const chc = /\/selector(?:-g1)?\//i.test(source.location.pathname);
    if (brand) html = brand.transformReportHtml(html,source).replaceAll('<\\/script>', '</script>');
    running = true;
    const iframe = document.createElement('iframe');
    iframe.title = 'Technical report';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText = 'position:fixed;left:0;top:0;width:1280px;height:1000px;border:0;opacity:0;pointer-events:none';
    const frameUrl = new URL('pump-pdf-report.html', root);
    let captured = false;
    let finished = false;
    const deadline = setTimeout(() => finish(new Error('The report did not become ready.')), 30000);
    function finish(error) {
      if (finished) return;
      finished = true;
      clearTimeout(deadline);
      iframe.remove();
      running = false;
      if (error) source.alert('PDF generation failed: ' + error.message);
    }
    iframe.onload = () => {
      const report = iframe.contentWindow;
      if (!report || report.location.href !== frameUrl.href) return;
      iframe.onload = null;
      const take = async () => {
        if (captured) return;
        captured = true;
        clearTimeout(deadline);
        try {
          const signal = AbortSignal.timeout(45000);
          if (chc) brand?.applyReport?.(report.document,source);
          const printable = await capture(report,signal);
          const response = await fetch(reportEndpoint(), {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({html:printable,title:title || report.document.title}),
            signal,
          });
          if (!response.ok || !/^application\/pdf\b/i.test(response.headers.get('Content-Type') || '')) {
            throw new Error('The technical PDF renderer is unavailable.');
          }
          const blob = await response.blob();
          if (await blob.slice(0, 5).text() !== '%PDF-') throw new Error('The renderer returned an invalid PDF.');
          const fresh = names?.ticket?.(filename);
          if (ticket && (!fresh || JSON.stringify(ticket)!==JSON.stringify(fresh))) {
            throw new Error('The PDF Item No. changed during export. Please try again.');
          }
          const url = URL.createObjectURL(blob);
          const link = source.document.createElement('a');
          link.href = url;
          link.download = String(filename || 'Pump').replace(/\.pdf$/i, '') + '.pdf';
          source.document.body.appendChild(link);
          link.click();
          link.remove();
          names?.commit?.(filename, ticket);
          setTimeout(() => URL.revokeObjectURL(url), 30000);
          finish();
        } catch (error) { finish(error); }
      };
      try {
        const prefix = '<base href="' + source.location.href.replace(/[&"]/g, c=>c==='&'?'&amp;':'&quot;') + '">' +
          '<script>window.print=()=>parent.KeySuiteTechnicalPdf.captureFrame(window);' +
          'window.requestAnimationFrame=callback=>setTimeout(()=>callback(performance.now()),16);<\/script>';
        activeCapture.set(report,take);
        report.opener = source;
        report.document.open();
        report.document.write(html.replace(/<head\b[^>]*>/i, head => head + prefix));
        report.document.close();
        // A document written during an iframe's load does not consistently
        // receive a second load event. Run the existing setup after its assets
        // finish, once, without relying on a new window's navigation lifecycle.
        const runSetup = async () => {
          if (captured || !iframe.isConnected) return;
          if (report.document.readyState!=='complete' || typeof report.onload!=='function') {
            setTimeout(runSetup,30);
            return;
          }
          const setup=report.onload;
          report.onload=null;
          try { await setup.call(report); } catch (error) { finish(error); }
        };
        setTimeout(runSetup,0);
      } catch (error) { finish(error); }
    };
    iframe.src = frameUrl.href;
    document.body.appendChild(iframe);
  }
  const activeCapture = new WeakMap();
  window.KeySuiteTechnicalPdf = {openReport,captureFrame:report => activeCapture.get(report)?.()};
})();
