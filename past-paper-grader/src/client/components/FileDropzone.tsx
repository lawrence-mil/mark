import { useCallback, useState, type DragEvent } from "react";

interface FileDropzoneProps {
  onFiles?: (files: File[]) => void;
  onFile?: (file: File) => void;
  accept?: string;
  label: string;
  sublabel?: string;
  disabled?: boolean;
  uploading?: boolean;
  multiple?: boolean;
}

const VALID_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "text/plain",
];

export function FileDropzone({
  onFiles,
  onFile,
  label,
  sublabel,
  disabled,
  uploading,
  multiple = false,
}: FileDropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateAndEmit = useCallback(
    (fileList: FileList | File[]) => {
      setError(null);
      const filesArray = Array.from(fileList);
      
      if (filesArray.length === 0) return;
      if (!multiple && filesArray.length > 1) {
        setError("Please upload only one file.");
        return;
      }

      const validFiles: File[] = [];
      
      for (const file of filesArray) {
        if (!VALID_TYPES.includes(file.type)) {
          setError(`Invalid file type for ${file.name}. Supported: PDF, PNG, JPG, TXT`);
          return;
        }
        if (file.size > 50 * 1024 * 1024) {
          setError(`File ${file.name} is too large. Maximum size is 50MB.`);
          return;
        }
        validFiles.push(file);
      }

      if (multiple && onFiles) {
        onFiles(validFiles);
      } else if (onFile) {
        onFile(validFiles[0]);
      }
    },
    [multiple, onFiles, onFile]
  );

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        validateAndEmit(e.dataTransfer.files);
      }
    },
    [validateAndEmit]
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleClick = useCallback(() => {
    if (disabled || uploading) return;
    const input = document.createElement("input");
    input.type = "file";
    if (multiple) input.multiple = true;
    input.accept = ".pdf,.png,.jpg,.jpeg,.txt";
    input.onchange = () => {
      if (input.files && input.files.length > 0) {
        validateAndEmit(input.files);
      }
    };
    input.click();
  }, [disabled, uploading, multiple, validateAndEmit]);

  return (
    <div className="w-full">
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`card card-dash cursor-pointer border-2 transition-all duration-200 ${
          disabled || uploading
            ? "pointer-events-none opacity-40"
            : dragOver
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-base-content/20 hover:border-primary/50 hover:bg-primary/5"
        }`}
      >
        <div className="card-body items-center py-12 text-center">
          {uploading ? (
            <>
              <span className="loading loading-dots loading-lg text-primary" />
              <p className="text-sm opacity-60">Uploading...</p>
            </>
          ) : (
            <>
              <div className="text-4xl opacity-30 mb-2">
                {dragOver ? "[ DROP ]" : "[ + ]"}
              </div>
              <p className="text-sm font-semibold">{label}</p>
              {sublabel && (
                <p className="text-xs opacity-50">{sublabel}</p>
              )}
              <p className="text-xs opacity-30 mt-2">
                PDF, PNG, JPG, TXT &mdash; max 50MB {multiple && "(Multiple files supported)"}
              </p>
            </>
          )}
        </div>
      </div>
      {error && (
        <div className="mt-2 text-xs text-error">
          &gt; ERROR: {error}
        </div>
      )}
    </div>
  );
}
