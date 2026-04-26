"use client";

import { useState, useEffect, useRef, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiFetchWithAuth } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Upload, X, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/usePermissions";
import { buildApiUrl } from "@/lib/api";
import { optimizeImage } from "@/lib/imageOptimizer";
import Image from "next/image";

// Types
interface MenuItem {
  name: string;
  price: string;
  description: string;
  category: string;
  isAvailable: boolean;
  imageUrl: string | null;
}

export default function EditMenuItem({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const { id } = unwrappedParams;

  const { token } = useAuth();
  const { getEffectiveVendorId } = usePermissions();
  const vendorId = getEffectiveVendorId();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [menuItem, setMenuItem] = useState<MenuItem>({
    name: "",
    price: "",
    description: "",
    category: "",
    isAvailable: true,
    imageUrl: null,
  });

  const [newImage, setNewImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeImageRequested, setRemoveImageRequested] = useState(false);

  const fetchMenuItem = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!token) return;

      const response = await apiFetchWithAuth(
        `/api/vendors/${vendorId}/menu/${id}`,
        token,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch menu item");
      }

      const data = await response.json();
      setMenuItem(data);
      setImagePreview(data.imageUrl ? buildApiUrl(data.imageUrl) : null);
      setRemoveImageRequested(false);
    } catch (error) {
      console.error("Error fetching menu item:", error);
      toast.error("Failed to load menu item details");
    } finally {
      setIsLoading(false);
    }
  }, [id, token, vendorId]);

  useEffect(() => {
    if (vendorId && token && id) {
      fetchMenuItem();
    }
  }, [vendorId, token, id, fetchMenuItem]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setMenuItem((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      return;
    }

    let optimizedFile: File;
    try {
      optimizedFile = await optimizeImage(file, { target: "menu" });
    } catch (error) {
      console.error("Image optimization failed:", error);
      toast.error("Could not optimize this image. Try another one.");
      return;
    }

    setNewImage(optimizedFile);
    setRemoveImageRequested(false);
    setImagePreview(URL.createObjectURL(optimizedFile));
  };

  const handleRemoveImage = () => {
    if (imagePreview && imagePreview !== menuItem.imageUrl) {
      URL.revokeObjectURL(imagePreview);
    }
    setNewImage(null);
    setRemoveImageRequested(true);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!menuItem.name.trim()) {
      toast.error("Name is required");
      return;
    }

    const price = parseFloat(menuItem.price);
    if (isNaN(price) || price <= 0) {
      toast.error("Price must be a positive number");
      return;
    }

    if (!menuItem.category.trim()) {
      toast.error("Category is required");
      return;
    }

    setIsSaving(true);

    try {
      if (!token) {
        toast.error("Session expired. Please log in again.");
        return;
      }

      const formData = new FormData();
      formData.append("name", menuItem.name);
      formData.append("price", menuItem.price);
      formData.append("category", menuItem.category);
      formData.append("description", menuItem.description || "");
      formData.append("isAvailable", String(menuItem.isAvailable));

      if (removeImageRequested && !newImage) {
        formData.append("removeImage", "true");
      }

      if (newImage) {
        formData.append("image", newImage);
      }

      const response = await apiFetchWithAuth(
        `/api/vendors/${vendorId}/menu/${id}`,
        token,
        {
          method: "PUT",
          body: formData,
        },
      );

      const data = await response.json();

      if (response.ok) {
        toast.success("Menu item updated successfully");
        router.push("/dashboard/manage-menu");
      } else {
        const errorMessage = data.details
          ? `Failed to update menu item: ${
              Array.isArray(data.details) ? data.details[0] : data.details
            }`
          : "Failed to update menu item. Please check your inputs.";
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Error updating menu item:", error);
      toast.error("An error occurred while updating the menu item.");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview !== menuItem.imageUrl) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview, menuItem.imageUrl]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="w-32 h-8" />
        <Skeleton className="w-full h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl md:text-3xl font-bold">Edit Menu Item</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Item Name*</label>
                <Input
                  name="name"
                  value={menuItem.name}
                  onChange={handleChange}
                  placeholder="e.g., Butter Chicken"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">Price*</label>
                <Input
                  type="number"
                  name="price"
                  value={menuItem.price}
                  onChange={handleChange}
                  placeholder="e.g., 250"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">Category*</label>
                <Input
                  name="category"
                  value={menuItem.category}
                  onChange={handleChange}
                  placeholder="e.g., Main Course"
                  required
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  name="description"
                  value={menuItem.description}
                  onChange={handleChange}
                  placeholder="Describe your dish..."
                  className="h-32"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isAvailable"
                  checked={menuItem.isAvailable}
                  onChange={(e) =>
                    setMenuItem((prev) => ({
                      ...prev,
                      isAvailable: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="isAvailable" className="text-sm font-medium">
                  Available for ordering
                </label>
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">
                  Item Image
                </label>
                <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                  {imagePreview ? (
                    <div className="space-y-2">
                      <div className="relative w-full aspect-video mx-auto">
                        <Image
                          src={imagePreview}
                          alt="Preview"
                          className="rounded-md object-cover w-full h-full"
                          width={400}
                          height={300}
                        />
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="absolute top-2 right-2 bg-black/50 rounded-full p-1 hover:bg-black/70 transition-colors"
                        >
                          <X className="h-4 w-4 text-white" />
                        </button>
                      </div>
                      <p className="text-sm text-green-600 flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        {newImage ? "New image uploaded" : "Current image"}
                      </p>
                    </div>
                  ) : (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          void handleFileChange(e);
                        }}
                        aria-label="Upload image file"
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
                      <p className="text-sm text-muted-foreground mt-2">
                        PNG, JPG up to 5MB
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/manage-menu")}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-orange-500 hover:bg-orange-600 text-white"
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
