import React from 'react';
import { FileText, Image, FileVideo, FileAudio, File, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface FilePreviewItemProps {
  file: File;
  onRemove: () => void;
  progress?: { percentage: number; bytesUploaded: number; bytesTotal: number };
  isProcessing?: boolean;
  className?: string;
}

const getFileIcon = (mimeType: string) => {
  const iconClass = "w-6 h-6 text-primary";
  
  if (mimeType.includes('pdf')) {
    return <FileText className={cn(iconClass, "text-red-500")} />;
  }
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
    return <FileText className={cn(iconClass, "text-orange-500")} />;
  }
  if (mimeType.includes('document') || mimeType.includes('word')) {
    return <FileText className={cn(iconClass, "text-blue-500")} />;
  }
  if (mimeType.includes('text')) {
    return <FileText className={cn(iconClass, "text-gray-500")} />;
  }
  if (mimeType.includes('image')) {
    return <Image className={cn(iconClass, "text-green-500")} />;
  }
  if (mimeType.includes('video')) {
    return <FileVideo className={cn(iconClass, "text-purple-500")} />;
  }
  if (mimeType.includes('audio')) {
    return <FileAudio className={cn(iconClass, "text-pink-500")} />;
  }
  
  return <File className={iconClass} />;
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const FilePreviewItem: React.FC<FilePreviewItemProps> = ({ 
  file, 
  onRemove, 
  progress, 
  isProcessing, 
  className 
}) => {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-start p-2 border border-border/50 rounded-lg bg-card aspect-square text-center group hover:shadow-md transition-all duration-200",
        className,
        progress && "ring-2 ring-primary/50 bg-primary/5",
        isProcessing && "opacity-75"
      )}
      title={`${file.name} (${formatFileSize(file.size)})`}
    >
      {/* Remove Button */}
      {!isProcessing && !progress && (
        <button
          onClick={(e) => {
            e.stopPropagation(); // Prevent event bubbling to parent dropzone
            onRemove();
          }}
          className="absolute -top-1 -right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:scale-110 z-10 shadow-sm"
          title="Remove file"
        >
          <X className="w-3 h-3" />
        </button>
      )}

      {/* File Icon */}
      <div className="mb-2 mt-2 flex-shrink-0">
        {getFileIcon(file.type.toLowerCase())}
      </div>

      {/* File Name */}
      <p className="text-xs text-card-foreground leading-tight line-clamp-2 flex-grow flex items-center px-1 text-center">
        {file.name}
      </p>

      {/* File Size */}
      <p className="text-[10px] text-muted-foreground mt-auto flex-shrink-0">
        {formatFileSize(file.size)}
      </p>

      {/* Upload Progress Bar */}
      {progress && (
        <div className="absolute bottom-1 left-1 right-1 px-1">
          <div className="w-full bg-muted rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <div className="text-[9px] text-primary font-medium mt-0.5">
            {progress.percentage}%
          </div>
        </div>
      )}

      {/* Processing Indicator */}
      {isProcessing && !progress && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/80 rounded-lg">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  );
};