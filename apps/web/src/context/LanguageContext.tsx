'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Language = 'en' | 'vi';

type TranslationEntry = {
  en: string;
  vi: string;
};

interface TranslationDict {
  [key: string]: TranslationEntry;
}

export const TRANSLATIONS: TranslationDict = {
  appSubtitle: {
    en: 'Make your scanned documents pristine.',
    vi: 'Làm sạch và tối ưu hóa tài liệu quét của bạn.',
  },
  installApp: {
    en: 'Install App',
    vi: 'Cài đặt ứng dụng',
  },
  privacySettings: {
    en: 'Privacy & Settings',
    vi: 'Quyền riêng tư & Cài đặt',
  },
  signIn: {
    en: 'Sign In',
    vi: 'Đăng nhập',
  },
  logout: {
    en: 'Logout',
    vi: 'Đăng xuất',
  },
  telemetryTitle: {
    en: 'Anonymous Telemetry',
    vi: 'Thống kê ẩn danh',
  },
  telemetryDesc: {
    en: 'Share performance statistics to help improve the tool',
    vi: 'Chia sẻ thông số hiệu năng để giúp cải thiện ứng dụng',
  },
  privacyDisclaimer: {
    en: 'PDFCleaner collects no personally identifiable information (PII). File names, contents, and text are never read or stored on the server.',
    vi: 'PDFCleaner không thu thập thông tin nhận dạng cá nhân. Tên tệp, nội dung và văn bản không bao giờ được đọc hoặc lưu trên máy chủ.',
  },
  privacyFooter: {
    en: '100% Privacy. Processing runs entirely in your browser.',
    vi: 'Bảo mật 100%. Mọi xử lý diễn ra hoàn toàn trong trình duyệt của bạn.',
  },
  privacyAlert: {
    en: 'Offline Processing Mode Active: All processing operations are conducted client-side using WebAssembly. Your files are never uploaded to any server. Complete data confidentiality is guaranteed.',
    vi: 'Chế độ xử lý ngoại tuyến đang hoạt động: Tài liệu được xử lý trực tiếp trong trình duyệt bằng WebAssembly và không bao giờ tải lên máy chủ.',
  },
  dragDropText: {
    en: 'Drag & drop PDF or image files here',
    vi: 'Kéo thả tệp PDF hoặc ảnh vào đây',
  },
  orBrowse: {
    en: 'or click Browse to select',
    vi: 'hoặc nhấp để chọn tệp từ máy',
  },
  maxLimits: {
    en: 'PDF, PNG, JPG, JPEG, WEBP • Max {size}MB • Max {pages} Pages',
    vi: 'PDF, PNG, JPG, JPEG, WEBP • Tối đa {size}MB • Tối đa {pages} trang',
  },
  changeFile: {
    en: 'Change File',
    vi: 'Chọn tệp khác',
  },
  presetTitle: {
    en: 'Select Cleaning Preset',
    vi: 'Chọn chế độ làm sạch',
  },
  showAdvanced: {
    en: 'Show Advanced Settings',
    vi: 'Hiện cài đặt nâng cao',
  },
  hideAdvanced: {
    en: 'Hide Advanced Settings',
    vi: 'Ẩn cài đặt nâng cao',
  },
  pageRangeTitle: {
    en: 'Page Range Selection',
    vi: 'Chọn trang cần xử lý',
  },
  pageRangeDesc: {
    en: 'Specify page numbers or ranges (e.g., 1-3, 5, 7-10).',
    vi: 'Nhập số trang hoặc khoảng trang, ví dụ: 1-3, 5, 7-10.',
  },
  pageRangePlaceholder: {
    en: 'e.g. 1-{count} (Optional, defaults to all)',
    vi: 'ví dụ: 1-{count} (để trống để xử lý tất cả)',
  },
  saveAsPreset: {
    en: 'Save Custom Preset',
    vi: 'Lưu cấu hình tùy chỉnh',
  },
  saveAsPresetLogged: {
    en: 'You are logged in. You can save these parameters as a custom preset.',
    vi: 'Bạn đã đăng nhập và có thể lưu các thông số này thành cấu hình riêng.',
  },
  saveAsPresetUnlogged: {
    en: 'Sign in to save these custom parameters as a preset.',
    vi: 'Đăng nhập để lưu các thông số này thành cấu hình riêng.',
  },
  presetNameLabel: {
    en: 'Preset Name',
    vi: 'Tên cấu hình',
  },
  presetNamePlaceholder: {
    en: 'e.g. My receipt cleanup',
    vi: 'ví dụ: Làm sạch hóa đơn',
  },
  savePresetBtn: {
    en: 'Save Preset',
    vi: 'Lưu cấu hình',
  },
  save: {
    en: 'Save',
    vi: 'Lưu',
  },
  grayscaleLabel: {
    en: 'Convert to Grayscale',
    vi: 'Chuyển sang ảnh đen trắng',
  },
  grayscaleDesc: {
    en: 'Remove color chromatics from document',
    vi: 'Loại bỏ màu sắc, chỉ giữ lại tông đen trắng',
  },
  deskewLabel: {
    en: 'Auto Deskew & Alignment',
    vi: 'Tự động xoay thẳng trang',
  },
  deskewDesc: {
    en: 'Detect tilt angle and straighten page',
    vi: 'Phát hiện góc nghiêng và căn thẳng lại trang',
  },
  gammaLabel: {
    en: 'Gamma Correction (Midtones)',
    vi: 'Hiệu chỉnh gamma (vùng trung gian)',
  },
  contrastLabel: {
    en: 'Contrast Multiplier',
    vi: 'Tăng độ tương phản',
  },
  jpegQualityLabel: {
    en: 'Export JPEG Quality',
    vi: 'Chất lượng ảnh JPEG xuất ra',
  },
  normKernelLabel: {
    en: 'Background Block Window',
    vi: 'Kích thước vùng làm sạch nền',
  },
  thresholdCLabel: {
    en: 'Text Stroke Thickness (Threshold)',
    vi: 'Độ đậm nét chữ (ngưỡng lọc)',
  },
  activatingEngine: {
    en: 'Activating WebAssembly engine module...',
    vi: 'Đang khởi động bộ xử lý...',
  },
  processingElements: {
    en: 'Processing elements...',
    vi: 'Đang xử lý các trang tài liệu...',
  },
  pagesTitle: {
    en: 'Pages',
    vi: 'Trang',
  },
  clickCompare: {
    en: 'Click to view comparison',
    vi: 'Bấm để xem so sánh',
  },
  pagePreviewTitle: {
    en: 'Page {num} Preview',
    vi: 'Xem trước trang {num}',
  },
  originalBadge: {
    en: 'Original',
    vi: 'Ảnh gốc',
  },
  processedBadge: {
    en: 'Processed',
    vi: 'Sau xử lý',
  },
  notProcessed: {
    en: 'Not processed',
    vi: 'Chưa xử lý',
  },
  saveFileAs: {
    en: 'Save File as:',
    vi: 'Đặt tên tệp xuất ra:',
  },
  clearFile: {
    en: 'Clear File',
    vi: 'Xóa tệp đã chọn',
  },
  downloadFile: {
    en: 'Download File',
    vi: 'Tải tệp xuống',
  },
  downloadZip: {
    en: 'Download ZIP',
    vi: 'Tải ZIP ảnh',
  },
  runOfflineEngine: {
    en: 'Run Offline Engine',
    vi: 'Bắt đầu xử lý ngoại tuyến',
  },
  cancelOperation: {
    en: 'Cancel Operation',
    vi: 'Hủy xử lý',
  },
  localHistoryTitle: {
    en: 'Local Document History',
    vi: 'Lịch sử tài liệu cục bộ',
  },
  noHistory: {
    en: 'No processed documents found in local history.',
    vi: 'Chưa có tài liệu nào được xử lý gần đây.',
  },
  clearHistory: {
    en: 'Clear History',
    vi: 'Xóa lịch sử',
  },
  processedOn: {
    en: 'Processed on {date}',
    vi: 'Xử lý lúc {date}',
  },
  'preset_name_light-clean': {
    en: 'Light Clean',
    vi: 'Làm sạch nhẹ',
  },
  'preset_desc_light-clean': {
    en: 'Mild clean preserving color details, ideal for colored charts or signatures.',
    vi: 'Làm sạch nhẹ, giữ chi tiết màu. Phù hợp với tài liệu có biểu đồ, chữ ký hoặc con dấu.',
  },
  'preset_name_strong-background-removal': {
    en: 'Strong Background',
    vi: 'Xóa nền mạnh',
  },
  'preset_desc_strong-background-removal': {
    en: 'Removes severe dark shadows or paper yellowing, converting to grayscale.',
    vi: 'Loại bỏ bóng tối, nền giấy ố vàng và chuyển sang đen trắng rõ nét.',
  },
  'preset_name_text-contrast-boost': {
    en: 'Text Contrast Boost',
    vi: 'Tăng nét chữ',
  },
  'preset_desc_text-contrast-boost': {
    en: 'Enhances faded or low-contrast handwritten notes or printed text.',
    vi: 'Làm rõ chữ mờ, chữ viết tay hoặc tài liệu có độ tương phản thấp.',
  },
  'preset_name_print-optimized': {
    en: 'Print Optimized',
    vi: 'Tối ưu bản in',
  },
  'preset_desc_print-optimized': {
    en: 'High contrast binarization for clean printouts without wasting ink.',
    vi: 'Tăng tương phản để bản in sắc nét, nền sạch và tiết kiệm mực.',
  },
  'preset_name_heavy-noise-reduction': {
    en: 'Heavy Noise Reduction',
    vi: 'Lọc nhiễu mạnh',
  },
  'preset_desc_heavy-noise-reduction': {
    en: 'Cleans up dirty photocopy scans or receipts with severe pepper noise.',
    vi: 'Lọc các hạt nhiễu nhỏ trên bản photocopy cũ, hóa đơn hoặc tài liệu bẩn.',
  },
  'preset_name_color-preservation': {
    en: 'Color Preservation',
    vi: 'Giữ màu gốc',
  },
  'preset_desc_color-preservation': {
    en: 'Normalizes the background while preserving original color content.',
    vi: 'Làm sạch nền giấy nhưng vẫn giữ màu sắc và hình ảnh gốc.',
  },
  previewBtn: {
    en: 'Preview',
    vi: 'Xem trước',
  },
  previewModalTitle: {
    en: 'Document Preview & Comparison',
    vi: 'Xem trước & So sánh kết quả',
  },
  clickToProcess: {
    en: "Click 'Start Processing' to see results",
    vi: "Nhấn 'Bắt đầu xử lý' để xem kết quả",
  },
  previewLoading: {
    en: 'Generating preview...',
    vi: 'Đang tạo bản xem trước...',
  },
  ready: {
    en: 'Ready',
    vi: 'Sẵn sàng',
  },
  activatingWasm: {
    en: 'Activating Wasm...',
    vi: 'Đang khởi động bộ xử lý...',
  },
  processing: {
    en: 'Processing...',
    vi: 'Đang xử lý...',
  },
  completed: {
    en: 'Completed!',
    vi: 'Đã xử lý xong!',
  },
  processingFailed: {
    en: 'Processing Failed',
    vi: 'Xử lý thất bại',
  },
  settings: {
    en: 'Advanced',
    vi: 'Nâng cao',
  },
  startProcessing: {
    en: 'Start Processing',
    vi: 'Bắt đầu xử lý',
  },
  cancel: {
    en: 'Cancel',
    vi: 'Hủy',
  },
  processLog: {
    en: 'Process Log',
    vi: 'Nhật ký xử lý',
  },
  logPlaceholder: {
    en: 'Process log will be displayed here ...',
    vi: 'Nhật ký xử lý sẽ hiển thị ở đây...',
  },
  pageStatusCompleted: {
    en: 'Completed',
    vi: 'Hoàn thành',
  },
  pageStatusQueued: {
    en: 'Queued',
    vi: 'Đang chờ',
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    queueMicrotask(() => {
      const stored = window.localStorage.getItem('pdfcleaner_lang') as Language;
      if (stored === 'en' || stored === 'vi') {
        setLanguageState(stored);
        return;
      }

      if (window.navigator.language.substring(0, 2) === 'vi') {
        setLanguageState('vi');
      }
    });
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('pdfcleaner_lang', lang);
    }
  };

  const t = (key: string, replacements?: Record<string, string | number>): string => {
    const dictEntry = TRANSLATIONS[key];
    if (!dictEntry) return key;

    let text = dictEntry[language] || dictEntry.en || key;
    if (replacements) {
      Object.entries(replacements).forEach(([replacementKey, value]) => {
        text = text.replace(`{${replacementKey}}`, String(value));
      });
    }

    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
