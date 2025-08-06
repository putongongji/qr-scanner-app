import React, { useState, useRef } from 'react';
import { Camera, Upload, History, Settings, QrCode, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Camera as CameraComponent } from '../components/Camera';
import { useAppStore } from '../store/useAppStore';
import { qrService } from '../services/qrService';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { addResult, results, settings } = useAppStore();

  const recentResults = results.slice(0, 3);
  const successCount = results.filter(r => r.status === 'success').length;
  const totalCount = results.length;

  const handleQuickPhoto = () => {
    setShowCamera(true);
  };

  const handleCameraCapture = async (imageData: string) => {
    setShowCamera(false);
    setIsProcessing(true);
    
    try {
      // 尝试多二维码识别
      const multiResult = await qrService.recognizeMultipleQRCodes(imageData);
      
      if (multiResult.results.length > 0) {
        // 找到多个二维码
        addResult({
          id: Date.now().toString(),
          image: imageData,
          serialNumber: multiResult.results[0].serialNumber, // 保持兼容性，使用第一个结果
          confidence: multiResult.results[0].confidence,
          status: 'success',
          timestamp: Date.now(),
          processingTime: multiResult.processingTime,
          qrType: multiResult.results[0].qrType,
          qrDescription: multiResult.results[0].qrDescription,
          qrResults: multiResult.results,
          totalFound: multiResult.totalFound
        });
        
        if (multiResult.results.length === 1) {
          toast.success(`识别成功: ${multiResult.results[0].qrDescription || '二维码'}`);
        } else {
          toast.success(`识别成功: 发现 ${multiResult.totalFound} 个二维码`);
        }
      } else {
        // 没有找到二维码，尝试单个识别作为后备
        const result = await qrService.recognizeImage(imageData);
        const validation = qrService.validateQRData(result.serialNumber);
        
        addResult({
          id: Date.now().toString(),
          image: imageData,
          serialNumber: result.serialNumber,
          confidence: result.confidence,
          status: result.serialNumber ? 'success' : 'failed',
          timestamp: Date.now(),
          processingTime: result.processingTime,
          qrType: validation.type,
          qrDescription: validation.description
        });
        
        if (result.serialNumber) {
          toast.success(`识别成功: ${validation.description}`);
        } else {
          toast.error('未能识别出二维码');
        }
      }
    } catch (error) {
      console.error('识别失败:', error);
      toast.error('识别失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件');
      return;
    }

    setIsProcessing(true);
    
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target?.result as string;
        
        try {
          // 尝试多二维码识别
          const multiResult = await qrService.recognizeMultipleQRCodes(imageData);
          
          if (multiResult.results.length > 0) {
            // 找到多个二维码
            addResult({
              id: Date.now().toString(),
              image: imageData,
              serialNumber: multiResult.results[0].serialNumber, // 保持兼容性，使用第一个结果
              confidence: multiResult.results[0].confidence,
              status: 'success',
              timestamp: Date.now(),
              processingTime: multiResult.processingTime,
              originalFileName: file.name,
              qrType: multiResult.results[0].qrType,
              qrDescription: multiResult.results[0].qrDescription,
              qrResults: multiResult.results,
              totalFound: multiResult.totalFound
            });
            
            if (multiResult.results.length === 1) {
              toast.success(`识别成功: ${multiResult.results[0].qrDescription || '二维码'}`);
            } else {
              toast.success(`识别成功: 发现 ${multiResult.totalFound} 个二维码`);
            }
          } else {
            // 没有找到二维码，尝试单个识别作为后备
            const result = await qrService.recognizeImage(imageData);
            const validation = qrService.validateQRData(result.serialNumber);
            
            addResult({
              id: Date.now().toString(),
              image: imageData,
              serialNumber: result.serialNumber,
              confidence: result.confidence,
              status: result.serialNumber ? 'success' : 'failed',
              timestamp: Date.now(),
              processingTime: result.processingTime,
              originalFileName: file.name,
              qrType: validation.type,
              qrDescription: validation.description
            });
            
            if (result.serialNumber) {
              toast.success(`识别成功: ${validation.description}`);
            } else {
              toast.error('未能识别出二维码');
            }
          }
        } catch (error) {
          console.error('识别失败:', error);
          toast.error('识别失败，请重试');
        } finally {
          setIsProcessing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('文件读取失败:', error);
      toast.error('文件读取失败');
      setIsProcessing(false);
    }
    
    // 清空input值，允许重复选择同一文件
    event.target.value = '';
  };

  if (showCamera) {
    return (
      <div className="min-h-screen bg-black">
        <CameraComponent
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {/* 处理中遮罩 */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex flex-col items-center space-y-4">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-700">正在识别二维码...</p>
          </div>
        </div>
      )}
      
      <div className="container mx-auto px-4 py-6 max-w-md">
        {/* 头部 */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <QrCode className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            二维码识别工具
          </h1>
          <p className="text-gray-600">
            快速识别二维码信息，支持拍照和批量处理
          </p>
        </div>

        {/* 统计卡片 */}
        {totalCount > 0 && (
          <div className="bg-white rounded-xl p-4 mb-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">识别统计</p>
                <p className="text-2xl font-bold text-gray-900">
                  {successCount}/{totalCount}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${totalCount > 0 ? (successCount / totalCount) * 100 : 0}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                成功率: {totalCount > 0 ? ((successCount / totalCount) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>
        )}

        {/* 快速操作 */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <button
            onClick={handleQuickPhoto}
            className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow active:scale-95 transform transition-transform"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Camera className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">快速拍照</h3>
            <p className="text-sm text-gray-600">拍照识别二维码</p>
          </button>
          
          <button
            onClick={handleQuickUpload}
            className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow active:scale-95 transform transition-transform"
          >
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Upload className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">选择图片</h3>
            <p className="text-sm text-gray-600">从相册选择</p>
          </button>
        </div>

        {/* 功能导航 */}
        <div className="space-y-3 mb-8">
          <button
            onClick={() => navigate('/batch')}
            className="w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center space-x-4"
          >
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Upload className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-gray-900">批量识别</h3>
              <p className="text-sm text-gray-600">一次处理多张图片</p>
            </div>
          </button>
          
          <button
            onClick={() => navigate('/history')}
            className="w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center space-x-4"
          >
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <History className="w-5 h-5 text-orange-600" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-gray-900">历史记录</h3>
              <p className="text-sm text-gray-600">查看识别历史</p>
            </div>
          </button>
          
          <button
            onClick={() => navigate('/settings')}
            className="w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center space-x-4"
          >
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <Settings className="w-5 h-5 text-gray-600" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-gray-900">设置</h3>
              <p className="text-sm text-gray-600">应用设置和偏好</p>
            </div>
          </button>
        </div>

        {/* 最近结果 */}
        {recentResults.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">最近识别</h3>
              <button
                onClick={() => navigate('/history')}
                className="text-sm text-blue-500 hover:text-blue-700"
              >
                查看全部
              </button>
            </div>
            
            <div className="space-y-3">
              {recentResults.map((result) => (
                <div key={result.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
                  <img
                    src={result.image}
                    alt="识别图片"
                    className="w-10 h-10 object-cover rounded-lg"
                  />
                  <div className="flex-1 min-w-0">
                    {result.qrResults && result.qrResults.length > 0 ? (
                      <>
                        <p className={cn(
                          'text-sm font-medium truncate',
                          result.status === 'success' ? 'text-gray-900' : 'text-gray-500'
                        )}>
                          {result.qrResults.length === 1 
                            ? result.qrResults[0].serialNumber 
                            : `发现 ${result.totalFound || result.qrResults.length} 个二维码`
                          }
                        </p>
                        {result.qrResults.length === 1 && result.qrResults[0].qrDescription && (
                          <p className="text-xs text-blue-500">
                            {result.qrResults[0].qrDescription}
                          </p>
                        )}
                        {result.qrResults.length > 1 && (
                          <p className="text-xs text-blue-500">
                            多个二维码: {result.qrResults.map(qr => qr.qrDescription || '二维码').join(', ')}
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className={cn(
                          'text-sm font-medium truncate',
                          result.status === 'success' ? 'text-gray-900' : 'text-gray-500'
                        )}>
                          {result.serialNumber || '识别失败'}
                        </p>
                        {result.qrDescription && (
                          <p className="text-xs text-blue-500">
                            {result.qrDescription}
                          </p>
                        )}
                      </>
                    )}
                    <p className="text-xs text-gray-500">
                      {new Date(result.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div className={cn(
                    'w-2 h-2 rounded-full',
                    result.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                  )} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};