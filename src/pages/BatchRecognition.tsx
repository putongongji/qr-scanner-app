import React, { useState, useCallback } from 'react';
import { ArrowLeft, Play, Pause, RotateCcw, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ImageUpload } from '../components/ImageUpload';
import { ResultDisplay, RecognitionResult } from '../components/ResultDisplay';
import { useAppStore } from '../store/useAppStore';
import { qrService } from '../services/qrService';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export const BatchRecognition: React.FC = () => {
  const navigate = useNavigate();
  const { addResult, settings } = useAppStore();
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [results, setResults] = useState<RecognitionResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [processingStats, setProcessingStats] = useState({
    total: 0,
    completed: 0,
    success: 0,
    failed: 0
  });

  const handleFilesSelect = useCallback((files: File[]) => {
    setSelectedFiles(files);
    // 清空之前的结果
    setResults([]);
    setCurrentIndex(0);
    setProcessingStats({ total: 0, completed: 0, success: 0, failed: 0 });
  }, []);

  const processImage = async (file: File, index: number): Promise<RecognitionResult> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target?.result as string;
        const resultId = `${Date.now()}-${index}`;
        
        // 创建初始结果
        const initialResult: RecognitionResult = {
          id: resultId,
          image: imageData,
          serialNumber: '',
          confidence: 0,
          status: 'pending',
          timestamp: Date.now(),
          originalFileName: file.name
        };
        
        try {
          const startTime = Date.now();
          
          // 尝试多二维码识别
          const multiResult = await qrService.recognizeMultipleQRCodes(imageData);
          const processingTime = Date.now() - startTime;
          
          if (multiResult.results.length > 0) {
            // 找到多个二维码
            const finalResult: RecognitionResult = {
              ...initialResult,
              serialNumber: multiResult.results[0].serialNumber, // 保持兼容性，使用第一个结果
              confidence: multiResult.results[0].confidence,
              status: 'success',
              processingTime: multiResult.processingTime || processingTime,
              qrType: multiResult.results[0].qrType,
              qrDescription: multiResult.results[0].qrDescription,
              qrResults: multiResult.results,
              totalFound: multiResult.totalFound
            };
            
            resolve(finalResult);
          } else {
            // 没有找到二维码，尝试单个识别作为后备
            const qrResult = await qrService.recognizeImage(imageData);
            const validation = qrService.validateQRData(qrResult.serialNumber);
            
            const finalResult: RecognitionResult = {
              ...initialResult,
              serialNumber: qrResult.serialNumber,
              confidence: qrResult.confidence,
              status: qrResult.serialNumber ? 'success' : 'failed',
              processingTime,
              qrType: validation.type,
              qrDescription: validation.description
            };
            
            resolve(finalResult);
          }
        } catch (error) {
          console.error(`处理图片 ${file.name} 失败:`, error);
          resolve({
            ...initialResult,
            status: 'failed'
          });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const startBatchProcessing = async () => {
    if (selectedFiles.length === 0) {
      toast.error('请先选择图片');
      return;
    }

    setIsProcessing(true);
    setIsPaused(false);
    setCurrentIndex(0);
    
    const stats = {
      total: selectedFiles.length,
      completed: 0,
      success: 0,
      failed: 0
    };
    setProcessingStats(stats);

    // 初始化结果数组
    const initialResults: RecognitionResult[] = selectedFiles.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      image: '',
      serialNumber: '',
      confidence: 0,
      status: 'pending',
      timestamp: Date.now(),
      originalFileName: file.name
    }));
    setResults(initialResults);

    // 逐个处理图片
    for (let i = 0; i < selectedFiles.length; i++) {
      if (isPaused) {
        break;
      }
      
      setCurrentIndex(i);
      
      try {
        const result = await processImage(selectedFiles[i], i);
        
        // 更新结果
        setResults(prev => {
          const newResults = [...prev];
          newResults[i] = result;
          return newResults;
        });
        
        // 更新统计
        stats.completed++;
        if (result.status === 'success') {
          stats.success++;
        } else if (result.status === 'failed') {
          stats.failed++;
        }
        setProcessingStats({ ...stats });
        
        // 保存到历史记录
        addResult(result);
        
        // 添加延迟以避免过快处理
        if (settings.processingDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, settings.processingDelay));
        }
      } catch (error) {
        console.error(`处理第 ${i + 1} 张图片失败:`, error);
        stats.completed++;
        stats.failed++;
        setProcessingStats({ ...stats });
      }
    }
    
    setIsProcessing(false);
    setCurrentIndex(selectedFiles.length);
    
    // 显示完成提示
    toast.success(`批量识别完成！成功 ${stats.success} 张，失败 ${stats.failed} 张`);
  };

  const pauseProcessing = () => {
    setIsPaused(true);
    setIsProcessing(false);
    toast.info('处理已暂停');
  };

  const resumeProcessing = async () => {
    if (currentIndex >= selectedFiles.length) {
      toast.error('没有更多图片需要处理');
      return;
    }
    
    setIsPaused(false);
    setIsProcessing(true);
    
    // 从当前位置继续处理
    const stats = { ...processingStats };
    
    for (let i = currentIndex; i < selectedFiles.length; i++) {
      if (isPaused) {
        break;
      }
      
      setCurrentIndex(i);
      
      try {
        const result = await processImage(selectedFiles[i], i);
        
        setResults(prev => {
          const newResults = [...prev];
          newResults[i] = result;
          return newResults;
        });
        
        stats.completed++;
        if (result.status === 'success') {
          stats.success++;
        } else if (result.status === 'failed') {
          stats.failed++;
        }
        setProcessingStats({ ...stats });
        
        addResult(result);
        
        if (settings.processingDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, settings.processingDelay));
        }
      } catch (error) {
        console.error(`处理第 ${i + 1} 张图片失败:`, error);
        stats.completed++;
        stats.failed++;
        setProcessingStats({ ...stats });
      }
    }
    
    setIsProcessing(false);
    setCurrentIndex(selectedFiles.length);
    
    toast.success(`批量识别完成！成功 ${stats.success} 张，失败 ${stats.failed} 张`);
  };

  const resetBatch = () => {
    setSelectedFiles([]);
    setResults([]);
    setIsProcessing(false);
    setIsPaused(false);
    setCurrentIndex(0);
    setProcessingStats({ total: 0, completed: 0, success: 0, failed: 0 });
    toast.info('已重置批量识别');
  };

  const retryResult = async (result: RecognitionResult) => {
    const fileIndex = results.findIndex(r => r.id === result.id);
    if (fileIndex === -1 || !selectedFiles[fileIndex]) return;
    
    try {
      const newResult = await processImage(selectedFiles[fileIndex], fileIndex);
      
      setResults(prev => {
        const newResults = [...prev];
        newResults[fileIndex] = newResult;
        return newResults;
      });
      
      addResult(newResult);
      
      if (newResult.status === 'success') {
        toast.success(`重试成功: ${newResult.qrDescription || '二维码'}`);
      } else {
        toast.error('重试仍然失败');
      }
    } catch (error) {
      console.error('重试失败:', error);
      toast.error('重试失败');
    }
  };

  const removeResult = (id: string) => {
    setResults(prev => prev.filter(r => r.id !== id));
  };

  const progress = processingStats.total > 0 ? (processingStats.completed / processingStats.total) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">批量识别</h1>
              <p className="text-sm text-gray-600">一次处理多张图片</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* 文件上传区域 */}
        <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">选择图片</h2>
          <ImageUpload
            onFilesSelect={handleFilesSelect}
            multiple={true}
            maxFiles={settings.maxBatchSize}
          />
        </div>

        {/* 处理控制 */}
        {selectedFiles.length > 0 && (
          <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">批量处理</h2>
              <div className="flex space-x-2">
                {!isProcessing && !isPaused && (
                  <button
                    onClick={startBatchProcessing}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    <span>开始处理</span>
                  </button>
                )}
                
                {isProcessing && (
                  <button
                    onClick={pauseProcessing}
                    className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    <Pause className="w-4 h-4" />
                    <span>暂停</span>
                  </button>
                )}
                
                {isPaused && currentIndex < selectedFiles.length && (
                  <button
                    onClick={resumeProcessing}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    <span>继续</span>
                  </button>
                )}
                
                <button
                  onClick={resetBatch}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>重置</span>
                </button>
              </div>
            </div>
            
            {/* 进度条 */}
            {processingStats.total > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    进度: {processingStats.completed} / {processingStats.total}
                  </span>
                  <span className="text-gray-600">
                    {progress.toFixed(1)}%
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={cn(
                      'h-2 rounded-full transition-all duration-300',
                      isProcessing ? 'bg-blue-500' : isPaused ? 'bg-orange-500' : 'bg-green-500'
                    )}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-center text-sm">
                  <div>
                    <div className="text-lg font-bold text-green-600">{processingStats.success}</div>
                    <div className="text-gray-500">成功</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-red-600">{processingStats.failed}</div>
                    <div className="text-gray-500">失败</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-blue-600">
                      {processingStats.total - processingStats.completed}
                    </div>
                    <div className="text-gray-500">待处理</div>
                  </div>
                </div>
                
                {isProcessing && currentIndex < selectedFiles.length && (
                  <div className="text-center text-sm text-gray-600">
                    正在处理: {selectedFiles[currentIndex]?.name}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 结果显示 */}
        {results.length > 0 && (
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">识别结果</h2>
            <ResultDisplay
              results={results}
              onRetry={retryResult}
              onRemove={removeResult}
            />
          </div>
        )}
      </div>
    </div>
  );
};