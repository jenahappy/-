import React, { useState, useRef } from "react";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";

interface CsvUploaderProps {
  onDataLoaded: (csvText: string, fileName: string) => void;
}

export default function CsvUploader({ onDataLoaded }: CsvUploaderProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const processFile = (file: File) => {
    if (!file) return;
    
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      setError("CSV 형식의 파일만 지원합니다.");
      setFileName(null);
      return;
    }

    setError(null);
    setFileName(file.name);

    const reader = new FileReader();
    
    // 한국환경공단 등에서 제공하는 한글 CSV는 EUC-KR(또는 CP949) 인코딩일 확률이 높으므로 인코딩 선택지 구현 가능
    // 기본적으로 UTF-8로 시도해보고, 깨지는 문제를 피하도록 디코더 처리
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        onDataLoaded(text, file.name);
      }
    };
    
    reader.readAsText(file, "UTF-8");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full" id="csv-uploader-container">
      <div
        id="drop-zone"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
        className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-all cursor-pointer ${
          isDragActive 
            ? "border-blue-500 bg-blue-50/50" 
            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          id="csv-file-input"
          className="hidden"
          accept=".csv"
          onChange={handleChange}
        />
        
        {fileName ? (
          <div className="flex flex-col items-center text-center animate-fade-in" id="file-info">
            <FileSpreadsheet className="w-10 h-10 text-blue-500 mb-2" id="file-icon-success"/>
            <span className="text-sm font-medium text-slate-700 truncate max-w-xs" id="file-name-text">
              {fileName}
            </span>
            <span className="text-xs text-slate-400 mt-1 flex items-center gap-1" id="import-success-msg">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" /> 데이터 로드 및 정상 매핑 완료
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center" id="upload-prompt">
            <Upload className="w-10 h-10 text-slate-400 mb-2" id="upload-icon" />
            <p className="text-sm font-medium text-slate-700" id="upload-help-text">
              CSV 파일을 드래그하거나 클릭하여 업로드
            </p>
            <p className="text-xs text-slate-400 mt-1" id="file-restriction-text">
              (수소이온농도, 총질소, 총인 등 포함된 부산 하수 데이터)
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 p-3 bg-rose-50 border border-rose-100 rounded-lg flex items-start gap-2 text-rose-600 text-xs animate-shake" id="uploader-error-box">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" id="error-alert-icon" />
          <span id="error-message-text">{error}</span>
        </div>
      )}
    </div>
  );
}
