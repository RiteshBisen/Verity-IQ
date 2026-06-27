"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, FileText, AlertCircle, Sparkles } from "lucide-react";

interface FileDropzoneProps {
  onFileDrop: (file: File) => void;
  disabled?: boolean;
}

const ACCEPTED_TYPES = {
  "application/pdf": [".pdf"],
  "text/plain": [".txt"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
};

const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

export default function FileDropzone({
  onFileDrop,
  disabled = false,
}: FileDropzoneProps) {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      setError(null);

      if (rejectedFiles.length > 0) {
        const firstError = rejectedFiles[0].errors[0];
        if (firstError.code === "file-too-large") {
          setError("File exceeds 20MB limit. Please upload a smaller document.");
        } else if (firstError.code === "file-invalid-type") {
          setError("Invalid file type. Please upload a PDF, DOCX, or TXT file.");
        } else {
          setError(firstError.message);
        }
        return;
      }

      if (acceptedFiles.length > 0) {
        onFileDrop(acceptedFiles[0]);
      }
    },
    [onFileDrop]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      accept: ACCEPTED_TYPES,
      maxSize: MAX_SIZE_BYTES,
      multiple: false,
      disabled,
    });

  const borderColor = isDragReject
    ? "border-brutal-red"
    : isDragActive
      ? "border-brutal-blue"
      : "border-black dark:border-white";

  const bgColor = isDragReject
    ? "bg-accent-light"
    : isDragActive
      ? "bg-accent-light"
      : "bg-card hover:bg-accent-light";

  return (
    <div className="w-full max-w-2xl mx-auto h-full flex flex-col">
      <div
        {...(getRootProps() as any)}
        className={`
          relative rounded-3xl border-2 border-dashed cursor-pointer
          transition-all duration-200 ease-in-out
          ${borderColor} ${bgColor}
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          shadow-lg hover:shadow-xl hover:scale-[1.005] active:scale-[0.995]
          group p-6 sm:p-10 flex-1 flex flex-col items-center justify-center
        `}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center justify-center text-center">
          {/* Graphic Icon */}
          <div className="relative mb-6">
            <div className="w-20 h-20 bg-accent-light rounded-2xl flex items-center justify-center transition-all duration-200 shadow-sm group-hover:shadow-md">
              <UploadCloud
                className={`w-10 h-10 transition-colors duration-200 ${
                  isDragActive ? "text-brutal-blue" : "text-foreground group-hover:text-brutal-blue"
                }`}
              />
            </div>
            {/* Geometric star indicator badge */}
            <div className="absolute -top-2.5 -right-2.5 w-7 h-7 bg-brutal-yellow/15 border border-brutal-yellow rounded-full flex items-center justify-center shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-brutal-yellow fill-brutal-yellow/20" />
            </div>
          </div>

          {/* Prompt Messages */}
          {isDragActive ? (
            <div className="space-y-1">
              <p className="text-xl font-display font-black uppercase tracking-tight text-brutal-blue">
                Release File
              </p>
              <p className="text-xs font-mono-custom text-muted uppercase font-black">
                Let Gemini read this content
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xl font-display font-black uppercase tracking-tight">
                Drop Study Material Here
              </p>
              <p className="text-sm font-display text-muted font-bold">
                or <span className="text-brutal-red font-black underline underline-offset-4">browse files</span> from your computer
              </p>
            </div>
          )}

          {/* Supported formats */}
          <div className="flex gap-3 mt-8 flex-wrap justify-center max-w-sm">
            {["PDF", "TXT", "DOCX"].map((fmt) => (
              <span
                key={fmt}
                className="inline-flex items-center gap-2 px-4 py-2 border border-border bg-card text-xs text-foreground font-mono-custom font-bold rounded-full shadow-sm hover:bg-accent-light transition-all"
              >
                <FileText className="w-4 h-4 shrink-0 text-brutal-blue" />
                {fmt}
              </span>
            ))}
          </div>
          <p className="text-xs font-mono-custom text-muted mt-6 uppercase tracking-widest font-black">
            Max 20MB Document limit
          </p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-6 flex items-center gap-3 text-brutal-red border border-border bg-accent-light px-5 py-3 font-display font-bold text-sm rounded-xl shadow-md">
          <AlertCircle className="w-6 h-6 shrink-0 text-brutal-red" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
