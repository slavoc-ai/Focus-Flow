import React, { useCallback, useState } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { Upload, X, FileText, Crown, Zap, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { usePlanStore } from '../../store/planStore';
import { FilePreviewItem } from './FilePreviewItem';

interface DocumentUploadProps {
  onFilesSelect: (files: File[]) => void;
  onRemoveFile: (fileName: string) => void;
  selectedFiles: File[];
  isProcessing?: boolean;
  className?: string;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  onFilesSelect,
  onRemoveFile,
  selectedFiles,
  isProcessing,
  className
}) => {
  const { isPremium } = useAuth();
  const { uploadProgress } = usePlanStore();
  const [localError, setLocalError] = useState<string | null>(null);

  // Dynamic limits based on subscription status
  const MAX_STANDARD_INDIVIDUAL_MB = 9.5;
  const MAX_PREMIUM_INDIVIDUAL_MB = 50;
  const MAX_STANDARD_TOTAL_MB = 9.5;
  const MAX_PREMIUM_TOTAL_MB = 50;
  const MAX_STANDARD_FILES = 5;
  const MAX_PREMIUM_FILES = 20;

  const MAX_INDIVIDUAL_SIZE_BYTES = (isPremium ? MAX_PREMIUM_INDIVIDUAL_MB : MAX_STANDARD_INDIVIDUAL_MB) * 1024 * 1024;
  const MAX_TOTAL_SIZE_BYTES = (isPremium ? MAX_PREMIUM_TOTAL_MB : MAX_STANDARD_TOTAL_MB) * 1024 * 1024;
  const MAX_FILE_COUNT = isPremium ? MAX_PREMIUM_FILES : MAX_STANDARD_FILES;

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTotalSelectedSize = () => {
    const totalBytes = selectedFiles.reduce((sum, file) => sum + file.size, 0);
    return formatFileSize(totalBytes);
  };

  const getFileProgress = (fileName: string) => {
    return uploadProgress[fileName];
  };

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    setLocalError(null);
    let currentTotalSizeBytes = selectedFiles.reduce((sum, file) => sum + file.size, 0);
    const filesToActuallyAdd: File[] = [];
    const validationErrors: string[] = [];

    // Handle rejected files due to file type
    if (rejectedFiles.length > 0) {
      const rejectedNames = rejectedFiles.map(r => r.file.name).join(', ');
      const supportedExtensions = "PDF, TXT, MD, PNG, JPG, WEBP, MP3, WAV, MP4";
      validationErrors.push(`Unsupported file type(s) for: ${rejectedNames}. Supported types: ${supportedExtensions}`);
    }

    // Check against MAX_FILE_COUNT
    if (selectedFiles.length + acceptedFiles.length > MAX_FILE_COUNT) {
      validationErrors.push(
        `Cannot add ${acceptedFiles.length} file(s). Maximum ${MAX_FILE_COUNT} files allowed${!isPremium ? ' for free users. Upgrade to premium for more files.' : '.'}`
      );
    } else {
      for (const file of acceptedFiles) {
        // Check individual file size
        if (file.size > MAX_INDIVIDUAL_SIZE_BYTES) {
          validationErrors.push(
            `File "${file.name}" (${formatFileSize(file.size)}) exceeds the individual limit of ${formatFileSize(MAX_INDIVIDUAL_SIZE_BYTES)}${!isPremium ? '. Upgrade to premium for larger files.' : '.'}`
          );
          continue;
        }

        // Check if adding this file exceeds total size
        if (currentTotalSizeBytes + file.size > MAX_TOTAL_SIZE_BYTES) {
          validationErrors.push(
            `Cannot add "${file.name}". Adding it would exceed the total size limit of ${formatFileSize(MAX_TOTAL_SIZE_BYTES)}${!isPremium ? ' for free users.' : '.'}`
          );
          continue;
        }
        
        // Check for duplicates
        if (selectedFiles.some(existingFile => existingFile.name === file.name && existingFile.size === file.size)) {
          validationErrors.push(`File "${file.name}" is already selected.`);
          continue;
        }

        filesToActuallyAdd.push(file);
        currentTotalSizeBytes += file.size;
      }
    }

    if (validationErrors.length > 0) {
      setLocalError(validationErrors.join('\n'));
      if (filesToActuallyAdd.length > 0) {
        onFilesSelect(filesToActuallyAdd);
      }
      return;
    }

    if (filesToActuallyAdd.length > 0) {
      onFilesSelect(filesToActuallyAdd);
    }
  }, [
    onFilesSelect, 
    selectedFiles, 
    MAX_FILE_COUNT, 
    MAX_TOTAL_SIZE_BYTES, 
    MAX_INDIVIDUAL_SIZE_BYTES, 
    isPremium
  ]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      // Officially supported by Gemini API
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md', '.markdown'], // Will be treated as text/plain
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'audio/mpeg': ['.mp3'],
      'audio/wav': ['.wav'],
      'video/mp4': ['.mp4'],
      // Note: DOCX, PPTX removed until conversion is implemented
    },
    multiple: true,
    disabled: isProcessing
  });

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Enhanced Upload Area with Live Preview */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-xl p-4 transition-all duration-200 cursor-pointer",
          "bg-card hover:bg-muted/30",
          isDragActive
            ? "border-primary bg-primary/10 scale-[1.02]"
            : selectedFiles.length > 0
              ? "border-primary/50 bg-primary/5"
              : "border-border hover:border-primary/50",
          isProcessing && "opacity-50 cursor-not-allowed",
          selectedFiles.length > 0 ? "min-h-[200px]" : "min-h-[150px]"
        )}
      >
        <input {...getInputProps()} />
        
        {selectedFiles.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center text-center w-full py-8">
            <div className={cn(
              "p-4 rounded-full mb-4 transition-all duration-200",
              isDragActive ? "bg-primary/20 scale-110" : "bg-muted"
            )}>
              <Upload className={cn(
                "w-8 h-8 transition-colors duration-200",
                isDragActive ? "text-primary" : "text-muted-foreground"
              )} />
            </div>
            <p className="text-lg font-medium text-card-foreground mb-2">
              {isDragActive 
                ? "Drop your documents here..." 
                : "Drag & drop documents here"
              }
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              or click to browse your files
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
              <span className="px-2 py-1 bg-muted rounded-full">PDF</span>
              <span className="px-2 py-1 bg-muted rounded-full">TXT</span>
              <span className="px-2 py-1 bg-muted rounded-full">MD</span>
              <span className="px-2 py-1 bg-muted rounded-full">PNG</span>
              <span className="px-2 py-1 bg-muted rounded-full">JPG</span>
              <span className="px-2 py-1 bg-muted rounded-full">WEBP</span>
              <span className="px-2 py-1 bg-muted rounded-full">MP3</span>
              <span className="px-2 py-1 bg-muted rounded-full">MP4</span>
            </div>
          </div>
        ) : (
          /* Live Preview State */
          <div className="w-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-primary" />
                <h4 className="font-medium text-card-foreground">
                  Selected Documents
                </h4>
                <span className="text-sm text-muted-foreground">
                  ({selectedFiles.length}/{MAX_FILE_COUNT})
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                {getTotalSelectedSize()}
              </div>
            </div>
            
            {/* File Preview Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 mb-4 max-h-40 overflow-y-auto p-1">
              {selectedFiles.map((file, index) => (
                <FilePreviewItem 
                  key={`${file.name}-${index}-${file.lastModified}`}
                  file={file} 
                  onRemove={() => onRemoveFile(file.name)}
                  progress={getFileProgress(file.name)}
                  isProcessing={isProcessing}
                />
              ))}
              
              {/* Add More Files Button */}
              {selectedFiles.length < MAX_FILE_COUNT && (
                <div className="flex flex-col items-center justify-center p-2 border-2 border-dashed border-border/50 rounded-lg bg-muted/30 aspect-square text-center hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 cursor-pointer">
                  <Plus className="w-6 h-6 text-muted-foreground mb-1" />
                  <p className="text-xs text-muted-foreground">Add more</p>
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-center">
              <p className="text-xs text-primary font-medium bg-primary/10 px-3 py-1 rounded-full">
                {isDragActive ? "Drop to add more files" : "Drag more files or click to change selection"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Local Validation Error Display */}
      {localError && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-start space-x-2">
            <X className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="text-sm text-destructive space-y-1">
              {localError.split('\n').map((err, i) => (
                <p key={i}>{err}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Upload Limits Info */}
      <div className={cn(
        "p-4 rounded-lg border text-sm",
        isPremium 
          ? "bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200 dark:from-yellow-900/20 dark:to-orange-900/20 dark:border-yellow-800"
          : "bg-muted border-border"
      )}>
        <div className="flex items-center space-x-2 mb-2">
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
            {isPremium ? 'Premium Upload Limits' : 'Standard Upload Limits'}
          </span>
        </div>
        <div className={cn(
          "grid grid-cols-1 md:grid-cols-3 gap-2",
          isPremium ? "text-yellow-700 dark:text-yellow-300" : "text-muted-foreground"
        )}>
          <div>• Max files: {MAX_FILE_COUNT}</div>
          <div>• Max total: {formatFileSize(MAX_TOTAL_SIZE_BYTES)}</div>
          <div>• Max per file: {formatFileSize(MAX_INDIVIDUAL_SIZE_BYTES)}</div>
        </div>
        
        {isPremium && (
          <div className="mt-2 pt-2 border-t border-yellow-200 dark:border-yellow-800">
            <div className="text-xs text-yellow-600 dark:text-yellow-400">
              ✨ Premium features: TUS resumable uploads, larger files, priority processing
            </div>
          </div>
        )}
        {!isPremium && (
          <div className="mt-2 pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              💎 <strong>Upgrade to Premium</strong>: up to {MAX_PREMIUM_FILES} files, up to {MAX_PREMIUM_INDIVIDUAL_MB}MB, priority processing.
            </p>
          </div>
        )}
      </div>

      {/* Global Error Display */}
      {usePlanStore.getState().error && !localError && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{usePlanStore.getState().error}</p>
        </div>
      )}

      {/* Processing Status */}
      {isProcessing && selectedFiles.length > 0 && (
        <div className={cn(
          "p-4 border rounded-lg",
          isPremium 
            ? "bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200 dark:from-yellow-900/20 dark:to-orange-900/20 dark:border-yellow-800"
            : "bg-primary/10 border-primary/20"
        )}>
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
            {isPremium && (
              <>
                <Crown className="w-4 h-4 text-yellow-600" />
                <Zap className="w-3 h-3 text-yellow-600" />
              </>
            )}
            <p className={cn(
              "text-sm font-medium",
              isPremium ? "text-yellow-800 dark:text-yellow-200" : "text-primary"
            )}>
              {isPremium ? 'Premium processing' : 'Processing'} {selectedFiles.length} document{selectedFiles.length > 1 ? 's' : ''}...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};