import React, { useState } from 'react';
import { Copy, Download, Share2, Eye, EyeOff, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

export interface QRResult {
  serialNumber: string;
  confidence: number;
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  qrType?: string;
  qrDescription?: string;
  processingTime: number;
}

export interface RecognitionResult {
  id: string;
  image: string; // base64 or blob URL
  serialNumber: string; // 保持字段名兼容性，实际存储二维码数据
  confidence: number;
  status: 'success' | 'failed' | 'pending';
  timestamp: number;
  processingTime?: number;
  originalFileName?: string;
  qrType?: string;
  qrDescription?: string;
  // 新增多二维码支持
  qrResults?: QRResult[]; // 多个二维码结果
  totalFound?: number; // 总共找到的二维码数量
}

interface ResultDisplayProps {
  results: RecognitionResult[];
  onRetry?: (result: RecognitionResult) => void;
  onRemove?: (id: string) => void;
  className?: string;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({
  results,
  onRetry,
  onRemove,
  className
}) => {
  const [showImages, setShowImages] = useState(true);
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set());

  const successResults = results.filter(r => r.status === 'success');
  const failedResults = results.filter(r => r.status === 'failed');
  const pendingResults = results.filter(r => r.status === 'pending');

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('已复制到剪贴板');
    } catch (error) {
      toast.error('复制失败');
    }
  };

  const copyAllSerialNumbers = async () => {
    const allQRData: string[] = [];
    
    successResults.forEach(result => {
      if (result.qrResults && result.qrResults.length > 0) {
        // 多二维码结果
        result.qrResults.forEach(qr => {
          allQRData.push(qr.serialNumber);
        });
      } else if (result.serialNumber) {
        // 单个二维码结果（向后兼容）
        allQRData.push(result.serialNumber);
      }
    });
    
    const serialNumbers = allQRData.filter(Boolean).join('\n');
    
    if (serialNumbers) {
      await copyToClipboard(serialNumbers);
    } else {
      toast.error('没有可复制的二维码数据');
    }
  };

  const downloadResults = () => {
    const data: any[] = [];
    
    results.forEach(result => {
      if (result.qrResults && result.qrResults.length > 0) {
        // 多二维码结果，每个二维码一行
        result.qrResults.forEach((qr, index) => {
          data.push({
            文件名: result.originalFileName || '-',
            二维码序号: index + 1,
            二维码数据: qr.serialNumber,
            数据类型: qr.qrDescription || '-',
            置信度: qr.confidence,
            位置X: qr.position?.x || '-',
            位置Y: qr.position?.y || '-',
            宽度: qr.position?.width || '-',
            高度: qr.position?.height || '-',
            状态: result.status === 'success' ? '成功' : result.status === 'failed' ? '失败' : '处理中',
            处理时间: result.processingTime ? `${result.processingTime}ms` : '-',
            时间戳: new Date(result.timestamp).toLocaleString()
          });
        });
      } else {
        // 单个二维码结果（向后兼容）
        data.push({
          文件名: result.originalFileName || '-',
          二维码序号: 1,
          二维码数据: result.serialNumber || '识别失败',
          数据类型: result.qrDescription || '-',
          置信度: result.confidence,
          位置X: '-',
          位置Y: '-',
          宽度: '-',
          高度: '-',
          状态: result.status === 'success' ? '成功' : result.status === 'failed' ? '失败' : '处理中',
          处理时间: result.processingTime ? `${result.processingTime}ms` : '-',
          时间戳: new Date(result.timestamp).toLocaleString()
        });
      }
    });

    if (data.length === 0) {
      toast.error('没有数据可导出');
      return;
    }

    const csvContent = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `二维码识别结果_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    
    toast.success('结果已导出');
  };

  const shareResults = async () => {
    const allQRData: string[] = [];
    
    successResults.forEach(result => {
      if (result.qrResults && result.qrResults.length > 0) {
        result.qrResults.forEach(qr => {
          allQRData.push(qr.serialNumber);
        });
      } else if (result.serialNumber) {
        allQRData.push(result.serialNumber);
      }
    });
    
    const serialNumbers = allQRData.filter(Boolean).join('\n');
    
    if (navigator.share && serialNumbers) {
      try {
        await navigator.share({
          title: '二维码识别结果',
          text: serialNumbers
        });
      } catch (error) {
        await copyToClipboard(serialNumbers);
      }
    } else {
      await copyToClipboard(serialNumbers);
    }
  };

  const toggleResultSelection = (id: string) => {
    const newSelected = new Set(selectedResults);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedResults(newSelected);
  };

  const selectAll = () => {
    setSelectedResults(new Set(results.map(r => r.id)));
  };

  const clearSelection = () => {
    setSelectedResults(new Set());
  };

  if (results.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-500">暂无识别结果</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* 统计信息 */}
      <div className="bg-white rounded-lg p-4 shadow-sm border">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600">{successResults.length}</div>
            <div className="text-sm text-gray-500">成功</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">{failedResults.length}</div>
            <div className="text-sm text-gray-500">失败</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{pendingResults.length}</div>
            <div className="text-sm text-gray-500">处理中</div>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={copyAllSerialNumbers}
          disabled={successResults.length === 0}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          <Copy className="w-4 h-4" />
          <span>复制全部</span>
        </button>
        
        <button
          onClick={downloadResults}
          disabled={results.length === 0}
          className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>导出CSV</span>
        </button>
        
        <button
          onClick={shareResults}
          disabled={successResults.length === 0}
          className="flex items-center space-x-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          <Share2 className="w-4 h-4" />
          <span>分享</span>
        </button>
        
        <button
          onClick={() => setShowImages(!showImages)}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          {showImages ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          <span>{showImages ? '隐藏图片' : '显示图片'}</span>
        </button>
      </div>

      {/* 批量操作 */}
      {results.length > 1 && (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              已选择 {selectedResults.size} / {results.length} 项
            </span>
            <button
              onClick={selectedResults.size === results.length ? clearSelection : selectAll}
              className="text-sm text-blue-500 hover:text-blue-700"
            >
              {selectedResults.size === results.length ? '取消全选' : '全选'}
            </button>
          </div>
          
          {selectedResults.size > 0 && (
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  selectedResults.forEach(id => onRemove?.(id));
                  clearSelection();
                }}
                className="text-sm text-red-500 hover:text-red-700"
              >
                删除选中
              </button>
            </div>
          )}
        </div>
      )}

      {/* 结果列表 */}
      <div className="space-y-4">
        {results.map((result) => (
          <ResultItem
            key={result.id}
            result={result}
            showImage={showImages}
            isSelected={selectedResults.has(result.id)}
            onSelect={() => toggleResultSelection(result.id)}
            onCopy={() => copyToClipboard(result.serialNumber)}
            copyToClipboard={copyToClipboard}
            onRetry={() => onRetry?.(result)}
            onRemove={() => onRemove?.(result.id)}
          />
        ))}
      </div>
    </div>
  );
};

interface ResultItemProps {
  result: RecognitionResult;
  showImage: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onCopy: () => void;
  onRetry?: () => void;
  onRemove?: () => void;
  copyToClipboard: (text: string) => Promise<void>;
}

const ResultItem: React.FC<ResultItemProps> = ({
  result,
  showImage,
  isSelected,
  onSelect,
  onCopy,
  onRetry,
  onRemove,
  copyToClipboard
}) => {
  const getStatusIcon = () => {
    switch (result.status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return (
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        );
    }
  };

  const getStatusText = () => {
    switch (result.status) {
      case 'success':
        return '识别成功';
      case 'failed':
        return '识别失败';
      case 'pending':
        return '处理中...';
    }
  };

  return (
    <div className={cn(
      'bg-white rounded-lg border p-4 transition-all',
      isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
    )}>
      <div className="flex items-start space-x-4">
        {/* 选择框 */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
        />
        
        {/* 图片预览 */}
        {showImage && (
          <div className="flex-shrink-0">
            <img
              src={result.image}
              alt="识别图片"
              className="w-16 h-16 object-cover rounded-lg border border-gray-200"
            />
          </div>
        )}
        
        {/* 结果信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            {getStatusIcon()}
            <span className="text-sm font-medium text-gray-900">
              {getStatusText()}
            </span>
            {result.confidence > 0 && (
              <span className="text-xs text-gray-500">
                置信度: {(result.confidence * 100).toFixed(1)}%
              </span>
            )}
          </div>
          
          {/* 多二维码结果显示 */}
          {result.qrResults && result.qrResults.length > 0 ? (
            <div className="mb-2">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-sm text-gray-600">
                  发现 {result.totalFound || result.qrResults.length} 个二维码:
                </span>
                <button
                    onClick={async () => {
                      const allData = result.qrResults!.map(qr => qr.serialNumber).join('\n');
                      await copyToClipboard(allData);
                    }}
                  className="text-blue-500 hover:text-blue-700 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-2">
                {result.qrResults.map((qrResult, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-700">
                        二维码 #{index + 1}
                        {qrResult.position && (
                          <span className="ml-2 text-gray-500">
                            位置: ({qrResult.position.x}, {qrResult.position.y})
                          </span>
                        )}
                      </span>
                      <div className="flex items-center space-x-2">
                        {qrResult.confidence > 0 && (
                          <span className="text-xs text-gray-500">
                            {(qrResult.confidence * 100).toFixed(1)}%
                          </span>
                        )}
                        <button
                          onClick={() => copyToClipboard(qrResult.serialNumber)}
                          className="text-blue-500 hover:text-blue-700 transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    
                    <code className="px-2 py-1 bg-white rounded text-sm font-mono block break-all border">
                      {qrResult.serialNumber}
                    </code>
                    
                    {qrResult.qrDescription && (
                      <div className="mt-2">
                        <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                          {qrResult.qrDescription}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : result.serialNumber ? (
            <div className="mb-2">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-sm text-gray-600">二维码数据:</span>
                <button
                  onClick={onCopy}
                  className="text-blue-500 hover:text-blue-700 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono block break-all">
                {result.serialNumber}
              </code>
              {result.qrDescription && (
                <div className="mt-1">
                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    {result.qrDescription}
                  </span>
                </div>
              )}
            </div>
          ) : null}
          
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="space-x-4">
              {result.originalFileName && (
                <span>文件: {result.originalFileName}</span>
              )}
              {result.processingTime && (
                <span>耗时: {result.processingTime}ms</span>
              )}
            </div>
            <span>{new Date(result.timestamp).toLocaleString()}</span>
          </div>
        </div>
        
        {/* 操作按钮 */}
        <div className="flex flex-col space-y-2">
          {result.status === 'failed' && onRetry && (
            <button
              onClick={onRetry}
              className="text-xs text-blue-500 hover:text-blue-700 transition-colors"
            >
              重试
            </button>
          )}
          {onRemove && (
            <button
              onClick={onRemove}
              className="text-xs text-red-500 hover:text-red-700 transition-colors"
            >
              删除
            </button>
          )}
        </div>
      </div>
    </div>
  );
};