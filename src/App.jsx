import { useState, useRef, useEffect, useCallback } from "react";
import { MODULES } from "./modules";
import "./styles.css";

const PDFJS_CDN = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

function usePdfJs() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (window.pdfjsLib) { setReady(true); return; }
    const script = document.createElement("script");
    script.src = PDFJS_CDN;
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      setReady(true);
    };
    document.head.appendChild(script);
  }, []);
  return ready;
}

function validatePdf(file) {
  if (file.type !== "application/pdf") return "Only PDF files are accepted.";
  if (file.size > 50 * 1024 * 1024) return "File must be under 50 MB.";
  return null;
}
async function checkMagicBytes(file) {
  const buf = await file.slice(0, 4).arrayBuffer();
  const b = new Uint8Array(buf);
  return b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46;
}

function ActionSidebar({ modules, fileName, activePage, pageCount, onAction, onDownload, busy }) {
  return (
    <aside className="action-sidebar">
      <div className="active-meta">
        <div className="meta-label">Active page</div>
        <div className="meta-row">
          <div>
            <div className="meta-number">{activePage}</div>
            <div className="meta-sub">{pageCount} pages</div>
          </div>
        </div>
      </div>

      <div className="actions">
        {modules.map((item) => (
          <button key={item.id} onClick={() => onAction(item.id)} disabled={busy} className={`btn ${item.buttonClass}`}>
            {item.label} page
          </button>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="footer-label">Save your changes</div>
        <button onClick={onDownload} disabled={busy} className="download-btn">{busy ? "Processing…" : "Download PDF"}</button>
        <p className="footer-note">
          Edits are applied locally in the browser and downloaded as a fresh PDF.
        </p>
      </div>
    </aside>
  );
}

function OperationModal({ operation, pageNum, pageCount, pdfDoc, onConfirm, onClose }) {
  const overlayRef = useRef(null);
  useEffect(() => {
    function handleKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const item = MODULES.find((m) => m.id === operation);
  const ModuleComponent = item?.Component;
  const handleConfirm = (data) => { onConfirm(operation, data); onClose(); };

  return (
    <div ref={overlayRef} onClick={(e) => { if (e.target === overlayRef.current) onClose(); }} className="operation-modal-overlay">
      <div className="operation-modal">
        <div className="header">
          <div className="modal-title-row">
            <span className="modal-icon">{item?.icon}</span>
            <span className="modal-title">{item?.label} — Page {pageNum}</span>
          </div>
          <button onClick={onClose} className="modal-close-btn">×</button>
        </div>
        {ModuleComponent ? (
          <ModuleComponent pageNum={pageNum} pageCount={pageCount} pdfDoc={pdfDoc} onConfirm={handleConfirm} onCancel={onClose} />
        ) : null}
      </div>
    </div>
  );
}

function PageCanvas({ pdfDoc, pageNum, scale = 0.35, isActive, onSelect }) {
  const canvasRef = useRef(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    let cancelled = false;
    pdfDoc.getPage(pageNum).then((page) => {
      if (cancelled) return;
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = viewport.width; canvas.height = viewport.height;
      page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise.then(() => {
        if (!cancelled) setRendered(true);
      });
    });
    return () => { cancelled = true; };
  }, [pdfDoc, pageNum, scale]);

  const handleClick = (e) => {
    e.stopPropagation();
    onSelect(pageNum);
  };

  return (
    <div id={`thumb-${pageNum}`} title={`Page ${pageNum} — click to select`} onClick={handleClick} className={`thumbnail ${isActive ? 'active' : ''}`}>
      {!rendered && (
        <div className="thumbnail-loading">…</div>
      )}
      <canvas ref={canvasRef} />
      <div className="thumbnail-footer">
        <span>{pageNum}</span>
        <span className="dots">•••</span>
      </div>
    </div>
  );
}

function MainViewer({ pdfDoc, activePage }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    let cancelled = false;
    pdfDoc.getPage(activePage).then((page) => {
      if (cancelled) return;
      const viewport = page.getViewport({ scale: 1.8 });
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = viewport.width; canvas.height = viewport.height;
      page.render({ canvasContext: canvas.getContext("2d"), viewport });
    });
    return () => { cancelled = true; };
  }, [pdfDoc, activePage]);

  return (
    <div className="main-viewer">
      <canvas ref={canvasRef} className="main-canvas" />
    </div>
  );
}

function DropZone({ onFile, isDragging, setDragging }) {
  const inputRef = useRef(null);
  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer?.files?.[0]; if (file) onFile(file);
  }, [onFile, setDragging]);

  return (
    <div onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={handleDrop} onClick={() => inputRef.current?.click()}
      className={`drop-zone ${isDragging ? 'dragging' : ''}`}>
      <input ref={inputRef} type="file" accept="application/pdf" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      <p className="drop-title">Drop your PDF here</p>
      <p className="drop-hint">or click to browse · max 50 MB</p>
    </div>
  );
}

export default function App() {
  const pdfjsReady = usePdfJs();
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pdfBytes, setPdfBytes] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [activePage, setActivePage] = useState(1);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDragging, setDragging] = useState(false);
  const [modal, setModal] = useState(null);

  const updatePdfState = useCallback(async (bytes, page = 1) => {
    setLoading(true);
    try {
      // pdf.js may transfer an ArrayBuffer to its worker and detach it from
      // the main thread. Use a copy when handing bytes to pdf.js so the
      // original `bytes` remains usable by pdf-lib and our state.
      let dataForPdfJs;
      if (bytes instanceof ArrayBuffer) dataForPdfJs = bytes.slice(0);
      else if (ArrayBuffer.isView(bytes)) dataForPdfJs = bytes.slice(0);
      else dataForPdfJs = bytes;

      const doc = await window.pdfjsLib.getDocument({ data: dataForPdfJs }).promise;
      setPdfDoc(doc);
      setPageCount(doc.numPages);
      setActivePage(Math.min(page, doc.numPages));
      setPdfBytes(bytes);
    } catch {
      setError("Failed to parse PDF. The file may be corrupted or encrypted.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFile = useCallback(async (file) => {
    setError("");
    const typeErr = validatePdf(file); if (typeErr) { setError(typeErr); return; }
    const valid = await checkMagicBytes(file); if (!valid) { setError("File does not appear to be a valid PDF."); return; }
    if (!pdfjsReady) { setError("PDF engine not ready yet, please try again."); return; }
    try {
      const buffer = await file.arrayBuffer();
      await updatePdfState(buffer, 1);
      setFileName(file.name);
    } catch {
      setError("Failed to parse PDF. The file may be corrupted or encrypted.");
    }
  }, [pdfjsReady, updatePdfState]);

  const handleThumbnailClick = (pageNum) => {
    setActivePage(pageNum);
  };

  useEffect(() => {
    if (!pdfDoc) return;
    const el = document.getElementById(`thumb-${activePage}`);
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }
  }, [activePage, pdfDoc]);

  const handleSidebarAction = (operation) => {
    setModal({ operation, pageNum: activePage });
  };

  const handleReset = () => {
    setPdfDoc(null); setPdfBytes(null); setPageCount(0); setActivePage(1);
    setFileName(""); setError(""); setModal(null);
  };

  const downloadPdf = () => {
    if (!pdfBytes) return;
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName ? fileName.replace(/\.pdf$/i, "-edited.pdf") : "edited.pdf";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const handleOperationConfirm = async (operation, data) => {
    if (!pdfBytes) return;
    setLoading(true);
    try {
      const currentModule = MODULES.find((m) => m.id === operation);
      if (!currentModule) {
        setError("Operation not found.");
        return;
      }
      const updatedBytes = await currentModule.apply(pdfBytes, data);
      await updatePdfState(updatedBytes, operation === "delete" ? Math.max(1, activePage - 1) : activePage);
    } catch (err) {
      console.error(err);
      setError("Unable to apply edits. Please try again.");
    } finally {
      setLoading(false);
      setModal(null);
    }
  };

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="brand">
          <span className="brand-title">PDFStudio</span>
        </div>
        {!pdfDoc ? (
          <a className="btn" href="https://phamquangbach.github.io/" rel="noopener noreferrer">Main Site</a>
        ) : (
          <button onClick={handleReset} className="btn-close-file">✕ Close file</button>
        )}
      </header>

      <main className="app-main">
        {!pdfDoc ? (
          <div className="empty-state">
            <h1 className="empty-title">Open a PDF to get started</h1>
            <p className="empty-sub">Files are processed entirely in your browser — never uploaded to any server.</p>
            {!pdfjsReady && <p className="empty-loading">Loading PDF engine…</p>}
            <DropZone onFile={loadFile} isDragging={isDragging} setDragging={setDragging} />
            {error && <div className="error-box">⚠ {error}</div>}
            {loading && <p className="parsing">Parsing PDF…</p>}
          </div>
        ) : (
          <div className="workspace">
            <aside className="thumbs-aside">
              <div className="title">{pageCount} pages</div>
              <p className="thumbs-hint">Click any page for options</p>
              <div className="thumbs-list">
                {Array.from({ length: pageCount }, (_, i) => (
                  <PageCanvas key={i + 1} pdfDoc={pdfDoc} pageNum={i + 1} scale={0.35} isActive={activePage === i + 1}
                    onSelect={() => handleThumbnailClick(i + 1)} />
                ))}
              </div>
            </aside>

            <section className="viewer-section">
              <div className="file-toolbar">
                <div className="file-info">
                    <span className="file-name">{fileName}</span>
                    {loading && (
                      <span className="file-loading">Loading…</span>
                    )}
                </div>
                <div className="nav-controls">
                  <button className="btn-small" disabled={activePage <= 1} onClick={() => setActivePage(p => p - 1)}>‹</button>
                  <span className="page-indicator">{activePage} / {pageCount}</span>
                  <button className="btn-small" disabled={activePage >= pageCount} onClick={() => setActivePage(p => p + 1)}>›</button>
                </div>
              </div>
              <MainViewer pdfDoc={pdfDoc} activePage={activePage} />
              <p className="viewer-hint">Click any thumbnail on the left to select a page, then use the sidebar.</p>
            </section>
            <ActionSidebar modules={MODULES} fileName={fileName} activePage={activePage} pageCount={pageCount}
              onAction={handleSidebarAction} onDownload={downloadPdf} busy={loading} />
          </div>
        )}
      </main>

      {modal && (
        <OperationModal operation={modal.operation} pageNum={modal.pageNum}
          pageCount={pageCount} pdfDoc={pdfDoc} onConfirm={handleOperationConfirm} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
