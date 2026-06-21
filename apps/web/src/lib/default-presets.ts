import { DEFAULT_CONFIG, MODE_CONFIGS, ProcessingConfig } from '@pdfcleaner/shared';
import { UIPreset } from '../components/pdf-cleaner/PresetSelector';

export const DEFAULT_PRESETS: UIPreset[] = [
  {
    id: 'light-clean',
    name: 'Light Clean',
    config: { ...DEFAULT_CONFIG, ...MODE_CONFIGS['light-clean'], mode: 'light-clean' },
    desc: 'Mild clean preserving color details, ideal for colored charts or signatures.',
    isPublic: true,
    isUserOwned: false,
  },
  {
    id: 'strong-background-removal',
    name: 'Strong Background',
    config: {
      ...DEFAULT_CONFIG,
      ...MODE_CONFIGS['strong-background-removal'],
      mode: 'strong-background-removal',
    },
    desc: 'Removes severe dark shadows or paper yellowing, converting to grayscale.',
    isPublic: true,
    isUserOwned: false,
  },
  {
    id: 'text-contrast-boost',
    name: 'Text Contrast Boost',
    config: {
      ...DEFAULT_CONFIG,
      ...MODE_CONFIGS['text-contrast-boost'],
      mode: 'text-contrast-boost',
    },
    desc: 'Enhances faded or low-contrast handwritten notes or printed text.',
    isPublic: true,
    isUserOwned: false,
  },
  {
    id: 'print-optimized',
    name: 'Print Optimized',
    config: { ...DEFAULT_CONFIG, ...MODE_CONFIGS['print-optimized'], mode: 'print-optimized' },
    desc: 'High contrast binarization for clean printouts without wasting ink.',
    isPublic: true,
    isUserOwned: false,
  },
  {
    id: 'heavy-noise-reduction',
    name: 'Heavy Noise Reduction',
    config: {
      ...DEFAULT_CONFIG,
      ...MODE_CONFIGS['heavy-noise-reduction'],
      mode: 'heavy-noise-reduction',
    },
    desc: 'Cleans up dirty photocopy scans or receipts with severe pepper noise.',
    isPublic: true,
    isUserOwned: false,
  },
  {
    id: 'color-preservation',
    name: 'Color Preservation',
    config: {
      ...DEFAULT_CONFIG,
      ...MODE_CONFIGS['color-preservation'],
      mode: 'color-preservation',
    },
    desc: 'Normalizes the background while preserving original color content.',
    isPublic: true,
    isUserOwned: false,
  },
];

export function mergePresetConfig(config: ProcessingConfig): ProcessingConfig {
  return { ...DEFAULT_CONFIG, ...config };
}
