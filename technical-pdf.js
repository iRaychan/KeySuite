/* Prepare the existing technical report and hand it to the browser's print dialog. */
(() => {
  'use strict';
  const reserved = new WeakMap();
  const reportUrl = new URL('pump-pdf-report.html', document.currentScript.src).href;

  // Reserve the popup during a button click when the selector receives its
  // export request asynchronously through postMessage.
  function reserve(source) {
    const existing = reserved.get(source);
    if (existing && !existing.closed) return true;
    const report = window.open(reportUrl, '_blank');
    if (!report) {
      window.alert('Allow pop-ups for KeySuite, then click PDF again.');
      return false;
    }
    reserved.set(source, report);
    setTimeout(() => {
      if (reserved.get(source) !== report) return;
      reserved.delete(source);
      if (!report.closed) report.close();
    }, 30000);
    return true;
  }

  function openReport(source, html, filename, title) {
    const names = window.KeySuitePumpPdfNames;
    const ticket = names?.ticket?.(filename);
    const pending = reserved.get(source);
    reserved.delete(source);
    if (names && /^Item\s+\d+\s*-/i.test(filename) && !ticket) {
      pending?.close();
      source.alert('The PDF Item No. changed. Please try again.');
      return;
    }
    const sourceUrl = new URL(source.location.href);
    const printInPlace = source === window && sourceUrl.searchParams.get('autoPdf') === '1';
    const report = printInPlace ? source : pending && !pending.closed ? pending : window.open(reportUrl, '_blank');
    if (!report) {
      source.alert('Allow pop-ups for KeySuite, then click PDF again.');
      return;
    }
    const brand = window.KeySuiteSelectorBrand;
    const chc = /\/selector(?:-g1)?\//i.test(sourceUrl.pathname);
    const printTitle = String(filename || title || 'Pump').replace(/\.pdf$/i, '');
    let initialPrint = true;
    let printing = false;
    const lockTitle = () => { report.document.title = printTitle; };

    async function requestPrint(nativePrint, restoreAnimation) {
      if (printing || report.closed) return;
      printing = true;
      try {
        if (initialPrint) {
          if (chc) brand?.applyReport?.(report.document, source);
          await report.__KEYSUITE_PDF_BRAND_READY__;
          await report.document.fonts?.ready;
          report.addEventListener('beforeprint', lockTitle);
          initialPrint = false;
          // Browsers expose neither the Save outcome nor whether Print was canceled.
          names?.commit?.(filename, ticket);
        }
        restoreAnimation();
        lockTitle();
        report.focus();
        nativePrint();
      } catch (error) {
        report.alert('Unable to open the print dialog: ' + error.message);
      } finally {
        printing = false;
      }
    }

    function writeReport() {
      try {
        if (brand) html = brand.transformReportHtml(html, source).replaceAll('<\\/script>', '</script>');
        // The selector already has the optimizer. Reuse it and avoid blocking
        // the report parser on a second copy of the same script.
        const optimizer = printInPlace ? null : source.KeySuitePdfOptimization || window.KeySuitePdfOptimization;
        if (optimizer) html = html.replace(/<script\s+src="[^"]*\/pdf-optimization\.js[^"]*"\s*><\/script>/gi, '');
        const base = sourceUrl.href.replace(/[&"]/g, c => c === '&' ? '&amp;' : '&quot;');
        const prefix = '<base href="' + base + '">' +
          '<style>@media print{#keysuiteReportPrint{display:none!important}}' +
          '@media screen{#keysuiteReportPrint{position:fixed;top:8px;right:8px;z-index:10000}}</style>' +
          '<script>{const printNative=window.print.bind(window);' +
          'const animate=window.requestAnimationFrame.bind(window);' +
          // Print tabs may start in the background where animation frames pause.
          'window.requestAnimationFrame=callback=>setTimeout(()=>callback(performance.now()),16);' +
          'window.print=()=>window.__KEYSUITE_REQUEST_PRINT__(printNative,()=>{window.requestAnimationFrame=animate;});}</script>';
        const button = '<button id="keysuiteReportPrint" type="button" hidden onclick="window.print()">Print / Save as PDF</button>';
        const setup = '<script>{const prepare=window.onload;let started=false;const deadline=Date.now()+30000;' +
          'const run=()=>{if(started)return;if(document.readyState!=="complete"){if(Date.now()<deadline)setTimeout(run,50);return;}started=true;' +
          'Promise.resolve().then(()=>prepare?.call(window)).catch(error=>alert("Unable to prepare the PDF report: "+error.message));};' +
          'window.onload=run;setTimeout(run,0);}</script>';
        const doc = report.document;
        if (!printInPlace) report.opener = source;
        doc.open();
        if (optimizer) report.KeySuitePdfOptimization = optimizer;
        report.__KEYSUITE_REQUEST_PRINT__ = (nativePrint, restoreAnimation) => {
          report.document.getElementById('keysuiteReportPrint')?.removeAttribute('hidden');
          return requestPrint(nativePrint, restoreAnimation);
        };
        doc.write(html.replace(/<head\b[^>]*>/i, head => head + prefix)
          .replace(/<\/body>/i, button + setup + '</body>'));
        doc.close();
      } catch (error) {
        if (!printInPlace) report.close();
        source.alert('Unable to prepare the PDF report: ' + error.message);
      }
    }
    if (printInPlace) {
      writeReport();
      return;
    }
    const deadline = Date.now() + 20000;
    function waitForReportHost() {
      if (report.closed) return;
      if (report.location.href === reportUrl && report.document.readyState === 'complete') {
        writeReport();
      } else if (Date.now() < deadline) {
        setTimeout(waitForReportHost, 50);
      } else {
        report.close();
        source.alert('Unable to open the technical report. Please try again.');
      }
    }
    waitForReportHost();
  }

  window.KeySuiteTechnicalPdf = {openReport, reserve};
})();
