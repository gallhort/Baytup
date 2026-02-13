'use client';

import { useState, useRef } from 'react';
import { Upload, Star, Trash2, Loader2, ImagePlus } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { CreateListingFormData } from '../types';

interface Props {
  formData: CreateListingFormData;
  setFormData: React.Dispatch<React.SetStateAction<CreateListingFormData>>;
  t: any;
}

export default function PhotosStep({ formData, setFormData, t }: Props) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    // Validate file sizes
    const oversized = fileArray.filter(f => f.size > MAX_FILE_SIZE);
    if (oversized.length > 0) {
      toast.error(t.photos?.fileTooLarge || `File too large (max 5MB). ${oversized.length} file(s) skipped.`);
      const validFiles = fileArray.filter(f => f.size <= MAX_FILE_SIZE);
      if (validFiles.length === 0) return;
    }

    const validFiles = fileArray.filter(f => f.size <= MAX_FILE_SIZE);
    setUploading(true);
    const uploadFormData = new FormData();
    validFiles.forEach(file => uploadFormData.append('images', file));

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/listings/upload-images`,
        uploadFormData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      const uploaded = response.data.data.images.map((img: any, idx: number) => ({
        ...img,
        isPrimary: formData.images.length === 0 && idx === 0,
      }));

      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...uploaded],
      }));

      toast.success(`${validFiles.length} ${t.photos?.uploadSuccess || 'photo(s) uploaded'}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || t.photos?.uploadError || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const setPrimary = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.map((img, i) => ({ ...img, isPrimary: i === index })),
    }));
  };

  const updateCaption = (index: number, caption: string) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.map((img, i) => (i === index ? { ...img, caption } : img)),
    }));
  };

  const serverUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

  return (
    <div>
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
        {t.photos?.title || 'Add some photos'}
      </h1>
      <p className="text-lg text-gray-500 mb-8">
        {t.photos?.subtitle || 'Great photos help guests imagine staying at your place.'}
      </p>

      {/* Drop Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
          dragOver
            ? 'border-[#FF6B35] bg-orange-50'
            : 'border-gray-300 hover:border-gray-400 bg-gray-50'
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleInputChange}
          className="hidden"
        />
        {uploading ? (
          <div className="flex flex-col items-center">
            <Loader2 className="w-10 h-10 text-[#FF6B35] animate-spin mb-3" />
            <p className="text-gray-600 font-medium">{t.photos?.uploading || 'Uploading...'}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Upload className="w-10 h-10 text-gray-400 mb-3" />
            <p className="text-gray-700 font-medium mb-1">
              {t.photos?.dropHere || 'Drag & drop your photos here'}
            </p>
            <p className="text-sm text-gray-400">
              {t.photos?.orClick || 'or click to browse'}
            </p>
          </div>
        )}
      </div>

      {/* Image Grid */}
      {formData.images.length > 0 && (
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {formData.images.map((image, index) => (
            <div
              key={index}
              className={`relative group rounded-xl overflow-hidden border-2 ${
                image.isPrimary ? 'border-[#FF6B35]' : 'border-transparent'
              }`}
            >
              <img
                src={`${serverUrl}${image.url}`}
                alt={image.caption || `Photo ${index + 1}`}
                className="w-full aspect-square object-cover"
                onError={e => { (e.target as HTMLImageElement).src = '/placeholder.jpg'; }}
              />

              {/* Primary badge */}
              {image.isPrimary && (
                <div className="absolute top-2 left-2 bg-[#FF6B35] text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  {t.photos?.cover || 'Cover'}
                </div>
              )}

              {/* Actions overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                {!image.isPrimary && (
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setPrimary(index); }}
                    className="p-2.5 bg-white rounded-full shadow-lg hover:scale-110 transition-transform"
                    title={t.photos?.setCover || 'Set as cover'}
                  >
                    <Star className="w-4 h-4 text-[#FF6B35]" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); removeImage(index); }}
                  className="p-2.5 bg-white rounded-full shadow-lg hover:scale-110 transition-transform"
                  title={t.photos?.remove || 'Remove'}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>

              {/* Caption */}
              <div className="p-2 bg-white">
                <input
                  type="text"
                  value={image.caption || ''}
                  onChange={e => updateCaption(index, e.target.value)}
                  placeholder={t.photos?.captionPlaceholder || 'Add a caption...'}
                  className="w-full px-2 py-1 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#FF6B35] focus:border-[#FF6B35] outline-none"
                  onClick={e => e.stopPropagation()}
                />
              </div>
            </div>
          ))}

          {/* Add more button */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-gray-400 text-gray-400 hover:text-gray-500 transition-colors"
          >
            <ImagePlus className="w-8 h-8 mb-2" />
            <span className="text-sm">{t.photos?.addMore || 'Add more'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
