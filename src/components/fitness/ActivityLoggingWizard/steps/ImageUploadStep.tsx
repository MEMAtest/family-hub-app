'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Loader2, Trash2, Upload } from 'lucide-react';
import { useWizard } from '../WizardContext';

const MAX_FILES = 6;
const MAX_BYTES = 5 * 1024 * 1024;

const ImageUploadStep: React.FC = () => {
  const { state, dispatch, nextStep, prevStep, familyId } = useWizard();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remainingSlots = useMemo(() => Math.max(0, MAX_FILES - (state.imageUrls?.length || 0)), [state.imageUrls]);

  const uploadFiles = useCallback(async (files: File[]) => {
    if (!files.length) return;
    if (!familyId) {
      setError('Family not loaded yet. Try again in a moment.');
      return;
    }

    const valid = files.filter((f) => f.type.startsWith('image/'));
    if (valid.length !== files.length) {
      setError('Only image files are supported.');
      return;
    }
    const tooLarge = valid.find((f) => f.size > MAX_BYTES);
    if (tooLarge) {
      setError('One of your images is larger than 5MB.');
      return;
    }

    setIsUploading(true);
    setError(null);
    try {
      const form = new FormData();
      valid.slice(0, remainingSlots).forEach((f) => form.append('files', f));

      const response = await fetch(`/api/families/${familyId}/fitness/upload`, {
        method: 'POST',
        body: form,
      });

      if (!response.ok) {
        throw new Error(`Upload failed (${response.status})`);
      }

      const payload = await response.json();
      const urls = Array.isArray(payload?.urls) ? payload.urls.filter((u: unknown) => typeof u === 'string') : [];
      if (!urls.length) {
        throw new Error('Upload returned no URLs');
      }

      dispatch({ type: 'SET_IMAGE_URLS', urls: [...(state.imageUrls || []), ...urls] });
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload images. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [dispatch, familyId, remainingSlots, state.imageUrls]);

  const handlePick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFilesSelected = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    // Reset so selecting the same file again triggers onChange.
    event.target.value = '';
    await uploadFiles(files);
  }, [uploadFiles]);

  const removeImage = useCallback((index: number) => {
    const next = (state.imageUrls || []).filter((_, idx) => idx !== index);
    dispatch({ type: 'SET_IMAGE_URLS', urls: next });
  }, [dispatch, state.imageUrls]);

  const handleContinue = useCallback(() => {
    nextStep();
  }, [nextStep]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-light text-gray-900 dark:text-slate-100 mb-2">
          Add screenshots or photos
        </h2>
        <p className="text-gray-600 dark:text-slate-400">
          Upload screenshots from Strava, Garmin Connect, or photos from your workout (optional).
        </p>
      </div>

      <div className="rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20">
              <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="p-2 rounded-xl bg-gray-50 dark:bg-slate-800">
              <Camera className="w-5 h-5 text-gray-600 dark:text-slate-300" />
            </div>
            <div className="p-2 rounded-xl bg-gray-50 dark:bg-slate-800">
              <ImageIcon className="w-5 h-5 text-gray-600 dark:text-slate-300" />
            </div>
          </div>

          <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
            Drop images here, or pick files
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
            Up to {MAX_FILES} images, 5MB each
          </p>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              onClick={handlePick}
              disabled={isUploading || remainingSlots === 0}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Upload images
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => void handleFilesSelected(e)}
          />
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        )}
      </div>

      {(state.imageUrls?.length || 0) > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
              Uploaded ({state.imageUrls.length})
            </h3>
            <span className="text-xs text-gray-500 dark:text-slate-400">
              {remainingSlots} slots remaining
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {state.imageUrls.map((url, idx) => (
              <div key={url} className="group relative overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Upload ${idx + 1}`} className="h-28 w-full object-cover" />
                <button
                  onClick={() => removeImage(idx)}
                  className="absolute right-2 top-2 rounded-lg bg-black/60 p-2 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  title="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <button
          onClick={prevStep}
          className="px-6 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          disabled={isUploading}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default ImageUploadStep;

