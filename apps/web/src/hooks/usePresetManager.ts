import { useCallback, useEffect, useState } from 'react';
import { Preset, ProcessingConfig } from '@pdfcleaner/shared';
import { apiClient } from '../lib/api-client';
import { DEFAULT_PRESETS } from '../lib/default-presets';
import { UIPreset } from '../components/pdf-cleaner/PresetSelector';

function toUiPreset(preset: Preset, isUserOwned: boolean): UIPreset {
  return {
    id: preset.id,
    name: preset.name,
    config: preset.config as unknown as ProcessingConfig,
    desc: isUserOwned ? 'Custom Preset' : 'Public Preset',
    isPublic: !isUserOwned,
    isUserOwned,
  };
}

export function usePresetManager(user: unknown) {
  const [presets, setPresets] = useState<UIPreset[]>(DEFAULT_PRESETS);
  const [saveLoading, setSaveLoading] = useState(false);

  const reloadPresets = useCallback(async () => {
    const list = [...DEFAULT_PRESETS];

    try {
      const publicPresets = await apiClient.get<Preset[]>('/presets');
      if (Array.isArray(publicPresets)) {
        publicPresets.forEach((preset) => {
          if (!DEFAULT_PRESETS.some((defaultPreset) => defaultPreset.id === preset.id)) {
            list.push(toUiPreset(preset, false));
          }
        });
      }
    } catch {
      // Offline mode keeps the built-in presets available.
    }

    if (user) {
      try {
        const userPresets = await apiClient.get<Preset[]>('/presets/my');
        if (Array.isArray(userPresets)) {
          userPresets.forEach((preset) => list.push(toUiPreset(preset, true)));
        }
      } catch {
        // Offline mode keeps the built-in presets available.
      }
    }

    setPresets(list);
  }, [user]);

  useEffect(() => {
    void Promise.resolve().then(reloadPresets);
  }, [reloadPresets]);

  const savePreset = useCallback(
    async (name: string, config: ProcessingConfig) => {
      if (!name.trim()) return;

      setSaveLoading(true);
      try {
        await apiClient.post('/presets', {
          name: name.trim(),
          config,
          isPublic: false,
        });
        await reloadPresets();
      } finally {
        setSaveLoading(false);
      }
    },
    [reloadPresets],
  );

  const deletePreset = useCallback(
    async (presetId: string) => {
      await apiClient.delete(`/presets/${presetId}`);
      await reloadPresets();
    },
    [reloadPresets],
  );

  return {
    presets,
    saveLoading,
    reloadPresets,
    savePreset,
    deletePreset,
  };
}
