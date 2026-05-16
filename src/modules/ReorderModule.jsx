import { useState, useEffect } from "react";
import { PDFDocument } from "pdf-lib";

export const moduleMeta = {
  id: "reorder",
  label: "Reorder",
  description: "Move this page",
  color: "#534AB7",
  bg: "#EEEDFE",
  buttonClass: "btn-primary",
  icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" />
      <polyline points="8 5 3 9 8 13" /><polyline points="16 11 21 15 16 19" />
    </svg>
  ),
};

export async function applyOperation(pdfBytes, { fromPage, toPage }) {
  if (fromPage === toPage) return pdfBytes;
  const doc = await PDFDocument.load(pdfBytes);
  const reorderedDoc = await PDFDocument.create();
  const indices = doc.getPageIndices();
  const sourceIndex = fromPage - 1;
  indices.splice(sourceIndex, 1);
  indices.splice(toPage - 1, 0, sourceIndex);
  const pages = await reorderedDoc.copyPages(doc, indices);
  pages.forEach((page) => reorderedDoc.addPage(page));
  return await reorderedDoc.save();
}

/**
 * ReorderModule
 *
 * Operation: Move a page to a different position in the document.
 *
 * Props:
 *   pageNum    {number}   - The 1-based page number being operated on
 *   pageCount  {number}   - Total number of pages in the document
 *   onConfirm  {function} - Called with { fromPage, toPage } when user confirms
 *   onCancel   {function} - Called when user cancels
 */
export default function ReorderModule({ pageNum, pageCount, onConfirm, onCancel }) {
  const [targetPage, setTargetPage] = useState(pageNum);

  useEffect(() => {
    setTargetPage(pageNum);
  }, [pageNum]);

  const isSame = targetPage === pageNum;

  return (
    <div className="module-wrapper">
      

      <h2 className="module-title">Reorder Page</h2>
      <p className="module-description">Choose a new position for <strong>Page {pageNum}</strong> within the document.</p>

      <div className="reorder-selector">
        <label className="reorder-label" htmlFor="targetPosition">Move to position</label>
        <div className="reorder-controls">
          <button aria-label="Move left" title="Move left" className="arrow-btn" onClick={() => setTargetPage(p => Math.max(1, p - 1))} disabled={targetPage <= 1}>‹</button>
          <select id="targetPosition" value={targetPage} onChange={(e) => setTargetPage(Number(e.target.value))} className="reorder-select"
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") setTargetPage(p => Math.max(1, p - 1));
              if (e.key === "ArrowRight") setTargetPage(p => Math.min(pageCount, p + 1));
            }}
          >
            {Array.from({ length: pageCount }, (_, index) => (
              <option key={index + 1} value={index + 1}>Page {index + 1}</option>
            ))}
          </select>
          <button aria-label="Move right" title="Move right" className="arrow-btn" onClick={() => setTargetPage(p => Math.min(pageCount, p + 1))} disabled={targetPage >= pageCount}>›</button>
        </div>
        <p className="reorder-hint">This will reorder the document so page {pageNum} appears at the selected position.</p>
      </div>

      <div className="module-actions">
        <button className="btn-cancel" onClick={onCancel}>Cancel</button>
        <button className="btn-confirm" disabled={isSame} onClick={() => !isSame && onConfirm({ fromPage: pageNum, toPage: targetPage })}>Apply Order</button>
      </div>
    </div>
  );
}

/* styles moved to src/styles.css */
