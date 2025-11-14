"use client";

import { useState, useEffect, useRef } from "react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Building,
  Upload,
  Clock,
  AlertCircle,
  Loader2,
  CheckCircle2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { getApiBaseUrl } from "@/lib/api";
import toast from "react-hot-toast";

// Types
interface FormData {
  restaurant_name: string;
  owner_name: string;
  email: string;
  phone: string;
  location: string;
  description: string;
  opening_time: string;
  closing_time: string;
}

interface FormErrors {
  restaurant_name: string;
  owner_name: string;
  email: string;
  phone: string;
  location: string;
  description: string;
  opening_time: string;
  closing_time: string;
}

export default function Settings() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [selectedLogo, setSelectedLogo] = useState<File | null>(null);
  const { user, token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<FormData>({
    restaurant_name: "",
    owner_name: "",
    email: "",
    phone: "",
    location: "",
    description: "",
    opening_time: "",
    closing_time: "",
  });

  const [errors, setErrors] = useState<FormErrors>({
    restaurant_name: "",
    owner_name: "",
    email: "",
    phone: "",
    location: "",
    description: "",
    opening_time: "",
    closing_time: "",
  });

  const fetchVendorData = async () => {
    if (!user?.id || !token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/vendors/${user.id}/profile`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch settings");
      }

      const data = await response.json();

      setFormData({
        restaurant_name: data.restaurant_name || "",
        owner_name: data.owner_name || "",
        email: data.email || "",
        phone: data.phone || "",
        location: data.location || "",
        description: data.description || "",
        opening_time: data.opening_time || "",
        closing_time: data.closing_time || "",
      });

      if (data.logo) {
        setLogoPreview(data.logo);
      }
    } catch (err) {
      console.error("Error loading settings:", err);
      setError("Failed to load settings. Please refresh and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVendorData();
  }, [user, token]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/gif"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a valid image file (JPEG, PNG, GIF)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    setSelectedLogo(file);
  };

  const removeLogo = () => {
    setLogoPreview(null);
    setSelectedLogo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validateForm = () => {
    const newErrors: FormErrors = {
      restaurant_name: "",
      owner_name: "",
      email: "",
      phone: "",
      location: "",
      description: "",
      opening_time: "",
      closing_time: "",
    };
    let isValid = true;

    if (!formData.restaurant_name.trim()) {
      newErrors.restaurant_name = "Restaurant name is required";
      isValid = false;
    }

    if (!formData.email) {
      newErrors.email = "Email is required";
      isValid = false;
    } else {
      const mailFormat = /^[a-zA-Z0-9._%+-]+@[a-zA-Z.-]+\.[a-zA-Z]{2,}$/;
      if (!mailFormat.test(formData.email)) {
        newErrors.email = "Enter a valid email";
        isValid = false;
      }
    }

    if (formData.phone.trim()) {
      const phoneRegex = /^[\d\s\+\-\(\)]+$/;
      if (!phoneRegex.test(formData.phone)) {
        newErrors.phone = "Enter a valid phone number";
        isValid = false;
      }
    }

    if (!formData.location.trim()) {
      newErrors.location = "Location is required";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    setIsSaving(true);

    try {
      const submitData = new FormData();

      Object.keys(formData).forEach((key) => {
        submitData.append(key, formData[key as keyof FormData]);
      });

      if (selectedLogo) {
        submitData.append("logo", selectedLogo);
      }

      const response = await fetch(
        `${getApiBaseUrl()}/api/vendors/${user?.id}/profile`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: submitData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to update profile settings"
        );
      }

      toast.success("Settings updated successfully!");
      fetchVendorData();
    } catch (err: any) {
      console.error("Error saving settings:", err);
      toast.error(err.message || "Failed to update settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your restaurant profile and preferences
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Logo Section */}
        <div className="bg-card rounded-lg border border-border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Restaurant Logo</h2>
          <div className="flex items-center gap-6">
            <div className="relative">
              {logoPreview ? (
                <div className="relative w-32 h-32">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-32 h-32 rounded-lg object-cover border-2 border-border"
                  />
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                </div>
              ) : (
                <div className="w-32 h-32 rounded-lg bg-muted flex items-center justify-center border-2 border-dashed border-border">
                  <Building className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoChange}
              />
              <Button type="button" variant="outline" onClick={handleLogoClick}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Logo
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                JPG, PNG or GIF. Max 5MB
              </p>
            </div>
          </div>
        </div>

        {/* Basic Information */}
        <div className="bg-card rounded-lg border border-border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium flex items-center gap-2">
                <Building className="h-4 w-4" />
                Restaurant Name*
              </label>
              <Input
                name="restaurant_name"
                value={formData.restaurant_name}
                onChange={handleChange}
                placeholder="Enter restaurant name"
              />
              {errors.restaurant_name && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.restaurant_name}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Owner Name
              </label>
              <Input
                name="owner_name"
                value={formData.owner_name}
                onChange={handleChange}
                placeholder="Enter owner name"
              />
            </div>

            <div>
              <label className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email*
              </label>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="restaurant@example.com"
              />
              {errors.email && (
                <p className="text-xs text-red-500 mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone
              </label>
              <Input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1 234 567 8900"
              />
              {errors.phone && (
                <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location*
              </label>
              <Input
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="Enter restaurant address"
              />
              {errors.location && (
                <p className="text-xs text-red-500 mt-1">{errors.location}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Tell customers about your restaurant..."
                rows={4}
              />
            </div>
          </div>
        </div>

        {/* Operating Hours */}
        <div className="bg-card rounded-lg border border-border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Operating Hours
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Opening Time</label>
              <Input
                type="time"
                name="opening_time"
                value={formData.opening_time}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Closing Time</label>
              <Input
                type="time"
                name="closing_time"
                value={formData.closing_time}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSaving}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </main>
  );
}
