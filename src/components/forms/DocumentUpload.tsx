import React, { useCallback, useState } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { Upload, X, FileText, Crown, Zap, Plus, Sparkles, Info } from 'lucide-react';
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

  // Determine if we're in the wizard dark theme based on className
  const isWizardDarkTheme = className?.includes('bg-white/5') || false;

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Enhanced Upload Area with Live Preview */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-xl transition-all duration-300 cursor-pointer relative overflow-hidden",
          isWizardDarkTheme 
            ? "bg-white/5 hover:bg-white/10" 
            : "bg-card hover:bg-muted/30",
          isDragActive
            ? isWizardDarkTheme 
              ? "border-blue-300 bg-blue-500/10 scale-[1.02] shadow-lg" 
              : "border-primary bg-primary/10 scale-[1.02] shadow-lg"
            : selectedFiles.length > 0
              ? isWizardDarkTheme 
                ? "border-blue-300/50 bg-blue-500/5" 
                : "border-primary/50 bg-primary/5"
              : isWizardDarkTheme 
                ? "border-white/20 hover:border-blue-300/50" 
                : "border-border hover:border-primary/50",
          isProcessing && "opacity-50 cursor-not-allowed",
          selectedFiles.length > 0 ? "min-h-[240px] p-6" : "min-h-[180px] p-8"
        )}
      >
        <input {...getInputProps()} />
        
        {selectedFiles.length === 0 ? (
          /* Empty State with Integrated Limits */
          <div className="flex flex-col items-center text-center w-full">
            <div className={cn(
              "p-6 rounded-full mb-6 transition-all duration-300",
              isDragActive 
                ? isWizardDarkTheme 
                  ? "bg-blue-500/20 scale-110" 
                  : "bg-primary/20 scale-110" 
                : isWizardDarkTheme 
                  ? "bg-white/10" 
                  : "bg-muted"
            )}>
              <Upload className={cn(
                "w-12 h-12 transition-colors duration-300",
                isDragActive 
                  ? isWizardDarkTheme 
                    ? "text-blue-300" 
                    : "text-primary" 
                  : isWizardDarkTheme 
                    ? "text-white/70" 
                    : "text-muted-foreground"
              )} />
            </div>
            <h3 className={cn(
              "text-xl font-semibold mb-2",
              isWizardDarkTheme ? "text-white" : "text-card-foreground"
            )}>
              {isDragActive 
                ? "Drop your documents here..." 
                : "Drag & drop documents here"
              }
            </h3>
            <p className={cn(
              "mb-4",
              isWizardDarkTheme ? "text-white/70" : "text-muted-foreground"
            )}>
              or click to browse your files
            </p>
            
            {/* File Type Indicators */}
            <div className="flex flex-wrap justify-center gap-2 text-xs mb-6">
              {["PDF", "TXT", "PNG", "JPG", "WEBP", "MP3", "MP4"].map((type) => (
                <span key={type} className={cn(
                  "px-3 py-1 rounded-full",
                  isWizardDarkTheme ? "bg-white/10 text-white/70" : "bg-muted text-muted-foreground"
                )}>
                  {type}
                </span>
              ))}
            </div>
            
            {/* Integrated Upload Limits */}
            <div className={cn(
              "flex items-center justify-center gap-4 text-xs px-4 py-2 rounded-lg",
              isWizardDarkTheme
                ? isPremium 
                  ? "bg-yellow-500/10 border border-yellow-500/30" 
                  : "bg-white/10 border border-white/20"
                : isPremium 
                  ? "bg-gradient-to-r from-yellow-50/50 to-orange-50/50 border border-yellow-200/50 dark:from-yellow-900/10 dark:to-orange-900/10 dark:border-yellow-800/50"
                  : "bg-muted/70 border border-border/50"
            )}>
              <div className="flex items-center">
                <FileText className={cn(
                  "w-3.5 h-3.5 mr-1.5",
                  isWizardDarkTheme ? "text-white/70" : "text-muted-foreground"
                )} />
                <span className={cn(
                  isWizardDarkTheme 
                    ? isPremium ? "text-yellow-300" : "text-white/70" 
                    : isPremium ? "text-yellow-700 dark:text-yellow-300" : "text-muted-foreground"
                )}>
                  Max {MAX_FILE_COUNT} files
                </span>
              </div>
              <div className="flex items-center">
                <Info className={cn(
                  "w-3.5 h-3.5 mr-1.5",
                  isWizardDarkTheme ? "text-white/70" : "text-muted-foreground"
                )} />
                <span className={cn(
                  isWizardDarkTheme 
                    ? isPremium ? "text-yellow-300" : "text-white/70" 
                    : isPremium ? "text-yellow-700 dark:text-yellow-300" : "text-muted-foreground"
                )}>
                  Up to {formatFileSize(MAX_INDIVIDUAL_SIZE_BYTES)}
                </span>
              </div>
              {isPremium && (
                <div className="flex items-center">
                  <Crown className={cn(
                    "w-3.5 h-3.5 mr-1",
                    isWizardDarkTheme ? "text-yellow-300" : "text-yellow-600"
                  )} />
                  <Zap className={cn(
                    "w-3 h-3 mr-1",
                    isWizardDarkTheme ? "text-yellow-300" : "text-yellow-600"
                  )} />
                  <span className={cn(
                    isWizardDarkTheme ? "text-yellow-300" : "text-yellow-700 dark:text-yellow-300"
                  )}>
                    Premium
                  </span>
                </div>
              )}
            </div>
            
            {!isPremium && (
              <div className="mt-3 text-xs">
                <span className={cn(
                  "font-medium flex items-center justify-center",
                  isWizardDarkTheme ? "text-blue-300" : "text-primary"
                )}>
                  <Sparkles className="w-3 h-3 mr-1" />
                  <span>Upgrade to Premium for larger files and more uploads</span>
                </span>
              </div>
            )}
          </div>
        ) : (
          /* Live Preview State */
          <div className="w-full">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  isWizardDarkTheme ? "bg-blue-500/20" : "bg-primary/10"
                )}>
                  <FileText className={cn(
                    "w-6 h-6",
                    isWizardDarkTheme ? "text-blue-300" : "text-primary"
                  )} />
                </div>
                <div>
                  <h4 className={cn(
                    "font-semibold",
                    isWizardDarkTheme ? "text-white" : "text-card-foreground"
                  )}>
                    Selected Documents
                  </h4>
                  <p className={cn(
                    "text-sm",
                    isWizardDarkTheme ? "text-white/70" : "text-muted-foreground"
                  )}>
                    {selectedFiles.length}/{MAX_FILE_COUNT} files • {getTotalSelectedSize()}
                  </p>
                </div>
              </div>
              
              {isPremium && (
                <div className={cn(
                  "flex items-center space-x-1 px-3 py-1 rounded-full",
                  isWizardDarkTheme 
                    ? "bg-yellow-500/10 border border-yellow-500/30" 
                    : "bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800"
                )}>
                  <Crown className={cn(
                    "w-4 h-4",
                    isWizardDarkTheme ? "text-yellow-300" : "text-yellow-600"
                  )} />
                  <Zap className={cn(
                    "w-3 h-3",
                    isWizardDarkTheme ? "text-yellow-300" : "text-yellow-600"
                  )} />
                  <span className={cn(
                    "text-xs font-medium",
                    isWizardDarkTheme ? "text-yellow-300" : "text-yellow-800 dark:text-yellow-200"
                  )}>
                    Premium
                  </span>
                </div>
              )}
            </div>
            
            {/* File Preview Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 mb-6 max-h-48 overflow-y-auto p-1">
              {selectedFiles.map((file, index) => (
                <FilePreviewItem 
                  key={`${file.name}-${index}-${file.lastModified}`}
                  file={file} 
                  onRemove={() => onRemoveFile(file.name)}
                  progress={getFileProgress(file.name)}
                  isProcessing={isProcessing}
                  className={isWizardDarkTheme ? "bg-white/10 border-white/20" : ""}
                />
              ))}
              
              {/* Add More Files Button */}
              {selectedFiles.length < MAX_FILE_COUNT && (
                <div className={cn(
                  "flex flex-col items-center justify-center p-3 border-2 border-dashed rounded-lg aspect-square text-center transition-all duration-200 cursor-pointer group",
                  isWizardDarkTheme 
                    ? "bg-white/5 border-white/20 hover:border-blue-300/50 hover:bg-blue-500/10" 
                    : "bg-muted/30 border-border/50 hover:border-primary/50 hover:bg-primary/5"
                )}>
                  <Plus className={cn(
                    "w-6 h-6 transition-colors",
                    isWizardDarkTheme 
                      ? "text-white/50 group-hover:text-blue-300" 
                      : "text-muted-foreground group-hover:text-primary"
                  )} />
                  <p className={cn(
                    "text-xs transition-colors mt-1",
                    isWizardDarkTheme 
                      ? "text-white/50 group-hover:text-blue-300" 
                      : "text-muted-foreground group-hover:text-primary"
                  )}>
                    Add more
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className={cn(
                "flex items-center space-x-2 px-4 py-2 rounded-full",
                isWizardDarkTheme 
                  ? "bg-blue-500/10" 
                  : "bg-primary/10"
              )}>
                <Sparkles className={cn(
                  "w-4 h-4",
                  isWizardDarkTheme ? "text-blue-300" : "text-primary"
                )} />
                <p className={cn(
                  "text-sm font-medium",
                  isWizardDarkTheme ? "text-blue-300" : "text-primary"
                )}>
                  {isDragActive ? "Drop to add more files" : "Drag more files or click to change selection"}
                </p>
              </div>
              
              {/* Inline Limits Display */}
              <div className={cn(
                "flex items-center gap-2 text-xs px-3 py-1.5 rounded-full",
                isWizardDarkTheme
                  ? isPremium 
                    ? "bg-yellow-500/10 border border-yellow-500/30" 
                    : "bg-white/10 border border-white/20"
                  : isPremium 
                    ? "bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 dark:from-yellow-900/20 dark:to-orange-900/20 dark:border-yellow-800"
                    : "bg-muted border border-border"
              )}>
                <span className={cn(
                  isWizardDarkTheme 
                    ? isPremium ? "text-yellow-300" : "text-white/70" 
                    : isPremium ? "text-yellow-700 dark:text-yellow-300" : "text-muted-foreground"
                )}>
                  {MAX_FILE_COUNT - selectedFiles.length} files remaining
                </span>
                {isPremium && (
                  <>
                    <Crown className={cn(
                      "w-3 h-3",
                      isWizardDarkTheme ? "text-yellow-300" : "text-yellow-600"
                    )} />
                    <Zap className={cn(
                      "w-2.5 h-2.5",
                      isWizardDarkTheme ? "text-yellow-300" : "text-yellow-600"
                    )} />
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Local Validation Error Display */}
      {localError && (
        <div className={cn(
          "p-4 rounded-lg",
          isWizardDarkTheme 
            ? "bg-red-500/20 border border-red-500/30" 
            : "bg-destructive/10 border border-destructive/20"
        )}>
          <div className="flex items-start space-x-2">
            <X className={cn(
              "w-5 h-5 flex-shrink-0 mt-0.5",
              isWizardDarkTheme ? "text-red-300" : "text-destructive"
            )} />
            <div className={cn(
              "text-sm space-y-1",
              isWizardDarkTheme ? "text-red-300" : "text-destructive"
            )}>
              {localError.split('\n').map((err, i) => (
                <p key={i}>{err}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Detailed Upload Limits Info */}
      <div className={cn(
        "p-4 rounded-lg border text-sm",
        isWizardDarkTheme
          ? isPremium 
            ? "bg-yellow-500/10 border-yellow-500/30" 
            : "bg-white/10 border-white/20"
          : isPremium 
            ? "bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200 dark:from-yellow-900/20 dark:to-orange-900/20 dark:border-yellow-800"
            : "bg-muted border-border"
      )}>
        <div className="flex items-center space-x-2 mb-2">
          {isPremium ? (
            <>
              <Crown className={cn(
                "w-4 h-4",
                isWizardDarkTheme ? "text-yellow-300" : "text-yellow-600"
              )} />
              <Zap className={cn(
                "w-3 h-3",
                isWizardDarkTheme ? "text-yellow-300" : "text-yellow-600"
              )} />
            </>
          ) : (
            <FileText className={cn(
              "w-4 h-4",
              isWizardDarkTheme ? "text-white/70" : "text-muted-foreground"
            )} />
          )}
          <span className={cn(
            "font-medium",
            isWizardDarkTheme
              ? isPremium ? "text-yellow-300" : "text-white"
              : isPremium ? "text-yellow-800 dark:text-yellow-200" : "text-muted-foreground"
          )}>
            {isPremium ? 'Premium Upload Limits' : 'Standard Upload Limits'}
          </span>
        </div>
        <div className={cn(
          "grid grid-cols-1 md:grid-cols-3 gap-2",
          isWizardDarkTheme
            ? isPremium ? "text-yellow-300" : "text-white/70"
            : isPremium ? "text-yellow-700 dark:text-yellow-300" : "text-muted-foreground"
        )}>
          <div>• Max files: {MAX_FILE_COUNT}</div>
          <div>• Max total: {formatFileSize(MAX_TOTAL_SIZE_BYTES)}</div>
          <div>• Max per file: {formatFileSize(MAX_INDIVIDUAL_SIZE_BYTES)}</div>
        </div>
        
        {isPremium && (
          <div className={cn(
            "mt-2 pt-2 border-t",
            isWizardDarkTheme ? "border-yellow-500/30" : "border-yellow-200 dark:border-yellow-800"
          )}>
            <div className={cn(
              "text-xs",
              isWizardDarkTheme ? "text-yellow-300" : "text-yellow-600 dark:text-yellow-400"
            )}>
              ✨ Premium features: TUS resumable uploads, larger files, priority processing
            </div>
          </div>
        )}
        {!isPremium && (
          <div className={cn(
            "mt-2 pt-2 border-t",
            isWizardDarkTheme ? "border-white/20" : "border-border"
          )}>
            <p className={cn(
              "text-xs",
              isWizardDarkTheme ? "text-white/70" : "text-muted-foreground"
            )}>
              💎 <strong>Upgrade to Premium</strong>: up to {MAX_PREMIUM_FILES} files, up to {MAX_PREMIUM_INDIVIDUAL_MB}MB, priority processing.
            </p>
          </div>
        )}
      </div>

      {/* Global Error Display */}
      {usePlanStore.getState().error && !localError && (
        <div className={cn(
          "p-3 rounded-lg",
          isWizardDarkTheme 
            ? "bg-red-500/20 border border-red-500/30" 
            : "bg-destructive/10 border border-destructive/20"
        )}>
          <p className={cn(
            "text-sm",
            isWizardDarkTheme ? "text-red-300" : "text-destructive"
          )}>
            {usePlanStore.getState().error}
          </p>
        </div>
      )}

      {/* Processing Status */}
      {isProcessing && selectedFiles.length > 0 && (
        <div className={cn(
          "p-4 border rounded-lg",
          isWizardDarkTheme
            ? isPremium 
              ? "bg-yellow-500/10 border-yellow-500/30" 
              : "bg-blue-500/10 border-blue-500/30"
            : isPremium 
              ? "bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200 dark:from-yellow-900/20 dark:to-orange-900/20 dark:border-yellow-800"
              : "bg-primary/10 border-primary/20"
        )}>
          <div className="flex items-center space-x-3">
            <div className={cn(
              "animate-spin rounded-full h-5 w-5 border-2 border-t-transparent",
              isWizardDarkTheme 
                ? isPremium ? "border-yellow-300" : "border-blue-300" 
                : isPremium ? "border-yellow-600" : "border-primary"
            )} />
            {isPremium && (
              <>
                <Crown className={cn(
                  "w-4 h-4",
                  isWizardDarkTheme ? "text-yellow-300" : "text-yellow-600"
                )} />
                <Zap className={cn(
                  "w-3 h-3",
                  isWizardDarkTheme ? "text-yellow-300" : "text-yellow-600"
                )} />
              </>
            )}
            <p className={cn(
              "text-sm font-medium",
              isWizardDarkTheme
                ? isPremium ? "text-yellow-300" : "text-blue-300"
                : isPremium ? "text-yellow-800 dark:text-yellow-200" : "text-primary"
            )}>
              {isPremium ? 'Premium processing' : 'Processing'} {selectedFiles.length} document{selectedFiles.length > 1 ? 's' : ''}...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};