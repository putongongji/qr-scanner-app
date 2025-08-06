import Tesseract from 'tesseract.js';

export interface OCRResult {
  serialNumber: string;
  confidence: number;
  processingTime: number;
}

class OCRService {
  private worker: Tesseract.Worker | null = null;
  private isInitialized = false;

  /**
   * 初始化OCR引擎
   */
  async initialize(language: string = 'eng+chi_sim'): Promise<void> {
    if (this.isInitialized && this.worker) {
      return;
    }

    try {
      this.worker = await Tesseract.createWorker(language, 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${(m.progress * 100).toFixed(1)}%`);
          }
        }
      });

      await this.worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
      });

      this.isInitialized = true;
      console.log('OCR引擎初始化完成');
    } catch (error) {
      console.error('OCR引擎初始化失败:', error);
      throw new Error('OCR引擎初始化失败');
    }
  }

  /**
   * 识别单张图片
   */
  async recognizeImage(imageData: string): Promise<OCRResult> {
    if (!this.isInitialized || !this.worker) {
      await this.initialize();
    }

    const startTime = Date.now();

    try {
      const { data } = await this.worker!.recognize(imageData);
      const processingTime = Date.now() - startTime;
      
      // 提取序列号
      const serialNumber = this.extractSerialNumber(data.text);
      
      return {
        serialNumber,
        confidence: data.confidence / 100, // 转换为0-1范围
        processingTime
      };
    } catch (error) {
      console.error('图片识别失败:', error);
      throw new Error('图片识别失败');
    }
  }

  /**
   * 批量识别图片
   */
  async recognizeImages(imageDataList: string[]): Promise<OCRResult[]> {
    const results: OCRResult[] = [];
    
    for (const imageData of imageDataList) {
      try {
        const result = await this.recognizeImage(imageData);
        results.push(result);
      } catch (error) {
        console.error('批量识别中的图片处理失败:', error);
        results.push({
          serialNumber: '',
          confidence: 0,
          processingTime: 0
        });
      }
    }
    
    return results;
  }

  /**
   * 从识别文本中提取序列号
   */
  private extractSerialNumber(text: string): string {
    if (!text) return '';
    
    // 清理文本
    const cleanText = text
      .replace(/\s+/g, '') // 移除空格
      .replace(/[^A-Za-z0-9]/g, '') // 只保留字母和数字
      .toUpperCase();
    
    // 常见序列号模式
    const patterns = [
      /[A-Z0-9]{8,}/g,           // 8位以上字母数字组合
      /[A-Z]{2}[0-9]{6,}/g,      // 2位字母+6位以上数字
      /[0-9]{10,}/g,             // 10位以上纯数字
      /[A-Z]{1}[0-9]{7,}/g,      // 1位字母+7位以上数字
      /[0-9]{4}[A-Z]{2}[0-9]{4}/g, // 4数字+2字母+4数字
    ];
    
    // 尝试匹配各种模式
    for (const pattern of patterns) {
      const matches = cleanText.match(pattern);
      if (matches && matches.length > 0) {
        // 返回最长的匹配项
        return matches.reduce((longest, current) => 
          current.length > longest.length ? current : longest
        );
      }
    }
    
    // 如果没有匹配到特定模式，返回最长的连续字母数字串
    const allMatches = cleanText.match(/[A-Z0-9]+/g);
    if (allMatches && allMatches.length > 0) {
      const longest = allMatches.reduce((longest, current) => 
        current.length > longest.length ? current : longest
      );
      
      // 只返回长度大于等于6的字符串
      return longest.length >= 6 ? longest : '';
    }
    
    return '';
  }

  /**
   * 销毁OCR引擎
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      console.log('OCR引擎已销毁');
    }
  }

  /**
   * 检查是否已初始化
   */
  get initialized(): boolean {
    return this.isInitialized;
  }
}

// 导出单例实例
export const ocrService = new OCRService();