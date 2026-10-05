import React, { useId, useRef, useState } from 'react';
import { CheckCircle2, Download, FileText, Upload, X } from 'lucide-react';
import { formatFileSize } from '../../utils/formatters';
import { validateFile } from '../../utils/validation';

interface FileDropzoneProps {
  selectedFile: File | null;
  onSelectFile: (file: File | null) => void;
  uploadProgress?: number | null;
  disabled?: boolean;
  label?: string;
  helperText?: string;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  selectedFile,
  onSelectFile,
  uploadProgress,
  disabled = false,
  label = 'Upload Document',
  helperText = 'Supported formats: PDF, DOC, DOCX, PPT, XLS, TXT, ZIP, PNG, JPG · Max 10 MB',
}) => {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processSelectedFile = (file: File | null) => {
    if (!file) return;
    const err = validateFile(file);
    if (err) {
      setLocalError(err);
      onSelectFile(null);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    setLocalError(null);
    onSelectFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    processSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0] || null;
    processSelectedFile(file);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalError(null);
    onSelectFile(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handlePreviewLocalFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedFile) return;
    const objectUrl = URL.createObjectURL(selectedFile);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = selectedFile.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
  };

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="block text-sm font-medium text-slate-800">
        {label}
      </label>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (!disabled && !selectedFile) {
            inputRef.current?.click();
          }
        }}
        className={`border-2 border-dashed rounded-xl p-5 transition-all ${
          disabled
            ? 'bg-slate-50 border-slate-200 opacity-60'
            : selectedFile
            ? 'bg-blue-50/40 border-blue-600'
            : isDragging
            ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-600/20 cursor-pointer'
            : 'bg-slate-50/60 border-slate-300 hover:border-blue-600 cursor-pointer'
        }`}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          disabled={disabled}
          onChange={handleFileChange}
          className="sr-only"
        />

        {!selectedFile ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Click to choose a file or drag and drop here
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{helperText}</p>
              </div>
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Browse Files</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-blue-700 text-white flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 mb-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>File Selected &amp; Ready to Upload</span>
                </div>
                <p className="text-sm font-bold text-slate-900 truncate" title={selectedFile.name}>
                  {selectedFile.name}
                </p>
                <p className="text-xs font-mono text-slate-500 mt-0.5">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>

            {!disabled && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handlePreviewLocalFile}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Verify File</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    inputRef.current?.click();
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  aria-label="Remove selected file"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            )}
          </div>
        )}

        {typeof uploadProgress === 'number' && uploadProgress > 0 && (
          <div className="mt-4 space-y-1">
            <div className="flex items-center justify-between text-xs font-mono text-slate-600">
              <span>Uploading file &quot;{selectedFile?.name}&quot;...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-700 transition-all duration-150"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {localError && (
        <p role="alert" className="text-xs font-medium text-red-700">
          ▲ {localError}
        </p>
      )}
    </div>
  );
};
