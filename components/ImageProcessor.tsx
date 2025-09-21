import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ASPECT_RATIOS, MAX_CANVAS_DIMENSION } from '../constants';
import type { AspectRatio } from '../types';
import { UploadIcon, DownloadIcon, SparklesIcon, XCircleIcon, CheckCircleIcon, PencilIcon, EyeIcon } from './Icon';
import { fillImageWithAI } from '../services/geminiService';

interface ImagePreviewModalProps {
  imageUrl: string;
  onClose: () => void;
  onDownload: () => void;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ imageUrl, onClose, onDownload }) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    return (
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-lg flex items-center justify-center z-50 p-4 animate-fadeIn"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="image-preview-title"
        >
            <style>{`
              @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }
              .animate-fadeIn {
                animation: fadeIn 0.3s ease-out;
              }
            `}</style>
            <div 
                className="relative bg-gray-800 p-4 rounded-lg shadow-2xl max-w-4xl max-h-[90vh] w-full flex flex-col gap-4"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-between flex-shrink-0">
                    <h2 id="image-preview-title" className="text-xl font-bold text-gray-200">Pratinjau Hasil AI</h2>
                     <button 
                        onClick={onClose} 
                        className="bg-gray-700 rounded-full p-1 text-white hover:bg-red-500 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-red-500"
                        aria-label="Tutup pratinjau"
                    >
                        <XCircleIcon className="w-8 h-8" />
                    </button>
                </header>
                <div className="flex-grow flex items-center justify-center overflow-hidden min-h-0">
                    <img src={imageUrl} alt="AI Generated Preview" className="w-full h-auto max-h-full object-contain rounded-md" />
                </div>
                <footer className="flex justify-end flex-shrink-0">
                    <button 
                        onClick={onDownload} 
                        className="w-full sm:w-auto bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 hover:bg-indigo-500 disabled:bg-indigo-900 transition-all duration-200 shadow-lg shadow-indigo-500/20"
                    >
                       <DownloadIcon className="w-5 h-5" />
                       <span>Download Gambar</span>
                    </button>
                </footer>
            </div>
        </div>
    );
};


const ImageUploader = ({ onImageUpload, onClick }: { onImageUpload: (file: File) => void; onClick: () => void; }) => {
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onImageUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={onClick}
      className="w-full h-full min-h-64 border-4 border-dashed border-gray-600 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-gray-700/50 transition-all duration-300"
      aria-label="Image uploader"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
    >
      <UploadIcon className="w-16 h-16 text-gray-500 mb-4" />
      <p className="text-gray-400">Seret & lepas gambar, atau klik untuk memilih file</p>
      <p className="text-sm text-gray-500">PNG, JPG, WEBP</p>
    </div>
  );
};


const RatioSelector = ({ selectedRatio, onRatioChange }: { selectedRatio: AspectRatio; onRatioChange: (ratio: AspectRatio) => void }) => {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-3 text-center text-gray-300">1. Pilih Rasio Aspek</h3>
      <div className="flex justify-center items-center flex-wrap gap-3">
        {ASPECT_RATIOS.map((ratio) => {
          const Icon = ratio.icon;
          return (
            <button
              key={ratio.name}
              onClick={() => onRatioChange(ratio)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 text-sm font-medium border-2 ${
                selectedRatio.name === ratio.name
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                  : 'bg-gray-700 border-gray-600 hover:bg-gray-600 hover:border-gray-500'
              }`}
              aria-pressed={selectedRatio.name === ratio.name}
            >
              <Icon className="w-5 h-5" />
              <span>{ratio.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};


const ImageProcessor: React.FC = () => {
    const [originalImage, setOriginalImage] = useState<File | null>(null);
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [finalImageSrc, setFinalImageSrc] = useState<string | null>(null);
    const [activeRatio, setActiveRatio] = useState<AspectRatio>(ASPECT_RATIOS[0]);
    const [customPrompt, setCustomPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [canvasSize, setCanvasSize] = useState({ width: 512, height: 512 });

    const drawImageOnCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas || !imageSrc) return;

        const img = new Image();
        img.src = imageSrc;
        img.onload = () => {
            const containerWidth = canvas.width;
            const containerHeight = canvas.height;
            
            ctx.fillStyle = '#000000'; // Fill with black for padding
            ctx.fillRect(0, 0, containerWidth, containerHeight);

            const imgRatio = img.width / img.height;
            const containerRatio = containerWidth / containerHeight;

            let drawWidth, drawHeight, x, y;

            if (imgRatio > containerRatio) {
                drawWidth = containerWidth;
                drawHeight = containerWidth / imgRatio;
                x = 0;
                y = (containerHeight - drawHeight) / 2;
            } else {
                drawHeight = containerHeight;
                drawWidth = containerHeight * imgRatio;
                x = (containerWidth - drawWidth) / 2;
                y = 0;
            }
            ctx.drawImage(img, x, y, drawWidth, drawHeight);
        };
    }, [imageSrc]);

    useEffect(() => {
        let width = MAX_CANVAS_DIMENSION;
        let height = MAX_CANVAS_DIMENSION / activeRatio.value;

        if (height > MAX_CANVAS_DIMENSION) {
            height = MAX_CANVAS_DIMENSION;
            width = MAX_CANVAS_DIMENSION * activeRatio.value;
        }
        setCanvasSize({ width: Math.round(width), height: Math.round(height) });
    }, [activeRatio]);
    
    useEffect(() => {
       if (imageSrc) {
           drawImageOnCanvas();
       }
    }, [imageSrc, drawImageOnCanvas, canvasSize]);


    const handleImageUpload = (file: File) => {
        setOriginalImage(file);
        setFinalImageSrc(null);
        setError(null);
        setSuccessMessage(null);
        const reader = new FileReader();
        reader.onload = (e) => {
            setImageSrc(e.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleImageUpload(e.target.files[0]);
        }
        if (e.target) {
            e.target.value = '';
        }
    };

    const handleConvertAndFill = async () => {
        const canvas = canvasRef.current;
        if (!canvas || !originalImage) return;

        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);
        setFinalImageSrc(null);

        try {
            const imageBase64 = canvas.toDataURL(originalImage.type);
            
            const newImageSrc = await fillImageWithAI(
                imageBase64,
                originalImage.type,
                customPrompt
            );

            setFinalImageSrc(newImageSrc);
            setSuccessMessage("Gambar berhasil diperluas oleh AI!");

        } catch (e: any) {
            setError(e.message || "Terjadi kesalahan yang tidak diketahui.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = () => {
        if (!finalImageSrc) return;
        const link = document.createElement('a');
        link.href = finalImageSrc;
        const fileName = originalImage?.name.replace(/\.[^/.]+$/, "") || "generated-image";
        link.download = `${fileName}-extended-${activeRatio.name.replace(':','-')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleReset = () => {
        setOriginalImage(null);
        setImageSrc(null);
        setFinalImageSrc(null);
        setError(null);
        setSuccessMessage(null);
        setActiveRatio(ASPECT_RATIOS[0]);
        setCustomPrompt('');
    };

    return (
        <>
            <input
                type="file"
                ref={inputRef}
                onChange={handleFileChange}
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
            />
            <div className="flex flex-col lg:flex-row gap-8">
                <div className="flex-1 order-2 lg:order-1">
                    {!originalImage ? (
                        <ImageUploader onImageUpload={handleImageUpload} onClick={() => inputRef.current?.click()} />
                    ) : (
                        <div className="grid grid-cols-2 gap-4 items-start">
                            {/* Preview Panel */}
                            <div className="w-full">
                                <h3 className="text-sm sm:text-lg font-semibold mb-3 text-center text-gray-300">Preview</h3>
                                <div 
                                    className="p-2 bg-black/30 rounded-lg relative flex items-center justify-center group cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all"
                                    onClick={() => inputRef.current?.click()}
                                    title="Klik untuk ganti gambar"
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
                                >
                                    <canvas
                                        ref={canvasRef}
                                        width={canvasSize.width}
                                        height={canvasSize.height}
                                        className="max-w-full max-h-[70vh] h-auto object-contain rounded-md"
                                        style={{aspectRatio: `${canvasSize.width} / ${canvasSize.height}`}}
                                        aria-label="Image preview with selected aspect ratio"
                                    />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center rounded-lg pointer-events-none">
                                        <PencilIcon className="w-10 h-10 text-white" />
                                        <p className="text-white mt-2 font-semibold text-sm">Ganti Gambar</p>
                                    </div>
                                </div>
                            </div>

                            {/* Result Panel */}
                            <div className="w-full">
                                <h3 className="text-sm sm:text-lg font-semibold mb-3 text-center text-gray-300">Hasil AI</h3>
                                <div 
                                    className="p-2 bg-black/30 rounded-lg relative flex items-center justify-center w-full"
                                    style={{aspectRatio: `${canvasSize.width} / ${canvasSize.height}`}}
                                >
                                    {isLoading && (
                                        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center rounded-lg backdrop-blur-sm z-10 p-2">
                                            <SparklesIcon className="w-8 h-8 sm:w-16 sm:h-16 text-indigo-400 animate-pulse" />
                                            <p className="mt-2 sm:mt-4 text-xs sm:text-lg text-white text-center">AI sedang bekerja...</p>
                                            <p className="text-xs text-gray-400 text-center hidden sm:block">Ini mungkin memakan waktu sejenak.</p>
                                        </div>
                                    )}
                                    {!isLoading && finalImageSrc && (
                                       <button
                                            onClick={() => setIsModalOpen(true)}
                                            className="w-full h-full group focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 rounded-lg"
                                            aria-label="Lihat hasil gambar AI dalam ukuran penuh"
                                        >
                                            <img
                                                src={finalImageSrc}
                                                alt="Generated by AI"
                                                className="max-w-full max-h-full object-contain rounded-md"
                                            />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity flex flex-col items-center justify-center rounded-lg pointer-events-none">
                                                <EyeIcon className="w-10 h-10 text-white" />
                                                <p className="text-white mt-2 font-semibold text-sm">Lihat Hasil</p>
                                            </div>
                                        </button>
                                    )}
                                    {!isLoading && !finalImageSrc && (
                                        <div className="text-center text-gray-500 p-2 sm:p-8 flex flex-col items-center justify-center h-full">
                                            <SparklesIcon className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-4 opacity-50" />
                                            <p className="text-xs sm:text-base">Hasil AI akan muncul di sini.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="lg:w-80 flex-shrink-0 flex flex-col gap-6 order-1 lg:order-2">
                    <RatioSelector selectedRatio={activeRatio} onRatioChange={setActiveRatio} />

                    <div>
                        <h3 className="text-lg font-semibold mb-3 text-center text-gray-300">2. Prompt Kustom (Opsional)</h3>
                        <div className="relative">
                            <textarea
                                value={customPrompt}
                                onChange={(e) => setCustomPrompt(e.target.value)}
                                placeholder="Contoh: tambahkan langit berbintang di area kosong"
                                className="w-full h-24 p-3 pr-10 bg-gray-700 border-2 border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 resize-none text-sm"
                                aria-label="Custom AI Prompt"
                            />
                            <PencilIcon className="w-5 h-5 absolute top-3 right-3 text-gray-400" />
                        </div>
                    </div>

                    {error && (
                        <div role="alert" className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg flex items-start gap-3">
                            <XCircleIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-semibold">Error</p>
                              <p className="text-sm">{error}</p>
                            </div>
                        </div>
                    )}
                     {successMessage && !isLoading && (
                        <div role="status" className="bg-green-900/50 border border-green-700 text-green-300 px-4 py-3 rounded-lg flex items-start gap-3">
                            <CheckCircleIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                             <p className="text-sm">{successMessage}</p>
                        </div>
                    )}

                    <div className="flex flex-col gap-4">
                         <button
                            onClick={handleConvertAndFill}
                            disabled={isLoading || !originalImage}
                            className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-indigo-500 disabled:bg-indigo-900 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-indigo-500/20"
                        >
                            <SparklesIcon className="w-5 h-5" />
                            <span>Convert & Fill with AI</span>
                        </button>
                        <button
                            onClick={handleDownload}
                            disabled={!finalImageSrc || isLoading}
                            className="w-full bg-gray-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-all duration-200"
                        >
                           <DownloadIcon className="w-5 h-5" />
                           <span>Download</span>
                        </button>
                    </div>
                    
                    {originalImage && (
                        <button 
                            onClick={handleReset}
                            className="w-full text-gray-400 hover:text-white hover:bg-gray-700 py-2 rounded-lg transition-colors duration-200 text-sm"
                        >
                            Mulai Lagi Dengan Gambar Baru
                        </button>
                    )}
                </div>
            </div>
            {isModalOpen && finalImageSrc && (
                <ImagePreviewModal
                    imageUrl={finalImageSrc}
                    onClose={() => setIsModalOpen(false)}
                    onDownload={handleDownload}
                />
            )}
        </>
    );
};

export default ImageProcessor;