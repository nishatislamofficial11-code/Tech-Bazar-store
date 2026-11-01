import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../../utils/cropImage';
import { X, Crop, Check, ZoomIn, ZoomOut, Monitor, Smartphone, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (croppedImageBlob: Blob) => void;
}

export default function ImageCropperModal({ isOpen, imageSrc, onClose, onCropComplete }: ImageCropperModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropCompleteHandler = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const showCroppedImage = useCallback(async () => {
    if (!croppedAreaPixels || !imageSrc) return;
    setIsProcessing(true);
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (croppedImage) {
        onCropComplete(croppedImage);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  }, [imageSrc, croppedAreaPixels, onCropComplete]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Crop className="w-5 h-5 text-primary" /> Crop Image
              </h2>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative h-[500px] w-full bg-slate-100">
              {imageSrc && (
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={aspect}
                  onCropChange={setCrop}
                  onCropComplete={onCropCompleteHandler}
                  onZoomChange={setZoom}
                />
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 w-full sm:w-auto overflow-x-auto">
                <div className="flex items-center gap-2 w-full sm:w-48 shrink-0">
                  <ZoomOut className="w-4 h-4 text-slate-500" />
                  <input
                    type="range"
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    aria-labelledby="Zoom"
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <ZoomIn className="w-4 h-4 text-slate-500" />
                </div>
                
                <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
                
                <div className="flex items-center gap-1.5 shrink-0 bg-slate-200/50 p-1 rounded-lg">
                  <button
                    onClick={() => setAspect(1)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors ${aspect === 1 ? 'bg-white shadow-sm text-primary' : 'text-slate-600 hover:bg-slate-200'}`}
                  >
                    <Square className="w-3.5 h-3.5" /> 1:1
                  </button>
                  <button
                    onClick={() => setAspect(4/3)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors ${aspect === 4/3 ? 'bg-white shadow-sm text-primary' : 'text-slate-600 hover:bg-slate-200'}`}
                  >
                    <Monitor className="w-3.5 h-3.5" /> 4:3
                  </button>
                  <button
                    onClick={() => setAspect(3/4)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-1.5 transition-colors ${aspect === 3/4 ? 'bg-white shadow-sm text-primary' : 'text-slate-600 hover:bg-slate-200'}`}
                  >
                    <Smartphone className="w-3.5 h-3.5" /> 3:4
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={showCroppedImage}
                  disabled={isProcessing}
                  className="px-4 py-2 text-sm font-bold text-white bg-primary rounded-xl hover:bg-primary-hover transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {isProcessing ? 'Processing...' : 'Apply Crop'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
