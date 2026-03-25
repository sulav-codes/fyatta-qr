import { ChangeEvent, useRef } from "react";
import { Button } from "./button";
import { Upload } from "lucide-react";

interface FileUploadAreaProps {
  index: number;
  onFileChange?: (index: number, file: File | null) => void;
}

// Optimized component
const FileUploadArea: React.FC<FileUploadAreaProps> = ({
  index,
  onFileChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (onFileChange) {
      onFileChange(index, file);
    }
  };

  return (
    <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label="Upload image file"
        onChange={handleFileChange}
      />
      <Button
        variant="outline"
        className="w-full"
        onClick={triggerFileSelect}
        type="button"
      >
        <Upload className="h-4 w-4 mr-2" />
        Upload Image
      </Button>
      <p className="text-sm text-muted-foreground mt-2">PNG, JPG up to 5MB</p>
    </div>
  );
};

export { FileUploadArea };

// Usage example:
// <FileUploadArea
//   index={index}
//   onFileChange={handleItemChange}
// />
