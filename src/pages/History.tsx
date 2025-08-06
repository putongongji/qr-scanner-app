import React, { useState, useMemo } from 'react';
import { ArrowLeft, Search, Filter, Calendar, Download, Trash2, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ResultDisplay, RecognitionResult } from '../components/ResultDisplay';
import { useAppStore } from '../store/useAppStore';
import { qrService } from '../services/qrService';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

type FilterType = 'all' | 'success' | 'failed';
type SortType = 'newest' | 'oldest' | 'confidence';

export const History: React.FC = () => {
  const navigate = useNavigate();
  const { results, removeResult, clearHistory, addResult } = useAppStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortType, setSortType] = useState<SortType>('newest');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set());

  // 过滤和排序结果
  const filteredResults = useMemo(() => {
    let filtered = [...results];

    // 文本搜索
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(result => 
        result.serialNumber.toLowerCase().includes(query) ||
        (result.qrDescription && result.qrDescription.toLowerCase().includes(query)) ||
        (result.originalFileName && result.originalFileName.toLowerCase().includes(query))
      );
    }

    // 状态筛选
    if (filterType !== 'all') {
      filtered = filtered.filter(result => result.status === filterType);
    }

    // 日期范围筛选
    if (dateRange.start) {
      const startDate = new Date(dateRange.start).getTime();
      filtered = filtered.filter(result => result.timestamp >= startDate);
    }
    if (dateRange.end) {
      const endDate = new Date(dateRange.end).getTime() + 24 * 60 * 60 * 1000; // 包含整天
      filtered = filtered.filter(result => result.timestamp < endDate);
    }

    // 排序
    switch (sortType) {
      case 'newest':
        filtered.sort((a, b) => b.timestamp - a.timestamp);
        break;
      case 'oldest':
        filtered.sort((a, b) => a.timestamp - b.timestamp);
        break;
      case 'confidence':
        filtered.sort((a, b) => b.confidence - a.confidence);
        break;
    }

    return filtered;
  }, [results, searchQuery, filterType, sortType, dateRange]);

  // 统计信息
  const stats = useMemo(() => {
    const total = results.length;
    const success = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const successRate = total > 0 ? (success / total) * 100 : 0;
    
    return { total, success, failed, successRate };
  }, [results]);

  const handleRetry = async (result: RecognitionResult) => {
    try {
      const qrResult = await qrService.recognizeImage(result.image);
      const newResult: RecognitionResult = {
        ...result,
        id: Date.now().toString(),
        serialNumber: qrResult.serialNumber,
        qrType: qrResult.qrType as 'URL' | 'TEXT' | 'EMAIL' | 'PHONE' | 'SMS' | 'WIFI' | 'VCARD' | 'UNKNOWN',
        qrDescription: qrResult.qrDescription,
        confidence: qrResult.confidence,
        status: qrResult.serialNumber ? 'success' : 'failed',
        timestamp: Date.now(),
        processingTime: qrResult.processingTime
      };
      
      addResult(newResult);
      
      if (newResult.status === 'success') {
        toast.success(`重试成功: ${newResult.qrDescription || newResult.serialNumber}`);
      } else {
        toast.error('重试仍然失败');
      }
    } catch (error) {
      console.error('重试失败:', error);
      toast.error('重试失败');
    }
  };

  const handleRemove = (id: string) => {
    removeResult(id);
    toast.success('已删除记录');
  };

  const handleClearAll = () => {
    if (window.confirm('确定要清空所有历史记录吗？此操作不可恢复。')) {
      clearHistory();
      toast.success('已清空历史记录');
    }
  };

  const handleBatchDelete = () => {
    if (selectedResults.size === 0) {
      toast.error('请先选择要删除的记录');
      return;
    }
    
    if (window.confirm(`确定要删除选中的 ${selectedResults.size} 条记录吗？`)) {
      selectedResults.forEach(id => removeResult(id));
      setSelectedResults(new Set());
      toast.success(`已删除 ${selectedResults.size} 条记录`);
    }
  };

  const exportResults = () => {
    if (filteredResults.length === 0) {
      toast.error('没有可导出的数据');
      return;
    }

    const data = filteredResults.map(result => ({
      二维码内容: result.serialNumber || '识别失败',
      二维码类型: result.qrType || '-',
      描述: result.qrDescription || '-',
      置信度: result.confidence,
      状态: result.status === 'success' ? '成功' : result.status === 'failed' ? '失败' : '处理中',
      处理时间: result.processingTime ? `${result.processingTime}ms` : '-',
      文件名: result.originalFileName || '-',
      时间戳: new Date(result.timestamp).toLocaleString()
    }));

    const csvContent = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `历史记录_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    
    toast.success('历史记录已导出');
  };

  const resetFilters = () => {
    setSearchQuery('');
    setFilterType('all');
    setSortType('newest');
    setDateRange({ start: '', end: '' });
    toast.info('已重置筛选条件');
  };

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
                <h1 className="text-xl font-bold text-gray-900">历史记录</h1>
                <p className="text-sm text-gray-600">
                  共 {stats.total} 条记录，成功率 {stats.successRate.toFixed(1)}%
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  showFilters ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
                )}
              >
                <Filter className="w-5 h-5" />
              </button>
              
              {results.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* 统计卡片 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">总记录</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-bold text-green-600">{stats.success}</div>
            <div className="text-sm text-gray-600">成功识别</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <div className="text-sm text-gray-600">识别失败</div>
          </div>
        </div>

        {/* 搜索和筛选 */}
        <div className="bg-white rounded-lg p-4 shadow-sm mb-6">
          {/* 搜索框 */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索二维码内容或文件名..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 筛选选项 */}
          {showFilters && (
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 状态筛选 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    状态筛选
                  </label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as FilterType)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">全部</option>
                    <option value="success">成功</option>
                    <option value="failed">失败</option>
                  </select>
                </div>

                {/* 排序方式 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    排序方式
                  </label>
                  <select
                    value={sortType}
                    onChange={(e) => setSortType(e.target.value as SortType)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="newest">最新优先</option>
                    <option value="oldest">最旧优先</option>
                    <option value="confidence">置信度优先</option>
                  </select>
                </div>

                {/* 操作按钮 */}
                <div className="flex items-end space-x-2">
                  <button
                    onClick={resetFilters}
                    className="flex items-center space-x-1 px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>重置</span>
                  </button>
                  
                  <button
                    onClick={exportResults}
                    disabled={filteredResults.length === 0}
                    className="flex items-center space-x-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>导出</span>
                  </button>
                </div>
              </div>

              {/* 日期范围 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    开始日期
                  </label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    结束日期
                  </label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 批量操作 */}
        {filteredResults.length > 0 && (
          <div className="bg-white rounded-lg p-4 shadow-sm mb-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                显示 {filteredResults.length} 条记录
                {filteredResults.length !== results.length && (
                  <span className="ml-2 text-blue-600">
                    (已筛选，共 {results.length} 条)
                  </span>
                )}
              </div>
              
              {selectedResults.size > 0 && (
                <button
                  onClick={handleBatchDelete}
                  className="flex items-center space-x-1 px-3 py-1 text-red-600 hover:text-red-800 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>删除选中 ({selectedResults.size})</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* 结果列表 */}
        {filteredResults.length > 0 ? (
          <div className="bg-white rounded-lg shadow-sm">
            <ResultDisplay
              results={filteredResults}
              onRetry={handleRetry}
              onRemove={handleRemove}
            />
          </div>
        ) : (
          <div className="bg-white rounded-lg p-12 shadow-sm text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {results.length === 0 ? '暂无历史记录' : '没有符合条件的记录'}
            </h3>
            <p className="text-gray-600 mb-6">
              {results.length === 0 
                ? '开始使用二维码识别功能，记录会自动保存在这里'
                : '尝试调整筛选条件或搜索关键词'
              }
            </p>
            {results.length === 0 && (
              <button
                onClick={() => navigate('/')}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                开始识别
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};