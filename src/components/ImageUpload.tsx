import React, { useRef, useState, useCallback } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface ImageUploadProps {
  onFilesSelect: (files: File[]) => void;
  multiple?: boolean;
  maxFiles?: number;
  className?: string;
  accept?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onFilesSelect,
  multiple = false,
  maxFiles = 10,
  className,
  accept = 'image/*'
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        console.warn(`文件 ${file.name} 不是有效的图片格式`);
        return false;
      }
      
      // 验证文件大小 (最大10MB)
      if (file.size > 10 * 1024 * 1024) {
        console.warn(`文件 ${file.name} 超过10MB大小限制`);
        return false;
      }
      
      return true;
    });

    if (multiple) {
      const newFiles = [...selectedFiles, ...validFiles].slice(0, maxFiles);
      setSelectedFiles(newFiles);
      onFilesSelect(newFiles);
    } else {
      const newFiles = validFiles.slice(0, 1);
      setSelectedFiles(newFiles);
      onFilesSelect(newFiles);
    }
  }, [selectedFiles, multiple, maxFiles, onFilesSelect]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(event.target.files);
  };

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    handleFileSelect(event.dataTransfer.files);
  }, [handleFileSelect]);

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    onFilesSelect(newFiles);
  };

  const clearAll = () => {
    setSelectedFiles([]);
    onFilesSelect([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={cn('w-full', className)}>
      {/* 上传区域 */}
      <div
        className={cn(
          'relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
          isDragOver
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
        />
        
        <div className="flex flex-col items-center space-y-4">
          <div className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center transition-colors',
            isDragOver ? 'bg-blue-100' : 'bg-gray-100'
          )}>
            <Upload className={cn(
              'w-8 h-8 transition-colors',
              isDragOver ? 'text-blue-500' : 'text-gray-400'
            )} />
          </div>
          
          <div>
            <p className="text-lg font-medium text-gray-900">
              {isDragOver ? '释放文件以上传' : '点击或拖拽图片到此处'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {multiple 
                ? `支持多张图片，最多${maxFiles}张，单个文件不超过10MB`
                : '支持JPG、PNG等格式，文件不超过10MB'
              }
            </p>
          </div>
        </div>
      </div>

      {/* 已选择的文件列表 */}
      {selectedFiles.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              已选择 {selectedFiles.length} 张图片
            </h3>
            <button
              onClick={clearAll}
              className="text-sm text-red-500 hover:text-red-700 transition-colors"
            >
              清空全部
            </button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {selectedFiles.map((file, index) => (
              <FilePreview
                key={`${file.name}-${index}`}
                file={file}
                onRemove={() => removeFile(index)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface FilePreviewProps {
  file: File;
  onRemove: () => void;
}

const FilePreview: React.FC<FilePreviewProps> = ({ file, onRemove }) => {
  const [preview, setPreview] = useState<string | null>(null);

  React.useEffect(() => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [file]);

  return (
    <div className="relative group">
      <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
        {preview ? (
          <img
            src={preview}
            alt={file.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-gray-400" />
          </div>
        )}
      </div>
      
      {/* 删除按钮 */}
      <button
        onClick={onRemove}
        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
      >
        <X className="w-4 h-4" />
      </button>
      
      {/* 文件名 */}
      <p className="mt-2 text-xs text-gray-600 truncate" title={file.name}>
        {file.name}
      </p>
      
      {/* 文件大小 */}
      <p className="text-xs text-gray-400">
        {(file.size / 1024 / 1024).toFixed(1)} MB
      </p>
    </div>
  );
};