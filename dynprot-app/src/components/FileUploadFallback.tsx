import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Image as ImageIcon, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface FileUploadFallbackProps {
  onFileSelect: (file: File) => void;
  onImageCapture: (imageSrc: string) => void;
  className?: string;
}

export const FileUploadFallback = ({ 
  onFileSelect, 
  onImageCapture, 
  className = "" 
}: FileUploadFallbackProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  // Handle file validation
  const validateFile = useCallback((file: File): boolean => {
    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return false;
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File size must be less than 10MB');
      return false;
    }

    // Check supported formats
    const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!supportedTypes.includes(file.type)) {
      toast.error('Supported formats: JPEG, PNG, WebP');
      return false;
    }

    return true;
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    if (!validateFile(file)) return;

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageSrc = e.target?.result as string;
      if (imageSrc) {
        setPreview(imageSrc);
        onImageCapture(imageSrc);
        onFileSelect(file);
        toast.success('Image uploaded successfully!');
      }
    };
    reader.readAsDataURL(file);
  }, [validateFile, onFileSelect, onImageCapture]);

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // Handle file input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // Clear preview
  const clearPreview = useCallback(() => {
    setPreview(null);
  }, []);

  return (
    <div className={`w-full ${className}`}>
      <AnimatePresence mode="wait">
        {preview ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative"
          >
            <div className="relative bg-black rounded-lg overflow-hidden">
              <img
                src={preview}
                alt="Selected image"
                className="w-full h-auto max-h-[70vh] object-contain"
              />
              <Button
                onClick={clearPreview}
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${dragActive 
                ? 'border-primary bg-primary/10' 
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center space-y-4">
              <motion.div
                animate={dragActive ? { scale: 1.1 } : { scale: 1 }}
                className="p-4 bg-muted rounded-full"
              >
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </motion.div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-medium">
                  {dragActive ? 'Drop your image here' : 'Upload a photo of your meal'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Drag and drop an image, or click to select
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports: JPEG, PNG, WebP (max 10MB)
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={() => document.getElementById('file-input')?.click()}
                  variant="default"
                  size="sm"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Select Image
                </Button>
              </div>
            </div>

            <input
              id="file-input"
              type="file"
              accept="image/*"
              onChange={handleInputChange}
              className="hidden"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FileUploadFallback;