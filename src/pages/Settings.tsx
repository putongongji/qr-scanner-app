import React, { useState } from 'react';
import { ArrowLeft, Save, RotateCcw, Info, Smartphone, Camera, Zap, Database, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { settings, updateSettings, clearHistory } = useAppStore();
  const [localSettings, setLocalSettings] = useState(settings);
  const [hasChanges, setHasChanges] = useState(false);

  const handleSettingChange = (key: keyof typeof settings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateSettings(localSettings);
    setHasChanges(false);
    toast.success('设置已保存');
  };

  const handleReset = () => {
    if (window.confirm('确定要重置所有设置为默认值吗？')) {
      const defaultSettings = {
        language: 'zh-CN' as const,
        ocrLanguage: 'eng+chi_sim' as const,
        confidence: 0.7,
        autoSave: true,
        maxBatchSize: 20,
        processingDelay: 500,
        imageQuality: 0.8,
        enableFlash: true,
        autoFocus: true,
        serialNumberPatterns: [
          '[A-Z0-9]{8,}',
          '[A-Z]{2}[0-9]{6,}',
          '[0-9]{10,}'
        ],
        qrCodeFormats: ['QR_CODE', 'DATA_MATRIX', 'AZTEC'] as ('QR_CODE' | 'DATA_MATRIX' | 'AZTEC' | 'PDF_417')[],
        enableVibration: true,
        enableSound: true
      };
      setLocalSettings(defaultSettings);
      updateSettings(defaultSettings);
      setHasChanges(false);
      toast.success('设置已重置为默认值');
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('确定要清空所有历史记录吗？此操作不可恢复。')) {
      clearHistory();
      toast.success('历史记录已清空');
    }
  };

  const ocrLanguageOptions = [
    { value: 'eng', label: '英文' },
    { value: 'chi_sim', label: '简体中文' },
    { value: 'eng+chi_sim', label: '英文 + 简体中文' },
    { value: 'chi_tra', label: '繁体中文' },
    { value: 'jpn', label: '日文' },
    { value: 'kor', label: '韩文' }
  ];

  const languageOptions = [
    { value: 'zh-CN', label: '简体中文' },
    { value: 'en-US', label: 'English' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">设置</h1>
                <p className="text-sm text-gray-600">应用配置和偏好设置</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {hasChanges && (
                <button
                  onClick={handleSave}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>保存</span>
                </button>
              )}
              
              <button
                onClick={handleReset}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>重置</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        {/* 基本设置 */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">基本设置</h2>
          </div>
          
          <div className="space-y-6">
            {/* 界面语言 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                界面语言
              </label>
              <select
                value={localSettings.language}
                onChange={(e) => handleSettingChange('language', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {languageOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 自动保存 */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  自动保存识别结果
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  识别完成后自动保存到历史记录
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.autoSave}
                  onChange={(e) => handleSettingChange('autoSave', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* OCR 设置 */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <Globe className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">OCR 识别设置</h2>
          </div>
          
          <div className="space-y-6">
            {/* 二维码格式 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                支持的二维码格式
              </label>
              <div className="space-y-2">
                {localSettings.qrCodeFormats.map((format) => (
                  <label key={format} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={true}
                      readOnly
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{format}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                当前支持的二维码格式类型
              </p>
            </div>

            {/* 置信度阈值 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                置信度阈值: {(localSettings.confidence * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={localSettings.confidence}
                onChange={(e) => handleSettingChange('confidence', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <p className="text-xs text-gray-500 mt-1">
                低于此置信度的识别结果将被标记为不可靠
              </p>
            </div>

            {/* 振动反馈 */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  振动反馈
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  识别成功时提供振动反馈
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.enableVibration}
                  onChange={(e) => handleSettingChange('enableVibration', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* 声音提示 */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  声音提示
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  识别成功时播放提示音
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.enableSound}
                  onChange={(e) => handleSettingChange('enableSound', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* 相机设置 */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <Camera className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">相机设置</h2>
          </div>
          
          <div className="space-y-6">
            {/* 图片质量 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                图片质量: {(localSettings.imageQuality * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={localSettings.imageQuality}
                onChange={(e) => handleSettingChange('imageQuality', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <p className="text-xs text-gray-500 mt-1">
                较高的质量可能提高识别准确率，但会增加处理时间
              </p>
            </div>

            {/* 启用闪光灯 */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  启用闪光灯
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  在光线不足时自动启用闪光灯
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.enableFlash}
                  onChange={(e) => handleSettingChange('enableFlash', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* 自动对焦 */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  自动对焦
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  拍照时自动对焦以获得清晰图像
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.autoFocus}
                  onChange={(e) => handleSettingChange('autoFocus', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* 批量处理设置 */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-orange-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">批量处理设置</h2>
          </div>
          
          <div className="space-y-6">
            {/* 最大批量大小 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                最大批量大小: {localSettings.maxBatchSize} 张
              </label>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={localSettings.maxBatchSize}
                onChange={(e) => handleSettingChange('maxBatchSize', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <p className="text-xs text-gray-500 mt-1">
                一次批量处理的最大图片数量
              </p>
            </div>

            {/* 处理延迟 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                处理延迟: {localSettings.processingDelay}ms
              </label>
              <input
                type="range"
                min="0"
                max="2000"
                step="100"
                value={localSettings.processingDelay}
                onChange={(e) => handleSettingChange('processingDelay', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <p className="text-xs text-gray-500 mt-1">
                批量处理时每张图片之间的延迟时间，避免过度占用资源
              </p>
            </div>
          </div>
        </div>

        {/* 数据管理 */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">数据管理</h2>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-800 mb-1">
                    清空历史记录
                  </h3>
                  <p className="text-sm text-red-700 mb-3">
                    此操作将永久删除所有识别历史记录，无法恢复。
                  </p>
                  <button
                    onClick={handleClearHistory}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    清空历史记录
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 应用信息 */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <Info className="w-5 h-5 text-gray-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">应用信息</h2>
          </div>
          
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>应用名称</span>
              <span>二维码识别工具</span>
            </div>
            <div className="flex justify-between">
              <span>版本号</span>
              <span>1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span>识别引擎</span>
              <span>jsQR</span>
            </div>
            <div className="flex justify-between">
              <span>开发框架</span>
              <span>React + Vite</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};