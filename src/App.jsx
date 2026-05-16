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
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#7F77DD", letterSpacing: 1.2, marginBottom: 6 }}>Active page</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#26215C" }}>{activePage}</div>
            <div style={{ fontSize: 12, color: "#888" }}>{pageCount} pages</div>
          </div>
          <span style={{ padding: "8px 12px", borderRadius: 12, background: "#EEEDFE", color: "#534AB7", fontSize: 11, fontWeight: 700 }}>Page</span>
        </div>
      </div>

      <div className="actions">
        {modules.map((item) => (
          <button key={item.id} onClick={() => onAction(item.id)} disabled={busy} className={`btn ${item.buttonClass}`}>
            {item.label} page
          </button>
        ))}
      </div>

      <div style={{ marginTop: 28, borderTop: "1px solid #f0f2f8", paddingTop: 18 }}>
        <div style={{ fontSize: 12, color: "#999", marginBottom: 10 }}>Save your changes</div>
        <button onClick={onDownload} disabled={busy} className="download-btn">{busy ? "Processing…" : "Download PDF"}</button>
        <p style={{ marginTop: 12, fontSize: 12, color: "#777", lineHeight: 1.5 }}>
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
    <div ref={overlayRef} onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(30,24,60,0.45)", zIndex: 2000,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
        animation: "fadeIn 0.15s ease",
      }}>
      <style>{`
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes slideUp { from { opacity:0; transform:translateY(16px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
      `}</style>
      <div style={{
        background: "#fff", borderRadius: 16, width: "100%", maxWidth: 600,
        boxShadow: "0 24px 64px rgba(0,0,0,0.22)", maxHeight: "calc(100vh - 80px)", overflowY: "auto",
        animation: "slideUp 0.18s ease",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", borderBottom: "0.5px solid #eee", background: item?.bg ?? "#f7f7f7",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: item?.color, display: "flex" }}>{item?.icon}</span>
            <span style={{ fontWeight: 700, fontSize: 15, color: item?.color }}>{item?.label} — Page {pageNum}</span>
          </div>
          <button onClick={onClose} style={{
            border: "none", background: "transparent", cursor: "pointer",
            fontSize: 20, color: "#999", lineHeight: 1, padding: "2px 6px", borderRadius: 6,
          }}>×</button>
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
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#F9F9F7", color: "#bbb", fontSize: 11 }}>…</div>
      )}
      <canvas ref={canvasRef} />
      <div style={{
        textAlign: "center", fontSize: 11, color: "#888", padding: "4px 0 5px",
        background: "#fafaf9", borderTop: "0.5px solid #eee",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
      }}>
        <span>{pageNum}</span>
        <span style={{ color: "#ccc", fontSize: 10, letterSpacing: 2 }}>•••</span>
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
    <div style={{ background: "#fff", borderRadius: 12, padding: 24, border: "0.5px solid #e0dff5", overflowX: "auto", display: "flex", justifyContent: "center" }}>
      <canvas ref={canvasRef} style={{ maxWidth: "100%", display: "block", boxShadow: "0 2px 16px rgba(0,0,0,0.12)", borderRadius: 4 }} />
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
      <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
      <p style={{ fontWeight: 600, fontSize: 18, color: "#3C3489", margin: "0 0 6px" }}>Drop your PDF here</p>
      <p style={{ fontSize: 14, color: "#888", margin: 0 }}>or click to browse · max 50 MB</p>
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
    <div style={{ minHeight: "100vh", background: "#F7F6F1", fontFamily: "'Georgia', serif" }}>
      <header style={{ background: "#26215C", color: "#fff", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 22, letterSpacing: -0.5, fontWeight: 700 }}>PDFStudio</span>
          <span style={{ background: "#AFA9EC", color: "#26215C", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, letterSpacing: 1, textTransform: "uppercase" }}>Client-Side</span>
        </div>
        {pdfDoc && (
          <button onClick={handleReset} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: 8, padding: "6px 16px", cursor: "pointer", fontSize: 13 }}>
            ✕ Close file
          </button>
        )}
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        {!pdfDoc ? (
          <div style={{ maxWidth: 520, margin: "60px auto" }}>
            <h1 style={{ textAlign: "center", color: "#26215C", fontSize: 28, marginBottom: 8 }}>Open a PDF to get started</h1>
            <p style={{ textAlign: "center", color: "#888", marginBottom: 32, fontSize: 15 }}>Files are processed entirely in your browser — never uploaded to any server.</p>
            {!pdfjsReady && <p style={{ textAlign: "center", color: "#AFA9EC", marginBottom: 16, fontSize: 13 }}>Loading PDF engine…</p>}
            <DropZone onFile={loadFile} isDragging={isDragging} setDragging={setDragging} />
            {error && <div style={{ marginTop: 16, background: "#FCEBEB", border: "1px solid #F09595", color: "#A32D2D", borderRadius: 8, padding: "10px 16px", fontSize: 14 }}>⚠ {error}</div>}
            {loading && <p style={{ textAlign: "center", color: "#7F77DD", marginTop: 20 }}>Parsing PDF…</p>}
          </div>
        ) : (
          <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
            <aside style={{ width: 180, flexShrink: 0, background: "#EEEDFE", borderRadius: 14, padding: 12, maxHeight: "calc(100vh - 120px)", overflowY: "auto" }}>
              <div style={{ fontSize: 11, color: "#7F77DD", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 }}>{pageCount} pages</div>
              <p style={{ fontSize: 10, color: "#AFA9EC", margin: "0 0 10px", lineHeight: 1.5 }}>Click any page for options</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {Array.from({ length: pageCount }, (_, i) => (
                  <PageCanvas key={i + 1} pdfDoc={pdfDoc} pageNum={i + 1} scale={0.35} isActive={activePage === i + 1}
                    onSelect={() => handleThumbnailClick(i + 1)} />
                ))}
              </div>
            </aside>

            <section style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, background: "#fff", borderRadius: 10, padding: "10px 16px", border: "0.5px solid #e0dff5" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <span style={{ fontSize: 20 }}>📄</span>
                    <span style={{ fontWeight: 600, color: "#26215C", fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fileName}</span>
                    {loading && (
                      <span style={{ marginLeft: 10, fontSize: 12, color: "#7F77DD", background: "#F4F3FF", padding: "4px 8px", borderRadius: 8 }}>Loading…</span>
                    )}
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button disabled={activePage <= 1} onClick={() => setActivePage(p => p - 1)}
                    style={{ border: "1px solid #ccc", background: "transparent", borderRadius: 6, padding: "4px 12px", fontSize: 16, cursor: activePage <= 1 ? "not-allowed" : "pointer", opacity: activePage <= 1 ? 0.4 : 1 }}>‹</button>
                  <span style={{ fontSize: 13, color: "#555", padding: "4px 8px" }}>{activePage} / {pageCount}</span>
                  <button disabled={activePage >= pageCount} onClick={() => setActivePage(p => p + 1)}
                    style={{ border: "1px solid #ccc", background: "transparent", borderRadius: 6, padding: "4px 12px", fontSize: 16, cursor: activePage >= pageCount ? "not-allowed" : "pointer", opacity: activePage >= pageCount ? 0.4 : 1 }}>›</button>
                </div>
              </div>
              <MainViewer pdfDoc={pdfDoc} activePage={activePage} />
              <p style={{ fontSize: 12, color: "#aaa", textAlign: "center", marginTop: 14 }}>
                Click any thumbnail on the left to select a page, then use the sidebar.
              </p>
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
