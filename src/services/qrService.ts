import jsQR from 'jsqr';
import QrScanner from 'qr-scanner';

export interface QRResult {
  serialNumber: string;
  qrType?: string;
  qrDescription?: string;
  confidence: number;
  processingTime: number;
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface MultiQRResult {
  results: QRResult[];
  totalFound: number;
  processingTime: number;
}

class QRService {
  private isInitialized = false;

  /**
   * 初始化二维码识别引擎
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // 检查浏览器支持
      if (!QrScanner.hasCamera()) {
        console.warn('当前设备不支持相机功能');
      }
      
      this.isInitialized = true;
      console.log('二维码识别引擎初始化完成');
    } catch (error) {
      console.error('二维码识别引擎初始化失败:', error);
      throw new Error('二维码识别引擎初始化失败');
    }
  }

  /**
   * 识别单张图片中的二维码（优化版本）
   */
  async recognizeImage(imageData: string | HTMLCanvasElement): Promise<QRResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    const TIMEOUT_MS = 1500; // 单图识别1.5秒超时

    try {
      // 使用Promise.race实现超时控制
      const recognitionPromise = this.performFastSingleRecognition(imageData, startTime);
      const timeoutPromise = new Promise<QRResult>((_, reject) => {
        setTimeout(() => reject(new Error('单图识别超时')), TIMEOUT_MS);
      });

      const result = await Promise.race([recognitionPromise, timeoutPromise]);
      result.processingTime = Date.now() - startTime;
      return result;
    } catch (error) {
      console.error('二维码识别失败:', error);
      return {
        serialNumber: '',
        qrType: 'unknown',
        qrDescription: error instanceof Error && error.message.includes('超时') ? '识别超时' : '识别失败',
        confidence: 0,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * 执行快速单图识别
   */
  private async performFastSingleRecognition(imageData: string | HTMLCanvasElement, startTime: number): Promise<QRResult> {
    // 策略1: 并行尝试快速模式
    const fastPromises = [
      this.recognizeWithQrScannerFast(imageData),
      this.recognizeWithJsQRFast(imageData)
    ];

    const fastResults = await Promise.allSettled(fastPromises);
    
    // 检查快速识别结果
    for (const result of fastResults) {
      if (result.status === 'fulfilled' && result.value.serialNumber) {
        return result.value;
      }
    }

    // 如果快速识别失败且时间充足，尝试完整识别
    if (Date.now() - startTime < 800) {
      try {
        // 方法1: 使用 QrScanner
        let recognitionResult: string;
        try {
          recognitionResult = await QrScanner.scanImage(imageData);
        } catch (qrScannerError) {
          // 方法2: 使用 jsQR 作为备选
          console.log('QrScanner 识别失败，尝试使用 jsQR');
          if (typeof imageData === 'string') {
            recognitionResult = await this.recognizeWithJsQR(imageData);
          } else {
            recognitionResult = await this.recognizeCanvasWithJsQR(imageData);
          }
        }

        if (recognitionResult) {
          const qrType = this.detectQRType(recognitionResult);
          const description = this.generateDescription(recognitionResult, qrType);
          
          return {
            serialNumber: recognitionResult,
            qrType,
            qrDescription: description,
            confidence: 1.0,
            processingTime: 0
          };
        }
      } catch (error) {
        // 忽略错误，继续到返回空结果
      }
    }

    return {
      serialNumber: '',
      qrType: 'unknown',
      qrDescription: '未识别到二维码',
      confidence: 0,
      processingTime: 0
    };
  }

  /**
   * QrScanner快速识别模式
   */
  private async recognizeWithQrScannerFast(imageData: string | HTMLCanvasElement): Promise<QRResult> {
    try {
      const result = await QrScanner.scanImage(imageData);
      
      if (result) {
        const qrType = this.detectQRType(result);
        const description = this.generateDescription(result, qrType);
        
        return {
          serialNumber: result,
          qrType,
          qrDescription: description,
          confidence: 1.0,
          processingTime: 0
        };
      }
    } catch (error) {
      // 忽略错误
    }
    
    return {
      serialNumber: '',
      qrType: 'unknown',
      qrDescription: '',
      confidence: 0,
      processingTime: 0
    };
  }

  /**
   * jsQR快速识别模式
   */
  private async recognizeWithJsQRFast(imageData: string | HTMLCanvasElement): Promise<QRResult> {
    try {
      let canvas: HTMLCanvasElement;
      let ctx: CanvasRenderingContext2D;

      if (typeof imageData === 'string') {
        const result = await this.createCanvasFromImageData(imageData);
        canvas = result.canvas;
        ctx = result.ctx;
      } else {
        canvas = imageData;
        ctx = canvas.getContext('2d')!;
      }
      
      const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // 快速模式：只尝试原始图像，不进行图像处理
      const code = jsQR(imageDataObj.data, imageDataObj.width, imageDataObj.height, {
        inversionAttempts: 'dontInvert'
      });
      
      if (code) {
        const qrType = this.detectQRType(code.data);
        const description = this.generateDescription(code.data, qrType);
        
        return {
          serialNumber: code.data,
          qrType,
          qrDescription: description,
          confidence: 1.0,
          processingTime: 0
        };
      }
    } catch (error) {
      // 忽略错误
    }
    
    return {
      serialNumber: '',
      qrType: 'unknown',
      qrDescription: '',
      confidence: 0,
      processingTime: 0
    };
  }

  /**
   * 使用 jsQR 识别二维码（备选方案）
   */
  private async recognizeWithJsQR(imageData: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('无法创建 Canvas 上下文'));
            return;
          }

          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          // 尝试多种识别策略
          const result = this.tryMultipleRecognitionStrategies(canvas, ctx);
          if (result) {
            resolve(result);
          } else {
            reject(new Error('未检测到二维码'));
          }
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = imageData;
    });
  }

  /**
   * 尝试多种识别策略
   */
  private tryMultipleRecognitionStrategies(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): string | null {
    const originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // 策略1: 原始图像，启用所有反色尝试
    let code = jsQR(originalImageData.data, originalImageData.width, originalImageData.height, {
      inversionAttempts: 'attemptBoth',
    });
    if (code) return code.data;

    // 策略2: 增强对比度
    const enhancedImageData = this.enhanceContrast(originalImageData);
    code = jsQR(enhancedImageData.data, enhancedImageData.width, enhancedImageData.height, {
      inversionAttempts: 'attemptBoth',
    });
    if (code) return code.data;

    // 策略3: 调整亮度
    const brightenedImageData = this.adjustBrightness(originalImageData, 30);
    code = jsQR(brightenedImageData.data, brightenedImageData.width, brightenedImageData.height, {
      inversionAttempts: 'attemptBoth',
    });
    if (code) return code.data;

    // 策略4: 降低亮度
    const darkenedImageData = this.adjustBrightness(originalImageData, -30);
    code = jsQR(darkenedImageData.data, darkenedImageData.width, darkenedImageData.height, {
      inversionAttempts: 'attemptBoth',
    });
    if (code) return code.data;

    // 策略5: 锐化处理
    const sharpenedImageData = this.sharpenImage(originalImageData);
    code = jsQR(sharpenedImageData.data, sharpenedImageData.width, sharpenedImageData.height, {
      inversionAttempts: 'attemptBoth',
    });
    if (code) return code.data;

    // 策略6: 多尺度尝试
    const scales = [0.5, 0.75, 1.25, 1.5, 2.0];
    for (const scale of scales) {
      const scaledImageData = this.scaleImage(canvas, scale);
      if (scaledImageData) {
        code = jsQR(scaledImageData.data, scaledImageData.width, scaledImageData.height, {
          inversionAttempts: 'attemptBoth',
        });
        if (code) return code.data;
      }
    }

    return null;
  }

  /**
   * 增强图像对比度
   */
  private enhanceContrast(imageData: ImageData): ImageData {
    const data = new Uint8ClampedArray(imageData.data);
    const factor = 1.5; // 对比度增强因子
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, Math.max(0, (data[i] - 128) * factor + 128));     // R
      data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * factor + 128)); // G
      data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * factor + 128)); // B
    }
    
    return new ImageData(data, imageData.width, imageData.height);
  }

  /**
   * 调整图像亮度
   */
  private adjustBrightness(imageData: ImageData, brightness: number): ImageData {
    const data = new Uint8ClampedArray(imageData.data);
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, Math.max(0, data[i] + brightness));     // R
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + brightness)); // G
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + brightness)); // B
    }
    
    return new ImageData(data, imageData.width, imageData.height);
  }

  /**
   * 锐化图像
   */
  private sharpenImage(imageData: ImageData): ImageData {
    const data = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    const height = imageData.height;
    
    // 锐化卷积核
    const kernel = [
      0, -1, 0,
      -1, 5, -1,
      0, -1, 0
    ];
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) { // RGB channels
          let sum = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = ((y + ky) * width + (x + kx)) * 4 + c;
              sum += imageData.data[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
            }
          }
          const idx = (y * width + x) * 4 + c;
          data[idx] = Math.min(255, Math.max(0, sum));
        }
      }
    }
    
    return new ImageData(data, width, height);
  }

  /**
   * 缩放图像
   */
  private scaleImage(canvas: HTMLCanvasElement, scale: number): ImageData | null {
    try {
      const scaledCanvas = document.createElement('canvas');
      const scaledCtx = scaledCanvas.getContext('2d');
      if (!scaledCtx) return null;
      
      scaledCanvas.width = canvas.width * scale;
      scaledCanvas.height = canvas.height * scale;
      
      scaledCtx.imageSmoothingEnabled = false; // 保持锐利边缘
      scaledCtx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
      
      return scaledCtx.getImageData(0, 0, scaledCanvas.width, scaledCanvas.height);
    } catch (error) {
      console.error('图像缩放失败:', error);
      return null;
    }
  }

  /**
   * 识别单张图片中的多个二维码
   */
  async recognizeMultipleQRCodes(imageData: string | HTMLCanvasElement): Promise<MultiQRResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    const TIMEOUT_MS = 2000; // 2秒超时
    
    try {
      let canvas: HTMLCanvasElement;
      let ctx: CanvasRenderingContext2D;

      if (typeof imageData === 'string') {
        const result = await this.createCanvasFromImageData(imageData);
        canvas = result.canvas;
        ctx = result.ctx;
      } else {
        canvas = imageData;
        ctx = canvas.getContext('2d')!;
      }

      // 使用Promise.race实现超时控制
      const recognitionPromise = this.performOptimizedRecognition(canvas, ctx, startTime);
      const timeoutPromise = new Promise<QRResult[]>((_, reject) => {
        setTimeout(() => reject(new Error('识别超时')), TIMEOUT_MS);
      });

      const results = await Promise.race([recognitionPromise, timeoutPromise]);
      const processingTime = Date.now() - startTime;
      
      return {
        results,
        totalFound: results.length,
        processingTime
      };
    } catch (error) {
      console.error('多二维码识别失败:', error);
      const processingTime = Date.now() - startTime;
      return {
        results: [],
        totalFound: 0,
        processingTime
      };
    }
  }

  /**
   * 从base64图片数据创建canvas
   */
  private async createCanvasFromImageData(imageData: string): Promise<{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D}> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('无法创建 Canvas 上下文'));
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        resolve({ canvas, ctx });
      };
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = imageData;
    });
  }

  /**
   * 执行优化的识别流程
   */
  private async performOptimizedRecognition(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, startTime: number): Promise<QRResult[]> {
    const results: QRResult[] = [];
    const foundPositions = new Set<string>();
    
    // 策略1: 快速全图扫描（优先级最高）
    const fullImageResult = await this.quickFullImageScan(canvas, ctx);
    this.addUniqueResults(results, fullImageResult, foundPositions);
    
    // 如果已经找到结果且时间充足，继续寻找更多
    if (Date.now() - startTime < 1000) {
      // 策略2: 智能区域分割
      const regionResults = await this.smartRegionScan(canvas, ctx, foundPositions);
      this.addUniqueResults(results, regionResults, foundPositions);
    }
    
    // 如果时间仍然充足，使用滑动窗口补充
    if (Date.now() - startTime < 1500) {
      const slidingResults = await this.optimizedSlidingWindow(canvas, ctx, foundPositions);
      this.addUniqueResults(results, slidingResults, foundPositions);
    }
    
    return results;
  }

  /**
   * 快速全图扫描
   */
  private async quickFullImageScan(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): Promise<QRResult[]> {
    const results: QRResult[] = [];
    
    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // 并行尝试不同的图像处理策略
      const strategies = [
        () => imageData, // 原始图像
        () => this.enhanceContrast(imageData), // 增强对比度
        () => this.adjustBrightness(imageData, 20) // 轻微调整亮度
      ];
      
      const promises = strategies.map(async (strategy) => {
        try {
          const processedData = strategy();
          const code = jsQR(processedData.data, processedData.width, processedData.height, {
            inversionAttempts: 'dontInvert' // 快速模式
          });
          
          if (code) {
            const qrType = this.detectQRType(code.data);
            const description = this.generateDescription(code.data, qrType);
            
            return {
              serialNumber: code.data,
              qrType,
              qrDescription: description,
              confidence: 1.0,
              processingTime: 0,
              position: {
                x: code.location.topLeftCorner.x,
                y: code.location.topLeftCorner.y,
                width: Math.abs(code.location.topRightCorner.x - code.location.topLeftCorner.x),
                height: Math.abs(code.location.bottomLeftCorner.y - code.location.topLeftCorner.y)
              }
            };
          }
        } catch (error) {
          // 忽略错误
        }
        return null;
      });
      
      const strategyResults = await Promise.all(promises);
      results.push(...strategyResults.filter(r => r !== null) as QRResult[]);
      
    } catch (error) {
      console.error('全图扫描失败:', error);
    }
    
    return results;
  }

  /**
   * 智能区域扫描
   */
  private async smartRegionScan(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, foundPositions: Set<string>): Promise<QRResult[]> {
    const results: QRResult[] = [];
    const width = canvas.width;
    const height = canvas.height;
    
    // 将图像分为9个区域进行并行扫描
    const regions = [
      { x: 0, y: 0, w: width/3, h: height/3 },
      { x: width/3, y: 0, w: width/3, h: height/3 },
      { x: 2*width/3, y: 0, w: width/3, h: height/3 },
      { x: 0, y: height/3, w: width/3, h: height/3 },
      { x: width/3, y: height/3, w: width/3, h: height/3 },
      { x: 2*width/3, y: height/3, w: width/3, h: height/3 },
      { x: 0, y: 2*height/3, w: width/3, h: height/3 },
      { x: width/3, y: 2*height/3, w: width/3, h: height/3 },
      { x: 2*width/3, y: 2*height/3, w: width/3, h: height/3 }
    ];
    
    const promises = regions.map(async (region) => {
      try {
        const regionData = ctx.getImageData(region.x, region.y, region.w, region.h);
        const code = jsQR(regionData.data, regionData.width, regionData.height, {
          inversionAttempts: 'attemptBoth'
        });
        
        if (code) {
          const positionKey = `${Math.round(region.x + code.location.topLeftCorner.x)}_${Math.round(region.y + code.location.topLeftCorner.y)}`;
          
          if (!foundPositions.has(positionKey)) {
            const qrType = this.detectQRType(code.data);
            const description = this.generateDescription(code.data, qrType);
            
            return {
              serialNumber: code.data,
              qrType,
              qrDescription: description,
              confidence: 1.0,
              processingTime: 0,
              position: {
                x: region.x + code.location.topLeftCorner.x,
                y: region.y + code.location.topLeftCorner.y,
                width: Math.abs(code.location.topRightCorner.x - code.location.topLeftCorner.x),
                height: Math.abs(code.location.bottomLeftCorner.y - code.location.topLeftCorner.y)
              }
            };
          }
        }
      } catch (error) {
        // 忽略错误
      }
      return null;
    });
    
    const regionResults = await Promise.all(promises);
    results.push(...regionResults.filter(r => r !== null) as QRResult[]);
    
    return results;
  }

  /**
   * 优化的滑动窗口（仅在必要时使用）
   */
  private async optimizedSlidingWindow(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, foundPositions: Set<string>): Promise<QRResult[]> {
    const results: QRResult[] = [];
    const width = canvas.width;
    const height = canvas.height;
    
    // 使用更大的步长和更少的窗口大小
    const windowSize = Math.min(width, height) * 0.4;
    const stepSize = windowSize * 0.6; // 减少重叠
    
    const scanPromises: Promise<QRResult | null>[] = [];
    
    for (let y = 0; y <= height - windowSize; y += stepSize) {
      for (let x = 0; x <= width - windowSize; x += stepSize) {
        const positionKey = `${Math.round(x)}_${Math.round(y)}`;
        
        if (!foundPositions.has(positionKey)) {
          scanPromises.push(this.scanRegionAsync(ctx, x, y, windowSize, windowSize, x, y));
        }
        
        // 限制并发数量
        if (scanPromises.length >= 6) {
          const batchResults = await Promise.all(scanPromises);
          results.push(...batchResults.filter(r => r !== null) as QRResult[]);
          scanPromises.length = 0;
        }
      }
    }
    
    // 处理剩余的扫描任务
    if (scanPromises.length > 0) {
      const batchResults = await Promise.all(scanPromises);
      results.push(...batchResults.filter(r => r !== null) as QRResult[]);
    }
    
    return results;
  }

  /**
   * 异步扫描区域
   */
  private async scanRegionAsync(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, offsetX: number, offsetY: number): Promise<QRResult | null> {
    try {
      const regionImageData = ctx.getImageData(x, y, width, height);
      const code = jsQR(regionImageData.data, regionImageData.width, regionImageData.height, {
        inversionAttempts: 'dontInvert' // 快速模式
      });
      
      if (code) {
        const qrType = this.detectQRType(code.data);
        const description = this.generateDescription(code.data, qrType);
        
        return {
          serialNumber: code.data,
          qrType,
          qrDescription: description,
          confidence: 1.0,
          processingTime: 0,
          position: {
            x: offsetX + code.location.topLeftCorner.x,
            y: offsetY + code.location.topLeftCorner.y,
            width: Math.abs(code.location.topRightCorner.x - code.location.topLeftCorner.x),
            height: Math.abs(code.location.bottomLeftCorner.y - code.location.topLeftCorner.y)
          }
        };
      }
    } catch (error) {
      // 忽略错误
    }
    return null;
  }

  /**
   * 添加唯一结果
   */
  private addUniqueResults(results: QRResult[], newResults: QRResult[], foundPositions: Set<string>): void {
    for (const result of newResults) {
      const contentKey = result.serialNumber;
      const positionKey = result.position ? `${Math.round(result.position.x)}_${Math.round(result.position.y)}` : contentKey;
      
      // 基于内容和位置去重
      if (!results.some(r => r.serialNumber === contentKey) && !foundPositions.has(positionKey)) {
        results.push(result);
        foundPositions.add(positionKey);
        foundPositions.add(contentKey);
      }
    }
  }



  /**
   * 将图像分割为多个区域
   */
  private divideImageIntoRegions(width: number, height: number, rows: number, cols: number): Array<{x: number, y: number, width: number, height: number}> {
    const regions = [];
    const regionWidth = Math.floor(width / cols);
    const regionHeight = Math.floor(height / rows);
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        regions.push({
          x: col * regionWidth,
          y: row * regionHeight,
          width: regionWidth,
          height: regionHeight
        });
      }
    }
    
    return regions;
  }

  /**
   * 合并并去重识别结果
   */
  private mergeAndDeduplicateResults(results: QRResult[]): QRResult[] {
    const uniqueResults: QRResult[] = [];
    const seenData = new Set<string>();
    
    for (const result of results) {
      // 基于内容去重
      if (!seenData.has(result.serialNumber) && result.serialNumber) {
        seenData.add(result.serialNumber);
        uniqueResults.push(result);
      }
    }
    
    return uniqueResults;
  }

  /**
   * 批量识别图片中的二维码（优化版本）
   */
  async recognizeImages(imageDataList: string[], onProgress?: (completed: number, total: number) => void): Promise<QRResult[]> {
    const startTime = Date.now();
    const BATCH_SIZE = 3; // 并发处理3张图片
    const results: QRResult[] = new Array(imageDataList.length);
    
    // 分批并行处理
    for (let i = 0; i < imageDataList.length; i += BATCH_SIZE) {
      const batch = imageDataList.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (imageData, batchIndex) => {
        const globalIndex = i + batchIndex;
        try {
          const result = await this.recognizeImage(imageData);
          results[globalIndex] = result;
        } catch (error) {
          console.error(`批量识别第${globalIndex + 1}张图片失败:`, error);
          results[globalIndex] = {
            serialNumber: '',
            qrType: 'unknown',
            qrDescription: '识别失败',
            confidence: 0,
            processingTime: 0
          };
        }
        
        // 报告进度
        if (onProgress) {
          onProgress(globalIndex + 1, imageDataList.length);
        }
      });
      
      await Promise.all(batchPromises);
      
      // 如果总时间超过合理范围，提前结束
      if (Date.now() - startTime > imageDataList.length * 2000) {
        console.warn('批量识别超时，提前结束');
        break;
      }
    }
    
    const totalTime = Date.now() - startTime;
    console.log(`批量识别完成: ${imageDataList.length}张图片，耗时${totalTime}ms，平均${Math.round(totalTime / imageDataList.length)}ms/张`);
    
    return results.filter(r => r !== undefined);
  }

  /**
   * 从相机流中识别二维码
   */
  async scanFromCamera(videoElement: HTMLVideoElement): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // 首先尝试 QrScanner
      const result = await QrScanner.scanImage(videoElement);
      return result;
    } catch (qrScannerError) {
      console.log('QrScanner 相机识别失败，尝试使用 jsQR');
      
      try {
        // 备选方案：从视频元素创建canvas并使用jsQR
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('无法创建 Canvas 上下文');
        }
        
        canvas.width = videoElement.videoWidth || videoElement.width || 640;
        canvas.height = videoElement.videoHeight || videoElement.height || 480;
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        
        const result = this.tryMultipleRecognitionStrategies(canvas, ctx);
        if (result) {
          return result;
        } else {
          throw new Error('未检测到二维码');
        }
      } catch (jsQRError) {
        console.error('相机二维码识别完全失败:', jsQRError);
        throw new Error('相机二维码识别失败');
      }
    }
  }

  /**
   * 使用 jsQR 识别Canvas中的二维码
   */
  private async recognizeCanvasWithJsQR(canvas: HTMLCanvasElement): Promise<string> {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法创建 Canvas 上下文');
    }

    // 使用多种识别策略
    const result = this.tryMultipleRecognitionStrategies(canvas, ctx);
    if (result) {
      return result;
    } else {
      throw new Error('未检测到二维码');
    }
  }

  /**
   * 检测二维码类型
   */
  private detectQRType(data: string): string {
    if (!data) return 'unknown';

    // URL 格式
    if (/^https?:\/\/.+/.test(data)) {
      return 'URL';
    }

    // 邮箱格式
    if (/^mailto:.+@.+\..+/.test(data) || /^[^@]+@[^@]+\.[^@]+$/.test(data)) {
      return 'EMAIL';
    }

    // 电话格式
    if (/^tel:[+]?[0-9\-\s()]+/.test(data) || /^[+]?[0-9\-\s()]{7,}$/.test(data)) {
      return 'PHONE';
    }

    // 短信格式
    if (/^sms:[+]?[0-9\-\s()]+/.test(data)) {
      return 'SMS';
    }

    // WiFi 格式
    if (/^WIFI:/.test(data)) {
      return 'WIFI';
    }

    // vCard 格式
    if (/^BEGIN:VCARD/.test(data)) {
      return 'VCARD';
    }

    // 纯文本
    return 'TEXT';
  }

  /**
   * 生成二维码描述
   */
  private generateDescription(data: string, type: string): string {
    if (!data) return '识别失败';

    switch (type) {
      case 'URL':
        return `网址链接: ${data.substring(0, 30)}${data.length > 30 ? '...' : ''}`;
      case 'EMAIL':
        return `电子邮箱: ${data}`;
      case 'PHONE':
        return `电话号码: ${data}`;
      case 'SMS':
        return `短信: ${data}`;
      case 'WIFI':
        return 'WiFi 配置';
      case 'VCARD':
        return '联系人信息';
      case 'TEXT':
        return `文本: ${data.substring(0, 30)}${data.length > 30 ? '...' : ''}`;
      default:
        return data.substring(0, 30) + (data.length > 30 ? '...' : '');
    }
  }

  /**
   * 验证二维码数据格式
   */
  validateQRData(data: string): {
    isValid: boolean;
    type: 'URL' | 'TEXT' | 'EMAIL' | 'PHONE' | 'SMS' | 'WIFI' | 'VCARD' | 'UNKNOWN';
    description: string;
  } {
    if (!data) {
      return { isValid: false, type: 'UNKNOWN', description: '空数据' };
    }

    // URL 格式
    if (/^https?:\/\/.+/.test(data)) {
      return { isValid: true, type: 'URL', description: '网址链接' };
    }

    // 邮箱格式
    if (/^mailto:.+@.+\..+/.test(data) || /^[^@]+@[^@]+\.[^@]+$/.test(data)) {
      return { isValid: true, type: 'EMAIL', description: '电子邮箱' };
    }

    // 电话格式
    if (/^tel:[+]?[0-9\-\s()]+/.test(data) || /^[+]?[0-9\-\s()]{7,}$/.test(data)) {
      return { isValid: true, type: 'PHONE', description: '电话号码' };
    }

    // 短信格式
    if (/^sms:[+]?[0-9\-\s()]+/.test(data)) {
      return { isValid: true, type: 'SMS', description: '短信' };
    }

    // WiFi 格式
    if (/^WIFI:/.test(data)) {
      return { isValid: true, type: 'WIFI', description: 'WiFi 配置' };
    }

    // vCard 格式
    if (/^BEGIN:VCARD/.test(data)) {
      return { isValid: true, type: 'VCARD', description: '联系人信息' };
    }

    // 纯文本
    return { isValid: true, type: 'TEXT', description: '文本内容' };
  }

  /**
   * 检查是否已初始化
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * 检查浏览器是否支持相机
   */
  static async hasCamera(): Promise<boolean> {
    return await QrScanner.hasCamera();
  }
}

// 导出单例实例
export const qrService = new QRService();