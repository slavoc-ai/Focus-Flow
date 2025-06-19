import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileText, Crown, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { usePlanStore } from '../../store/planStore'; // Import for upload progress

interface DocumentUploadProps {
  onFilesSelect: (files: File[]) => void;
  onRemoveFile: (fileName: string) => void;
  selectedFiles: File[];
  isProcessing?: boolean;
  error?: string;
  className?: string;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  onFilesSelect,
  onRemoveFile,
  selectedFiles,
  isProcessing,
  error,
  className
}) => {
  const { isPremium } = useAuth();
  const { uploadProgress } = usePlanStore(); // Get upload progress from store

  // Dynamic limits based on subscription status
  const MAX_STANDARD_UPLOAD_MB = 9.5; // For standard users via Edge Function
  const MAX_PREMIUM_UPLOAD_MB = 500;  // 500MB for premium via TUS
  const MAX_STANDARD_FILES = 5;
  const MAX_PREMIUM_FILES = 20;

  const MAX_TOTAL_SIZE_MB = isPremium ? MAX_PREMIUM_UPLOAD_MB : MAX_STANDARD_UPLOAD_MB;
  const MAX_FILE_COUNT = isPremium ? MAX_PREMIUM_FILES : MAX_STANDARD_FILES;

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      // Validate file count
      const totalFiles = selectedFiles.length + acceptedFiles.length;
      if (totalFiles > MAX_FILE_COUNT) {
        alert(`Maximum ${MAX_FILE_COUNT} files allowed${!isPremium ? ' for free users. Upgrade to premium for more files.' : '.'}`);
        return;
      }

      // Validate total size
      const currentSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);
      const newSize = acceptedFiles.reduce((sum, file) => sum + file.size, 0);
      const totalSize = (currentSize + newSize) / (1024 * 1024); // Convert to MB

      if (totalSize > MAX_TOTAL_SIZE_MB) {
        alert(`Total file size cannot exceed ${MAX_TOTAL_SIZE_MB}MB${!isPremium ? ' for free users. Upgrade to premium for larger files.' : '.'}`);
        return;
      }

      // Validate individual file sizes for non-premium users
      if (!isPremium) {
        const oversizedFiles = acceptedFiles.filter(file => file.size > (MAX_STANDARD_UPLOAD_MB * 1024 * 1024));
        if (oversizedFiles.length > 0) {
          alert(`Files larger than ${MAX_STANDARD_UPLOAD_MB}MB require a premium subscription. Upgrade to upload: ${oversizedFiles.map(f => f.name).join(', ')}`);
          return;
        }
      }

      onFilesSelect(acceptedFiles);
    }
  }, [onFilesSelect, selectedFiles, MAX_FILE_COUNT, MAX_TOTAL_SIZE_MB, isPremium]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md']
    },
    multiple: true,
    disabled: isProcessing
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTotalSize = () => {
    const totalBytes = selectedFiles.reduce((sum, file) => sum + file.size, 0);
    return formatFileSize(totalBytes);
  };

  const getFileProgress = (fileName: string) => {
    return uploadProgress[fileName];
  };

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6",
          "transition-all duration-200 cursor-pointer",
          "bg-card hover:bg-muted/50",
          isDragActive
            ? "border-primary bg-primary/10"
            : "border-border hover:border-primary/50",
          isProcessing && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center text-center">
          <Upload className="w-12 h-12 text-muted-foreground mb-3" />
          <p className="text-sm text-card-foreground font-medium mb-1">
            {isDragActive 
              ? "Drop your documents here..." 
              : "Drag & drop documents here, or click to select"
            }
          </p>
          <p className="text-xs text-muted-foreground">
            Supported formats: PDF, PPTX, PPT, DOC, DOCX, TXT, MD
          </p>
          {selectedFiles.length > 0 && (
            <p className="text-xs text-primary mt-2">
              {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected ({getTotalSize()})
            </p>
          )}
        </div>
      </div>

      {/* Upload Limits Info */}
      <div className={cn(
        "p-3 rounded-lg border text-xs",
        isPremium 
          ? "bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200 dark:from-yellow-900/20 dark:to-orange-900/20 dark:border-yellow-800"
          : "bg-muted border-border"
      )}>
        <div className="flex items-center space-x-2 mb-1">
          {isPremium ? (
            <>
              <Crown className="w-4 h-4 text-yellow-600" />
              <Zap className="w-3 h-3 text-yellow-600" />
            </>
          ) : (
            <FileText className="w-4 h-4 text-muted-foreground" />
          )}
          <span className={cn(
            "font-medium",
            isPremium ? "text-yellow-800 dark:text-yellow-200" : "text-muted-foreground"
          )}>
            {isPremium ? 'Premium Upload' : 'Standard Upload'}
          </span>
        </div>
        <div className={cn(
          "space-y-1",
          isPremium ? "text-yellow-700 dark:text-yellow-300" : "text-muted-foreground"
        )}>
          <div>• Max files: {MAX_FILE_COUNT}</div>
          <div>• Max total size: {MAX_TOTAL_SIZE_MB}MB</div>
          {!isPremium && (
            <div>• Max file size: {MAX_STANDARD_UPLOAD_MB}MB each</div>
          )}
          {isPremium && (
            <div>• Resumable uploads with 6MB chunks</div>
          )}
        </div>
        {!isPremium && (
          <div className="mt-2 pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              💎 <strong>Upgrade to Premium</strong> for TUS resumable uploads, larger files (up to {MAX_PREMIUM_UPLOAD_MB}MB), more files ({MAX_PREMIUM_FILES} max), and priority processing.
            </p>
          </div>
        )}
      </div>

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-card-foreground">
            Selected Documents ({selectedFiles.length}/{MAX_FILE_COUNT})
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {selectedFiles.map((file, index) => {
              const isLargeFile = !isPremium && file.size > (MAX_STANDARD_UPLOAD_MB * 1024 * 1024);
              const progress = getFileProgress(file.name);
              
              return (
                <div
                  key={`${file.name}-${index}`}
                  className={cn(
                    "flex items-center justify-between p-3 border rounded-lg transition-colors",
                    isLargeFile 
                      ? "bg-destructive/10 border-destructive/20" 
                      : "bg-card border-border hover:bg-muted/30"
                  )}
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <FileText className={cn(
                      "w-5 h-5 flex-shrink-0",
                      isLargeFile ? "text-destructive" : "text-primary"
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium truncate",
                        isLargeFile ? "text-destructive" : "text-card-foreground"
                      )}>
                        {file.name}
                      </p>
                      <div className="flex items-center space-x-2">
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                        </p>
                        {isLargeFile && (
                          <span className="text-xs text-destructive font-medium">
                            Too large for free tier
                          </span>
                        )}
                        {isPremium && file.size > (MAX_STANDARD_UPLOAD_MB * 1024 * 1024) && (
                          <span className="text-xs text-yellow-600 font-medium flex items-center space-x-1">
                            <Zap className="w-3 h-3" />
                            <span>TUS Upload</span>
                          </span>
                        )}
                      </div>
                      
                      {/* Upload Progress Bar */}
                      {progress && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-primary">Uploading...</span>
                            <span className="text-primary">{progress.percentage}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5">
                            <div
                              className="bg-primary h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${progress.percentage}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {isProcessing || progress ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent flex-shrink-0" />
                  ) : (
                    <button
                      onClick={() => onRemoveFile(file.name)}
                      className="p-1 hover:bg-destructive/10 rounded-full transition-colors duration-200 flex-shrink-0"
                      title="Remove file"
                    >
                      <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Processing Status */}
      {isProcessing && selectedFiles.length > 0 && (
        <div className={cn(
          "p-3 border rounded-lg",
          isPremium 
            ? "bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200 dark:from-yellow-900/20 dark:to-orange-900/20 dark:border-yellow-800"
            : "bg-primary/10 border-primary/20"
        )}>
          <div className="flex items-center space-x-2">
            {isPremium && (
              <>
                <Crown className="w-4 h-4 text-yellow-600" />
                <Zap className="w-3 h-3 text-yellow-600" />
              </>
            )}
            <p className={cn(
              "text-sm",
              isPremium ? "text-yellow-800 dark:text-yellow-200" : "text-primary"
            )}>
              {isPremium ? 'Premium TUS processing' : 'Processing'} {selectedFiles.length} document{selectedFiles.length > 1 ? 's' : ''}...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};