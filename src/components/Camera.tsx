import React, { useRef, useEffect, useState } from 'react';
import { Camera as CameraIcon, FlashlightOff, RotateCcw, X, RefreshCw, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';
import { qrService } from '../services/qrService';
import { toast } from 'sonner';

interface CameraProps {
  onCapture: (imageData: string) => void;
  onClose: () => void;
  className?: string;
}

export const Camera: React.FC<CameraProps> = ({ onCapture, onClose, className }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [flashEnabled, setFlashEnabled] = useState(false);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const startCamera = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 检查基本支持
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('您的浏览器不支持相机功能，请使用现代浏览器（Chrome、Firefox、Safari、Edge）');
      }

      // 检查安全上下文 - 摄像头需要HTTPS或localhost
      const isSecureContext = window.isSecureContext;
      const currentUrl = window.location.href;
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const isIPAddress = /^\d+\.\d+\.\d+\.\d+$/.test(window.location.hostname);
      
      if (!isSecureContext && !isLocalhost) {
        if (isIPAddress) {
          throw new Error(`摄像头访问需要安全环境。当前使用IP地址访问（${window.location.hostname}），浏览器出于安全考虑禁止摄像头访问。请使用以下方式之一：\n\n1. 使用 https:// 访问（推荐）\n2. 改用 http://localhost:5174/ 访问\n3. 部署到支持HTTPS的服务器`);
        } else {
          throw new Error('摄像头访问需要HTTPS安全连接或localhost环境');
        }
      }

      // 相机配置
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          aspectRatio: { ideal: 16/9 },
          frameRate: { ideal: 30, min: 15 }
        }
      };

      // 请求相机访问
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
        
        // 优化视频质量
        videoRef.current.onloadedmetadata = () => {
          const track = mediaStream.getVideoTracks()[0];
          if (track) {
            track.applyConstraints({
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              frameRate: { ideal: 30 }
            }).catch(() => {});
          }
        };
      }
    } catch (err: any) {
      console.error('相机启动失败:', err);
      
      let errorMessage = '无法访问相机';
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = '相机权限被拒绝，请在浏览器设置中允许相机访问';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = '未找到可用的相机设备，请检查相机是否正常连接';
      } else if (err.name === 'NotSupportedError') {
        errorMessage = '浏览器不支持相机功能，请使用现代浏览器';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage = '相机被其他应用占用，请关闭其他使用相机的程序';
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = '相机不支持请求的配置，请尝试切换相机';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // 设置高质量canvas
    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    
    // 绘制当前帧
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      // 尝试识别二维码
      const result = await qrService.recognizeImage(canvas);
      if (result.serialNumber) {
        onCapture(canvas.toDataURL('image/jpeg', 0.95));
        toast.success(`识别成功！${result.qrDescription}`);
      } else {
        const imageData = canvas.toDataURL('image/jpeg', 0.9);
        onCapture(imageData);
        toast.warning('未识别到二维码，图片已保存，可稍后重试');
      }
    } catch (error) {
      console.error('二维码识别失败:', error);
      const imageData = canvas.toDataURL('image/jpeg', 0.9);
      onCapture(imageData);
      toast.error('识别失败，图片已保存，请检查二维码是否清晰');
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const toggleFlash = async () => {
    if (!stream) return;

    try {
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities();
      
      if ('torch' in capabilities) {
        await track.applyConstraints({
          advanced: [{ torch: !flashEnabled } as any]
        });
        setFlashEnabled(!flashEnabled);
      }
    } catch (error) {
      console.warn('设备不支持闪光灯控制');
    }
  };

  const retryCamera = () => {
    startCamera();
  };

  if (error) {
    return (
      <div className={cn('fixed inset-0 bg-black z-50 flex items-center justify-center', className)}>
        <div className="text-center text-white p-6 max-w-md mx-auto">
          <div className="text-red-400 mb-6">
            <AlertTriangle className="w-16 h-16 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">相机访问失败</h2>
            <p className="text-lg mb-4">{error}</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 mb-6 text-left">
            <h3 className="text-lg font-semibold mb-3">解决方案：</h3>
            {error.includes('IP地址访问') ? (
              <div className="space-y-3">
                <div className="bg-yellow-900/30 border border-yellow-600 rounded p-3">
                  <p className="text-yellow-200 text-sm mb-2">⚠️ 安全限制：浏览器禁止在非HTTPS的IP地址上访问摄像头</p>
                </div>
                <div className="space-y-2">
                  <div className="bg-green-900/30 border border-green-600 rounded p-3">
                    <p className="text-green-200 font-medium text-sm mb-1">✅ 推荐方案：</p>
                    <p className="text-green-200 text-sm">部署到HTTPS环境（如Vercel、Netlify等）</p>
                  </div>
                  <div className="bg-blue-900/30 border border-blue-600 rounded p-3">
                     <p className="text-blue-200 font-medium text-sm mb-1">🔧 临时方案：</p>
                     <p className="text-blue-200 text-sm mb-2">改用 localhost 访问：</p>
                     <div className="flex items-center space-x-2">
                       <code className="bg-gray-700 px-2 py-1 rounded text-xs flex-1">http://localhost:5174/</code>
                       <button
                         onClick={() => {
                           const localhostUrl = `http://localhost:${window.location.port || '5174'}/`;
                           window.open(localhostUrl, '_blank');
                         }}
                         className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs transition-colors"
                       >
                         打开
                       </button>
                     </div>
                   </div>
                </div>
              </div>
            ) : (
              <ul className="list-disc list-inside space-y-2 text-sm text-gray-300">
                <li>点击浏览器地址栏的相机图标，选择"允许"</li>
                <li>确保没有其他应用正在使用相机</li>
                <li>尝试刷新页面重新授权</li>
                <li>检查系统相机权限设置</li>
                <li>如果是HTTPS问题，请使用https://访问</li>
                <li>尝试使用其他现代浏览器（Chrome、Firefox、Safari、Edge）</li>
              </ul>
            )}
          </div>
          
          <div className="flex flex-col space-y-3">
            <button
              onClick={retryCamera}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center justify-center"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              重新尝试
            </button>
            
            <button
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              关闭相机
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('fixed inset-0 bg-black z-50', className)}>
      <div className="relative w-full h-full">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p>正在启动相机...</p>
            </div>
          </div>
        )}
        
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted
        />
        
        <canvas ref={canvasRef} className="hidden" />
        
        {/* 顶部控制栏 */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent">
          <div className="flex justify-between items-center">
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="flex space-x-2">
              <button
                onClick={toggleFlash}
                className={cn(
                  'p-2 rounded-full text-white transition-colors',
                  flashEnabled ? 'bg-yellow-500' : 'bg-black/30 hover:bg-black/50'
                )}
              >
                <FlashlightOff className="w-6 h-6" />
              </button>
              
              <button
                onClick={toggleCamera}
                className="p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
              >
                <RotateCcw className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
        
        {/* 底部拍照按钮 */}
        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/50 to-transparent">
          <div className="flex justify-center">
            <button
              onClick={capturePhoto}
              className="w-20 h-20 rounded-full border-4 border-white bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center"
              disabled={isLoading}
            >
              <div className="w-16 h-16 rounded-full bg-white"></div>
            </button>
          </div>
        </div>
        
        {/* 取景框 */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-80 h-60 border-2 border-white/50 rounded-lg">
              <div className="relative w-full h-full">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-400"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-400"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-400"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-400"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Camera;