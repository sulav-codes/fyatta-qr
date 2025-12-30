"use client";

import { useState, useEffect, useCallback } from "react";
import {
  QrCode,
  Download,
  Copy,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Edit3,
  Check,
  X,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { getApiBaseUrl } from "@/lib/api";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import ProtectedRoute from "@/components/ProtectedRoute";

// Types
interface Table {
  id: number;
  name: string;
  qrCode: string;
  isActive: boolean;
}

function GenerateQRContent() {
  const [tables, setTables] = useState<Table[]>([]);
  const [newTableName, setNewTableName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingTable, setIsAddingTable] = useState(false);
  const [isDeletingTable, setIsDeletingTable] = useState<number | null>(null);
  const [isRegeneratingQR, setIsRegeneratingQR] = useState<number | null>(null);
  const [isTogglingAvailability, setIsTogglingAvailability] = useState<
    number | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [copyStatus, setCopyStatus] = useState<Record<number, boolean>>({});

  const [editingTable, setEditingTable] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [isRenamingTable, setIsRenamingTable] = useState<number | null>(null);

  const { user, token } = useAuth();
  const { getEffectiveVendorId } = usePermissions();
  const vendorId = getEffectiveVendorId();
  const hostUrl =
    typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.host}`
      : "";

  useEffect(() => {
    if (vendorId && token) {
      fetchTables();
    } else {
      setIsLoading(false);
    }
  }, [vendorId, token]);

  const fetchTables = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `${getApiBaseUrl()}/api/vendors/${vendorId}/tables`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch tables");
      }

      const data = await response.json();
      setTables(data.tables || []);
    } catch (error: any) {
      console.error("Error fetching tables:", error);
      setError("Failed to load tables. Please try again.");
      toast.error("Could not load your tables");
    } finally {
      setIsLoading(false);
    }
  };

  const addTable = async () => {
    if (!newTableName.trim()) {
      toast.error("Please enter a table name");
      return;
    }

    try {
      setIsAddingTable(true);
      setError(null);

      const response = await fetch(
        `${getApiBaseUrl()}/api/vendors/${vendorId}/tables`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: newTableName,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to add table");
      }

      const data = await response.json();
      setTables([...tables, data.table]);
      setNewTableName("");
      toast.success("Table added successfully");
    } catch (error: any) {
      console.error("Error adding table:", error);
      toast.error(error.message || "Failed to add table");
    } finally {
      setIsAddingTable(false);
    }
  };

  const deleteTable = async (id: number) => {
    try {
      setIsDeletingTable(id);

      const response = await fetch(
        `${getApiBaseUrl()}/api/vendors/${vendorId}/tables/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to delete table");
      }

      setTables(tables.filter((table) => table.id !== id));
      toast.success("Table deleted successfully");
    } catch (error: any) {
      console.error("Error deleting table:", error);
      toast.error(error.message || "Failed to delete table");
    } finally {
      setIsDeletingTable(null);
    }
  };

  const toggleTableAvailability = async (
    id: number,
    currentStatus: boolean
  ) => {
    try {
      setIsTogglingAvailability(id);

      const response = await fetch(
        `${getApiBaseUrl()}/api/vendors/${vendorId}/tables/${id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isActive: !currentStatus,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || "Failed to toggle table availability"
        );
      }

      const data = await response.json();

      setTables((prevTables) =>
        prevTables.map((table) =>
          table.id === id
            ? { ...table, isActive: data.table?.isActive ?? data.isActive }
            : table
        )
      );

      toast.success(
        `Table ${
          data.table?.isActive ?? data.isActive ? "activated" : "deactivated"
        } successfully`
      );
    } catch (error: any) {
      console.error("Error toggling table availability:", error);
      toast.error(error.message || "Failed to toggle table availability");
    } finally {
      setIsTogglingAvailability(null);
    }
  };

  const startEditing = (table: Table) => {
    if (isRenamingTable || editingTable) return;
    setEditingTable(table.id);
    setEditName(table.name);
  };

  const cancelEditing = () => {
    setEditingTable(null);
    setEditName("");
  };

  const saveTableName = async (id: number) => {
    const trimmedName = editName.trim();

    if (!trimmedName) {
      toast.error("Table name cannot be empty");
      return;
    }

    const currentTable = tables.find((t) => t.id === id);
    if (!currentTable) {
      toast.error("Table not found");
      cancelEditing();
      return;
    }

    if (trimmedName === currentTable.name) {
      cancelEditing();
      return;
    }

    const nameExists = tables.some(
      (table) =>
        table.id !== id &&
        table.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (nameExists) {
      toast.error("A table with this name already exists");
      return;
    }

    try {
      setIsRenamingTable(id);

      const response = await fetch(
        `${getApiBaseUrl()}/api/vendors/${vendorId}/tables/${id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: trimmedName,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to rename table");
      }

      const data = await response.json();

      setTables((prevTables) =>
        prevTables.map((table) =>
          table.id === id
            ? { ...table, name: data.table?.name ?? data.name }
            : table
        )
      );

      cancelEditing();
      toast.success("Table renamed successfully");
    } catch (error: any) {
      console.error("Error renaming table:", error);
      toast.error(error.message || "Failed to rename table");
    } finally {
      setIsRenamingTable(null);
    }
  };

  const regenerateQR = async (id: number) => {
    try {
      setIsRegeneratingQR(id);

      const response = await fetch(
        `${getApiBaseUrl()}/api/vendors/${vendorId}/tables/${id}/regenerate-qr`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to regenerate QR code");
      }

      const data = await response.json();

      setTables(
        tables.map((table) =>
          table.id === id ? { ...table, qrCode: data.table.qrCode } : table
        )
      );

      toast.success("QR code regenerated");
    } catch (error: any) {
      console.error("Error regenerating QR code:", error);
      toast.error(error.message || "Failed to regenerate QR code");
    } finally {
      setIsRegeneratingQR(null);
    }
  };

  const getTableUrl = useCallback(
    (table: Table) => {
      if (!hostUrl) {
        return `${window.location.protocol}//${window.location.host}/menu/${vendorId}/${table.qrCode}`;
      }
      return `${hostUrl}/menu/${vendorId}/${table.qrCode}`;
    },
    [hostUrl, vendorId]
  );

  const downloadQRCode = (table: Table) => {
    try {
      const canvas = document.getElementById(
        `qr-code-${table.id}`
      ) as HTMLCanvasElement;
      if (!canvas) {
        throw new Error("QR code canvas not found");
      }

      const pngUrl = canvas
        .toDataURL("image/png")
        .replace("image/png", "image/octet-stream");

      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `${table.name.replace(/\s+/g, "-")}-qr-code.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      toast.success("QR code downloaded successfully");
    } catch (error) {
      console.error("Error downloading QR code:", error);
      toast.error("Failed to download QR code");
    }
  };

  const copyQRLink = (table: Table) => {
    const qrLink = getTableUrl(table);

    navigator.clipboard.writeText(qrLink).then(
      () => {
        setCopyStatus({ ...copyStatus, [table.id]: true });
        toast.success("Link copied to clipboard");

        setTimeout(() => {
          setCopyStatus((prevStatus) => ({ ...prevStatus, [table.id]: false }));
        }, 2000);
      },
      () => {
        toast.error("Failed to copy link");
      }
    );
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
        <h1 className="text-2xl md:text-3xl font-bold">QR Codes & Tables</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your restaurant tables and QR codes
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

      {/* Add Table */}
      <div className="bg-card rounded-lg border border-border p-4">
        <h2 className="text-lg font-semibold mb-4">Add New Table</h2>
        <div className="flex gap-4">
          <Input
            placeholder="Enter table name (e.g., Table 1)"
            value={newTableName}
            onChange={(e) => setNewTableName(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && addTable()}
            className="flex-1"
          />
          <Button
            onClick={addTable}
            disabled={isAddingTable || !newTableName.trim()}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {isAddingTable ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add Table
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Tables Grid */}
      {tables.length === 0 ? (
        <div className="text-center py-12">
          <QrCode className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No tables yet</h3>
          <p className="text-gray-500">
            Add your first table to generate QR codes
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tables.map((table) => (
            <div
              key={table.id}
              className="bg-card rounded-lg border border-border p-6 space-y-4"
            >
              {/* Table Name */}
              <div className="flex items-center justify-between">
                {editingTable === table.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1"
                      autoFocus
                      onKeyPress={(e) => {
                        if (e.key === "Enter") saveTableName(table.id);
                        if (e.key === "Escape") cancelEditing();
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => saveTableName(table.id)}
                      disabled={isRenamingTable === table.id}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={cancelEditing}
                      disabled={isRenamingTable === table.id}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold">{table.name}</h3>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startEditing(table)}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>

              {/* QR Code */}
              <div className="flex justify-center bg-white p-4 rounded">
                <QRCodeCanvas
                  id={`qr-code-${table.id}`}
                  value={getTableUrl(table)}
                  size={200}
                  level="H"
                />
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadQRCode(table)}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyQRLink(table)}
                    className="flex-1"
                  >
                    {copyStatus[table.id] ? (
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                    ) : (
                      <Copy className="h-4 w-4 mr-1" />
                    )}
                    {copyStatus[table.id] ? "Copied" : "Copy Link"}
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => regenerateQR(table.id)}
                    disabled={isRegeneratingQR === table.id}
                    className="flex-1"
                  >
                    {isRegeneratingQR === table.id ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-1" />
                    )}
                    Regenerate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      toggleTableAvailability(table.id, table.isActive)
                    }
                    disabled={isTogglingAvailability === table.id}
                    className="flex-1"
                  >
                    {isTogglingAvailability === table.id ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : table.isActive ? (
                      <EyeOff className="h-4 w-4 mr-1" />
                    ) : (
                      <Eye className="h-4 w-4 mr-1" />
                    )}
                    {table.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </div>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteTable(table.id)}
                  disabled={isDeletingTable === table.id}
                  className="w-full"
                >
                  {isDeletingTable === table.id ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-1" />
                  )}
                  Delete Table
                </Button>
              </div>

              {!table.isActive && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-xs">
                      This table is inactive. Customers cannot scan this QR
                      code.
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

// Wrap the page with ProtectedRoute to restrict access to vendors and admins only
export default function GenerateQR() {
  return (
    <ProtectedRoute allowedRoles={["vendor", "admin"]}>
      <GenerateQRContent />
    </ProtectedRoute>
  );
}
