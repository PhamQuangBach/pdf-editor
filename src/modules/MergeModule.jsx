/**
 * MergeModule
 *
 * Operation: Merge another PDF into the current document.
 *
 * Props:
 *   onConfirm  {function} - Called with { mergePdfBytes, position }
 *   onCancel   {function} - Called when user cancels
 */
import { PDFDocument } from "pdf-lib";
import { useState } from "react";

export const moduleMeta = {
  id: "merge",
  label: "Merge",
  description: "Combine with another PDF",
  color: "#8B5A8D",
  bg: "#F9F6FB",
  buttonClass: "btn-merge",
  icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 19H5c-1 0-2-1-2-2V7c0-1 1-2 2-2h3m8 0h3c1 0 2 1 2 2v10c0 1-1 2-2 2h-3m-10-5h14" />
    </svg>
  ),
};

export async function applyOperation(pdfBytes, { mergePdfBytes, position = "append" }) {
  const currentDoc = await PDFDocument.load(pdfBytes);
  const mergeDoc = await PDFDocument.load(mergePdfBytes);

  const pageIndices = mergeDoc.getPageIndices();
  const copiedPages = await currentDoc.copyPages(mergeDoc, pageIndices);

  copiedPages.forEach((page) => {
    currentDoc.addPage(page);
  });

  return await currentDoc.save();
}

export default function MergeModule({ onConfirm, onCancel }) {
  const [mergePdfFile, setMergePdfFile] = useState(null);
  const [fileError, setFileError] = useState("");

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    setFileError("");
    if (file) {
      if (file.type !== "application/pdf") {
        setFileError("Only PDF files are accepted.");
        setMergePdfFile(null);
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        setFileError("File must be under 50 MB.");
        setMergePdfFile(null);
        return;
      }
      setMergePdfFile(file);
    }
  };

  const handleConfirm = async () => {
    if (!mergePdfFile) {
      setFileError("Please select a PDF to merge");
      return;
    }

    try {
      const mergePdfBytes = await mergePdfFile.arrayBuffer();
      onConfirm({ mergePdfBytes, position: "append" });
    } catch (err) {
      console.error(err);
      setFileError("Failed to read the file");
    }
  };

  return (
    <div className="module-wrapper">
      <h2 className="module-title">Merge PDF</h2>
      <p className="module-description">Select another PDF to merge with the current document.</p>

      <div style={{ width: "100%", marginTop: 16 }}>
        <label style={{ display: "block", marginBottom: 10, fontSize: 14, fontWeight: 600, color: "#26215C" }}>
          Select PDF to merge
        </label>
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileSelect}
          style={{
            display: "block",
            width: "100%",
            padding: "10px 12px",
            border: "1px dashed #C9BBE9",
            borderRadius: 10,
            fontSize: 14,
            cursor: "pointer",
            background: "#FAFAF9",
          }}
        />
      </div>

      {fileError && (
        <div style={{ width: "100%", marginTop: 12, padding: "10px 12px", background: "#FFF8F0", border: "1px solid #FAC775", borderRadius: 8 }}>
          <p style={{ margin: 0, fontSize: 13, color: "#854F0B" }}>⚠ {fileError}</p>
        </div>
      )}

      {mergePdfFile && !fileError && (
        <div style={{ width: "100%", marginTop: 12, padding: "12px 16px", background: "#F4F3FF", border: "1px solid #E6E3FB", borderRadius: 8 }}>
          <p style={{ margin: 0, fontSize: 13, color: "#534AB7", fontWeight: 600 }}>📄 {mergePdfFile.name}</p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#8B7BB8" }}>
            {(mergePdfFile.size / 1024).toFixed(1)} KB
          </p>
        </div>
      )}

      <p style={{ fontSize: 12, color: "#888", marginTop: 16, lineHeight: 1.5 }}>
        The selected PDF will be appended to the end of the current document.
      </p>

      <div className="module-actions">
        <button className="btn-cancel" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn-confirm" disabled={!mergePdfFile || !!fileError} onClick={handleConfirm}>
          Merge PDF
        </button>
      </div>
    </div>
  );
}

/* styles moved to src/styles.css */
