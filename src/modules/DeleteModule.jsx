/**
 * DeleteModule
 *
 * Operation: Permanently remove a page from the document.
 *
 * Props:
 *   pageNum    {number}   - The 1-based page number to delete
 *   pageCount  {number}   - Total pages in the document
 *   onConfirm  {function} - Called with { pageNum }
 *   onCancel   {function} - Called when the user cancels
 */
import { PDFDocument } from "pdf-lib";

export const moduleMeta = {
  id: "delete",
  label: "Delete",
  description: "Remove this page",
  color: "#993C1D",
  bg: "#FAECE7",
  buttonClass: "btn-danger",
  icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" /><path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  ),
};

export async function applyOperation(pdfBytes, { pageNum }) {
  const doc = await PDFDocument.load(pdfBytes);
  if (doc.getPageCount() <= 1) {
    return pdfBytes;
  }
  doc.removePage(pageNum - 1);
  return await doc.save();
}

export default function DeleteModule({ pageNum, pageCount, onConfirm, onCancel }) {
  const isOnlyPage = pageCount === 1;

  return (
    <div className="module-wrapper">
  
      <h2 className="module-title">Delete Page</h2>

      {isOnlyPage ? (
        <div className="module-warning">
          <span className="module-warning-icon">⚠</span>
          <p className="module-warning-text">
            This is the only page in the document and cannot be deleted.
          </p>
        </div>
      ) : (
        <>
          <p className="module-description">You are about to permanently remove <strong>Page {pageNum}</strong> from the document.<br />This change is local and will be reflected when you download the PDF.</p>

          <div className="module-preview">
            <div className="module-page-icon">
              <svg width="36" height="44" viewBox="0 0 36 44" fill="none">
                <rect x="1" y="1" width="34" height="42" rx="3" fill="#FFF0ED" stroke="#F09595" strokeWidth="1.5" />
                <line x1="8" y1="14" x2="28" y2="14" stroke="#F09595" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="8" y1="20" x2="28" y2="20" stroke="#F09595" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="8" y1="26" x2="20" y2="26" stroke="#F09595" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p className="module-preview-label">Page {pageNum}</p>
              <p className="module-preview-sub">1 of {pageCount} pages — {pageCount - 1} will remain</p>
            </div>
          </div>
        </>
      )}

      <div className="module-actions">
        <button className="btn sbtn-cancel" onClick={onCancel}>Cancel</button>
        <button className="btn-delete" disabled={isOnlyPage} onClick={() => !isOnlyPage && onConfirm({ pageNum })}>Delete Page</button>
      </div>
    </div>
  );
}

/* styles moved to src/styles.css */
