import { useEffect, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";

export const moduleMeta = {
  id: "crop",
  label: "Crop",
  description: "Trim page area",
  color: "#0F6E56",
  bg: "#E1F5EE",
  buttonClass: "btn-success",
  icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 2 6 8 2 8" /><polyline points="18 22 18 16 22 16" />
      <path d="M2 8h16a2 2 0 0 1 2 2v10" /><path d="M6 2v10a2 2 0 0 0 2 2h10" />
    </svg>
  ),
};

export async function applyOperation(pdfBytes, { pageNum, cropPercent, applyAll = false }) {
  const doc = await PDFDocument.load(pdfBytes);
  if (applyAll) {
    const total = doc.getPageCount();
    for (let i = 0; i < total; i++) {
      const p = doc.getPage(i);
      const w = p.getWidth();
      const h = p.getHeight();
      const left = w * (cropPercent.left / 100);
      const right = w * (cropPercent.right / 100);
      const top = h * (cropPercent.top / 100);
      const bottom = h * (cropPercent.bottom / 100);
      const cropWidth = Math.max(1, w - left - right);
      const cropHeight = Math.max(1, h - top - bottom);
      p.setCropBox(left, bottom, cropWidth, cropHeight);
    }
    return await doc.save();
  }
  const page = doc.getPage(pageNum - 1);
  const width = page.getWidth();
  const height = page.getHeight();
  const left = width * (cropPercent.left / 100);
  const right = width * (cropPercent.right / 100);
  const top = height * (cropPercent.top / 100);
  const bottom = height * (cropPercent.bottom / 100);
  const cropWidth = Math.max(1, width - left - right);
  const cropHeight = Math.max(1, height - top - bottom);
  page.setCropBox(left, bottom, cropWidth, cropHeight);
  return await doc.save();
}

/**
 * CropModule
 *
 * Operation: Crop a page by defining a rectangular region to keep.
 *
 * Props:
 *   pageNum    {number}   - The 1-based page number being operated on
 *   pdfDoc     {object}   - The pdfjs document object (for rendering preview canvas)
 *   onConfirm  {function} - Called with { pageNum, cropPercent }
 *   onCancel   {function} - Called when user cancels
 */
export default function CropModule({ pageNum, pdfDoc, onConfirm, onCancel }) {
  const [cropPercent, setCropPercent] = useState({ left: 0, top: 0, right: 0, bottom: 0 });
  const [applyAll, setApplyAll] = useState(false);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const canvasRef = useRef(null);

  useEffect(() => {
    setCropPercent({ left: 0, top: 0, right: 0, bottom: 0 });
  }, [pageNum]);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    let cancelled = false;
    pdfDoc.getPage(pageNum).then((page) => {
      if (cancelled) return;
      const viewport = page.getViewport({ scale: 1.65 });
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = viewport.width; canvas.height = viewport.height;
      page.render({ canvasContext: canvas.getContext("2d"), viewport });
      setPageSize({ width: Math.round(viewport.width), height: Math.round(viewport.height) });
    });
    return () => { cancelled = true; };
  }, [pdfDoc, pageNum]);

  const updatePercent = (field) => (event) => {
    const raw = parseFloat(event.target.value);
    const num = Number.isFinite(raw) ? raw : 0;
    const value = Math.max(0, Math.min(100, num));
    setCropPercent((prev) => ({ ...prev, [field]: value }));
  };

  const isValid = cropPercent.left + cropPercent.right < 100 && cropPercent.top + cropPercent.bottom < 100;

  return (
    <div className="module-wrapper">
      

      <h2 className="module-title">Crop Page</h2>
      <p className="module-description">Define how much of <strong>Page {pageNum}</strong> should remain visible.</p>

      <div className="crop-preview-row">
        <div className="crop-canvas-wrapper" style={{ position: "relative" }}>
          <canvas ref={canvasRef} className="crop-canvas" />
          <div className="crop-overlay" aria-hidden>
            <div className="crop-mask crop-mask-top" style={{ height: `${cropPercent.top}%` }} />
            <div className="crop-mask crop-mask-left" style={{ top: `${cropPercent.top}%`, height: `${100 - cropPercent.top - cropPercent.bottom}%`, width: `${cropPercent.left}%` }} />
            <div className="crop-mask crop-mask-right" style={{ top: `${cropPercent.top}%`, height: `${100 - cropPercent.top - cropPercent.bottom}%`, width: `${cropPercent.right}%`, right: 0 }} />
            <div className="crop-mask crop-mask-bottom" style={{ height: `${cropPercent.bottom}%` }} />
            <div className="crop-area" style={{ top: `${cropPercent.top}%`, left: `${cropPercent.left}%`, width: `${100 - cropPercent.left - cropPercent.right}%`, height: `${100 - cropPercent.top - cropPercent.bottom}%` }} />
          </div>
        </div>
        <div className="crop-form">
          <div className="crop-field-row">
            <label className="crop-field-label">Top</label>
            <input value={cropPercent.top} onChange={updatePercent("top")} min={0} max={99.9} step="1" inputMode="decimal" type="number" className="crop-field-input" />
            <span className="crop-field-suffix">%</span>
          </div>
          <div className="crop-field-row">
            <label className="crop-field-label">Bottom</label>
            <input value={cropPercent.bottom} onChange={updatePercent("bottom")} min={0} max={99.9} step="1" inputMode="decimal" type="number" className="crop-field-input" />
            <span className="crop-field-suffix">%</span>
          </div>
          <div className="crop-field-row">
            <label className="crop-field-label">Left</label>
            <input value={cropPercent.left} onChange={updatePercent("left")} min={0} max={99.9} step="1" inputMode="decimal" type="number" className="crop-field-input" />
            <span className="crop-field-suffix">%</span>
          </div>
          <div className="crop-field-row">
            <label className="crop-field-label">Right</label>
            <input value={cropPercent.right} onChange={updatePercent("right")} min={0} max={99.9} step="1" inputMode="decimal" type="number" className="crop-field-input" />
            <span className="crop-field-suffix">%</span>
          </div>
          {!isValid && (
            <p className="crop-help-text">Crop margins cannot exceed the full page size.</p>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <input id="applyAll" type="checkbox" checked={applyAll} onChange={(e) => setApplyAll(e.target.checked)} />
            <label htmlFor="applyAll" style={{ fontSize: 13, color: "#3A675E" }}>Apply this crop to all pages</label>
          </div>
        </div>
      </div>

      <div className="module-actions">
        <button className="btn-cancel" onClick={onCancel}>Cancel</button>
        <button className="btn-confirm" disabled={!isValid} onClick={() => onConfirm({ pageNum, cropPercent, applyAll })}>Apply Crop</button>
      </div>
    </div>
  );
}

/* styles moved to src/styles.css */
