import React, { useState, useEffect } from "react";
import {
  Search,
  Loader2,
  SortAsc,
  ShoppingCart,
  ChevronDown,
  Package,
  Clock,
  CheckCircle,
  X,
  Sun,
  Moon,
  ArrowRightLeft,
  UserPlus,
  Heart,
  Phone,
  Mail,
  MapPin,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import toast from "react-hot-toast";
import Cart, { MobileCartButton } from "@/components/menu/Cart";
import { useCart } from "@/context/CartContext";
import MenuItem from "@/components/menu/MenuItem";
import Link from "next/link";
import { useTheme } from "../ThemeProvider";
import { getApiBaseUrl } from "@/lib/api";
import { useRouter } from "next/navigation";

interface MenuItemType {
  id: number;
  name: string;
  category: string;
  price: number;
  description: string;
  image: string | null;
  available: boolean;
  isSearchResult?: boolean;
}

interface VendorInfo {
  restaurant_name: string;
  [key: string]: any;
}

interface TableInfo {
  id: number;
  name: string;
  qr_code: string;
  is_active: boolean;
  has_active_order: boolean;
  active_order_id: number | null;
}

interface MenuContentProps {
  categories: string[];
  menuItems: MenuItemType[];
  setMenuItems: React.Dispatch<React.SetStateAction<MenuItemType[]>>;
  vendorInfo: VendorInfo | null;
  vendor: string;
  tabel_identifier: string;
  tableInfo: TableInfo | null;
  fetchMenuData: () => Promise<void>;
}

const MenuContent: React.FC<MenuContentProps> = ({
  categories,
  menuItems,
  setMenuItems,
  vendorInfo,
  vendor,
  tabel_identifier,
  tableInfo,
  fetchMenuData,
}) => {
  const { cart, pendingOrder } = useCart();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [sortMethod, setSortMethod] = useState("popularity");
  const [sortOrder, setSortOrder] = useState("desc");
  const [isSorting, setIsSorting] = useState(false);
  const [showOrderNotification, setShowOrderNotification] = useState(false);
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);
  const [newTableIdentifier, setNewTableIdentifier] = useState("");
  const [isMigrating, setIsMigrating] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [joinTableIdentifier, setJoinTableIdentifier] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [joinTableInfo, setJoinTableInfo] = useState<any>(null);
  const [isCallingWaiter, setIsCallingWaiter] = useState(false);
  const [waiterCallSuccess, setWaiterCallSuccess] = useState(false);

  // Check for pending orders and show notification - dependent only on pendingOrder updates from WebSocket
  useEffect(() => {
    if (
      pendingOrder &&
      (pendingOrder.status === "pending" || pendingOrder.status === "accepted")
    ) {
      console.log(
        "MenuContent: Setting showOrderNotification to true for status:",
        pendingOrder.status
      );
      setShowOrderNotification(true);

      // No need to explicitly check via API as pendingOrder will be updated via WebSocket
      if (pendingOrder.status === "accepted") {
        // Check if user just came from order tracking page
        const fromTracking = sessionStorage.getItem("from_order_tracking");
        if (fromTracking) {
          // Clear the flag and don't show toast
          sessionStorage.removeItem("from_order_tracking");
          return;
        }

        // Generate a unique toast ID for this status update
        const toastKey = `order-${pendingOrder.id}-accepted`;

        // Check if we've already shown this toast for this specific order acceptance
        const hasShown = sessionStorage.getItem(`toast_shown_${toastKey}`);

        if (!hasShown) {
          // Mark this toast as shown for this session
          sessionStorage.setItem(`toast_shown_${toastKey}`, "true");

          toast.success(
            "Your order has been accepted and is ready for payment!",
            {
              duration: 4000,
            }
          );
        }
      }
    } else {
      console.log(
        "MenuContent: Setting showOrderNotification to false, pendingOrder:",
        pendingOrder
      );
      setShowOrderNotification(false);
    }
  }, [pendingOrder]);

  const filteredItems = menuItems.filter((item) => {
    const matchesCategory =
      selectedCategory === "All" || item.category === selectedCategory;
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Backend search function
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchQuery("");
      return;
    }

    setSearchQuery(query);

    if (query.length < 2) return;

    try {
      setIsSearching(true);

      const response = await fetch(
        `${getApiBaseUrl()}/api/menu/${vendor}/search/?query=${encodeURIComponent(
          query
        )}`
      );

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data = await response.json();

      const searchResults: MenuItemType[] = data.results.map((item: any) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        price: parseFloat(item.price),
        description: item.description || "",
        image: item.image_url,
        available: item.is_available,
        isSearchResult: true,
      }));

      setMenuItems((prevItems) => {
        const nonMatchingItems = prevItems.filter(
          (item) => !searchResults.some((result) => result.id === item.id)
        );
        return [...searchResults, ...nonMatchingItems];
      });
    } catch (error) {
      console.error("Error during search:", error);
      toast.error("Search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  // Sorting function
  const handleSort = async (method: string, order: string) => {
    try {
      setSortMethod(method);
      setSortOrder(order);
      setIsSorting(true);

      const response = await fetch(
        `${getApiBaseUrl()}/api/menu/${vendor}/sort/?sort_by=${method}&order=${order}`
      );

      if (!response.ok) {
        throw new Error("Sorting failed");
      }

      const data = await response.json();

      const sortedItems: MenuItemType[] = data.items.map((item: any) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        price: parseFloat(item.price),
        description: item.description || "",
        image: item.image_url,
        available: item.is_available,
      }));

      setMenuItems(sortedItems);
    } catch (error) {
      console.error("Error during sorting:", error);
      toast.error("Sorting failed. Please try again.");
    } finally {
      setIsSorting(false);
    }
  };

  // Function to get the current sort display text
  const getSortText = () => {
    switch (`${sortMethod}-${sortOrder}`) {
      case "popularity-desc":
        return "Most Popular";
      case "price-asc":
        return "Price: Low to High";
      case "price-desc":
        return "Price: High to Low";
      case "name-asc":
        return "Name: A to Z";
      case "name-desc":
        return "Name: Z to A";
      default:
        return "Sort";
    }
  };

  // Add this useEffect for debounced search
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) return;

    const debounceTimer = setTimeout(() => {
      handleSearch(searchQuery);
    }, 500); // 500ms delay

    return () => {
      clearTimeout(debounceTimer);
    };
  }, [searchQuery]);

  // Handle category change
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    if (searchQuery) {
      setSearchQuery("");
      fetchMenuData();
    }
  };

  // Add a function to get top 3 popular items
  const getTopPopularItems = () => {
    // Simple implementation - in real app, you'd get this from backend
    return filteredItems.slice(0, 3).map((item) => item.id);
  };

  const topPopularItems = getTopPopularItems();

  // Add this useEffect after your other useEffects
  useEffect(() => {
    // Save scroll position when unmounting
    return () => {
      sessionStorage.setItem("menuScrollPosition", window.scrollY.toString());
    };
  }, []);

  // Add this useEffect to restore scroll position on load
  useEffect(() => {
    const savedPosition = sessionStorage.getItem("menuScrollPosition");
    if (savedPosition) {
      window.scrollTo(0, parseInt(savedPosition, 10));
    }
  }, []);

  // Handle table migration
  const handleTableMigration = async () => {
    if (!newTableIdentifier.trim()) {
      toast.error("Please enter a table identifier");
      return;
    }

    if (newTableIdentifier.trim() === tabel_identifier) {
      toast.error("You are already at this table");
      return;
    }

    setIsMigrating(true);

    try {
      // Check if new table is valid and available
      const tableResponse = await fetch(
        `${getApiBaseUrl()}/api/public-table/${vendor}/${newTableIdentifier.trim()}/`
      );

      if (!tableResponse.ok) {
        throw new Error("Table not found or inactive");
      }

      const newTableData = await tableResponse.json();

      if (!newTableData.is_active) {
        toast.error("The target table is currently unavailable");
        setIsMigrating(false);
        return;
      }

      if (newTableData.has_active_order) {
        toast.error(
          "The target table already has an active order. Please choose a different table."
        );
        setIsMigrating(false);
        return;
      }

      // Update localStorage with new table info
      localStorage.setItem("last_order_table", newTableIdentifier.trim());

      // Show success message
      toast.success(`Moving to ${newTableData.name}...`);

      // Navigate to new table
      router.push(`/menu/${vendor}/${newTableIdentifier.trim()}`);

      // Close dialog
      setShowMigrationDialog(false);
      setNewTableIdentifier("");
    } catch (error) {
      console.error("Error migrating table:", error);
      toast.error("Failed to migrate to new table. Please try again.");
    } finally {
      setIsMigrating(false);
    }
  };

  // Handle table join - check table availability first
  const handleCheckJoinTable = async () => {
    if (!joinTableIdentifier.trim()) {
      toast.error("Please enter a table identifier");
      return;
    }

    if (joinTableIdentifier.trim() === tabel_identifier) {
      toast.error("You are already at this table");
      return;
    }

    setIsJoining(true);

    try {
      // Check if target table exists and has an active order
      const tableResponse = await fetch(
        `${getApiBaseUrl()}/api/public-table/${vendor}/${joinTableIdentifier.trim()}/`
      );

      if (!tableResponse.ok) {
        throw new Error("Table not found or inactive");
      }

      const targetTableData = await tableResponse.json();

      if (!targetTableData.is_active) {
        toast.error("The target table is currently unavailable");
        setIsJoining(false);
        return;
      }

      if (!targetTableData.has_active_order) {
        toast.error(
          "The target table doesn't have an active order. Use 'Switch Table' instead to move to an empty table."
        );
        setIsJoining(false);
        return;
      }

      // Store table info for confirmation
      setJoinTableInfo(targetTableData);
      setIsJoining(false);
    } catch (error) {
      console.error("Error checking join table:", error);
      toast.error("Failed to check table. Please try again.");
      setIsJoining(false);
    }
  };

  // Confirm join table
  const handleConfirmJoinTable = async () => {
    if (!joinTableInfo) return;

    setIsJoining(true);

    try {
      // Update localStorage with new table info
      localStorage.setItem("last_order_table", joinTableIdentifier.trim());
      localStorage.setItem(
        "current_order_id",
        joinTableInfo.active_order_id.toString()
      );

      // Show success message
      toast.success(`Joining ${joinTableInfo.name}...`);

      // Navigate to target table
      router.push(`/menu/${vendor}/${joinTableIdentifier.trim()}`);

      // Close dialog
      setShowJoinDialog(false);
      setJoinTableIdentifier("");
      setJoinTableInfo(null);
    } catch (error) {
      console.error("Error joining table:", error);
      toast.error("Failed to join table. Please try again.");
    } finally {
      setIsJoining(false);
    }
  };

  // Handle call waiter
  const handleCallWaiter = async () => {
    if (isCallingWaiter) return;

    setIsCallingWaiter(true);

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/call-waiter`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vendor_id: vendor,
          table_identifier: tabel_identifier,
          table_name: tableInfo?.name || tabel_identifier,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to call waiter");
      }

      // Show success animation
      setWaiterCallSuccess(true);
      toast.success("Waiter has been notified! They'll be with you shortly.", {
        duration: 4000,
        icon: "🔔",
      });

      // Reset success state after animation
      setTimeout(() => {
        setWaiterCallSuccess(false);
      }, 3000);
    } catch (error) {
      console.error("Error calling waiter:", error);
      toast.error("Failed to notify waiter. Please try again.");
    } finally {
      setIsCallingWaiter(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/98 backdrop-blur-xl border-b border-border/40 shadow-lg">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                  {vendorInfo?.restaurant_name?.charAt(0) || "R"}
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
                    {vendorInfo?.restaurant_name}
                  </h1>
                  {tableInfo && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                      {tableInfo.name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                onClick={toggleTheme}
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-muted"
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
              <Button
                onClick={() => setShowMigrationDialog(true)}
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-muted hidden sm:flex"
                title="Switch Table"
              >
                <ArrowRightLeft className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => setShowJoinDialog(true)}
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-muted hidden sm:flex"
                title="Join Table"
              >
                <UserPlus className="h-4 w-4" />
              </Button>
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-muted hidden sm:flex"
                title="Track Order"
              >
                <Link href="/order-tracking">
                  <Package className="h-4 w-4" />
                </Link>
              </Button>
              {/* Cart Component */}
              <Cart vendorId={vendor} tableNo={tabel_identifier} />
            </div>
          </div>
        </div>
      </header>

      {/* Order Status Notification */}
      {showOrderNotification && pendingOrder && (
        <div
          className={`border-b ${
            pendingOrder.status === "pending"
              ? "bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800"
              : "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
          }`}
        >
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {pendingOrder.status === "pending" ? (
                  <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-3" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-3" />
                )}
                <div>
                  <p
                    className={`font-medium ${
                      pendingOrder.status === "pending"
                        ? "text-yellow-800 dark:text-yellow-200"
                        : "text-green-800 dark:text-green-200"
                    }`}
                  >
                    {pendingOrder.status === "pending"
                      ? "Order Submitted - Waiting for Approval"
                      : "Order Approved - Ready for Payment!"}
                  </p>
                  <p
                    className={`text-sm ${
                      pendingOrder.status === "pending"
                        ? "text-yellow-700 dark:text-yellow-300"
                        : "text-green-700 dark:text-green-300"
                    }`}
                  >
                    {" "}
                    Order #{pendingOrder.id} • Total: Rs. {pendingOrder.total}
                    {pendingOrder.status === "accepted" &&
                      " • Click cart to pay"}{" "}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowOrderNotification(false)}
                className={`${
                  pendingOrder.status === "pending"
                    ? "text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-200"
                    : "text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
                }`}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Search and Controls */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search for dishes, ingredients, or cuisine..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 rounded-full border-2 focus-visible:ring-orange-500 focus-visible:border-orange-500 bg-card shadow-sm"
              name="search"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch(e.currentTarget.value);
                }
              }}
            />
            {isSearching && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-orange-500" />
            )}
          </div>
          <div className="flex gap-2">
            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="flex gap-2 items-center min-w-[150px] justify-between"
                >
                  <div className="flex items-center">
                    {isSorting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <SortAsc className="h-4 w-4 mr-2" />
                    )}
                    <span>{getSortText()}</span>
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuItem
                  onClick={() => handleSort("popularity", "desc")}
                >
                  Most Popular
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort("price", "asc")}>
                  Price: Low to High
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort("price", "desc")}>
                  Price: High to Low
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleSort("name", "asc")}>
                  Name: A to Z
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort("name", "desc")}>
                  Name: Z to A
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Categories */}
        <div className="relative">
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide scroll-smooth">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                className={`px-6 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                  selectedCategory === category
                    ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30 scale-105"
                    : "bg-card border border-border hover:border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/30 text-foreground"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none" />
        </div>
      </div>

      {/* Menu Items */}
      <div className="container mx-auto px-4 pb-8">
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 bg-card/50 backdrop-blur rounded-2xl border border-border/50 p-8 shadow-sm">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No menu items found</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Try adjusting your search or selecting a different category to
              discover delicious dishes
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">
                {filteredItems.length}
              </span>{" "}
              {filteredItems.length === 1 ? "dish" : "dishes"}
              {selectedCategory !== "All" && (
                <span>
                  {" "}
                  in{" "}
                  <span className="font-medium text-orange-600">
                    {selectedCategory}
                  </span>
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredItems.map((item) => (
                <MenuItem
                  key={item.id}
                  item={item}
                  isPopular={topPopularItems.includes(item.id)}
                />
              ))}
            </div>
          </>
        )}{" "}
      </div>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-muted/50 to-muted border-t border-border mt-12">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
            {/* Restaurant Info */}
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  {vendorInfo?.restaurant_name?.charAt(0) || "R"}
                </div>
                <div>
                  <h3 className="font-bold text-lg">
                    {vendorInfo?.restaurant_name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Fine Dining Experience
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Serving delicious food with love and care. Your satisfaction is
                our priority.
              </p>
            </div>

            {/* Quick Links */}
            <div className="text-center">
              <h4 className="font-semibold mb-3 text-sm uppercase tracking-wide">
                Quick Actions
              </h4>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setShowMigrationDialog(true)}
                  className="text-sm text-muted-foreground hover:text-orange-600 transition-colors inline-flex items-center justify-center gap-2"
                >
                  <ArrowRightLeft className="h-4 w-4" />
                  Switch Table
                </button>
                <button
                  onClick={() => setShowJoinDialog(true)}
                  className="text-sm text-muted-foreground hover:text-orange-600 transition-colors inline-flex items-center justify-center gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Join Table
                </button>
                <Link
                  href="/order-tracking"
                  className="text-sm text-muted-foreground hover:text-orange-600 transition-colors inline-flex items-center justify-center gap-2"
                >
                  <Package className="h-4 w-4" />
                  Track Order
                </Link>
              </div>
            </div>

            {/* Contact Info */}
            <div className="text-center md:text-right">
              <h4 className="font-semibold mb-3 text-sm uppercase tracking-wide">
                Need Help?
              </h4>
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <div className="inline-flex items-center justify-center md:justify-end gap-2">
                  <Phone className="h-4 w-4" />
                  <span>Call for assistance</span>
                </div>
                <div className="inline-flex items-center justify-center md:justify-end gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{tableInfo?.name || "Your Table"}</span>
                </div>
                <div className="inline-flex items-center justify-center md:justify-end gap-2">
                  <Heart className="h-4 w-4 text-red-500" />
                  <span>Made with love</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-6 border-t border-border">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} {vendorInfo?.restaurant_name}. All
                rights reserved.
              </p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <button className="hover:text-orange-600 transition-colors">
                  Privacy Policy
                </button>
                <span>•</span>
                <button className="hover:text-orange-600 transition-colors">
                  Terms of Service
                </button>
                <span>•</span>
                <button className="hover:text-orange-600 transition-colors">
                  FAQ
                </button>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Add the mobile cart button at the bottom */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40">
        <MobileCartButton vendorId={vendor} tableNo={tabel_identifier} />
      </div>

      {/* Call Waiter Floating Button */}
      <button
        onClick={handleCallWaiter}
        disabled={isCallingWaiter}
        className={`fixed bottom-24 right-6 z-50 group transition-all duration-500 flex flex-col items-center gap-2 ${
          isCallingWaiter ? "opacity-70" : ""
        }`}
      >
        <div
          className={`h-16 w-16 rounded-full shadow-2xl transition-all duration-500 flex items-center justify-center ${
            waiterCallSuccess
              ? "bg-green-600 scale-110"
              : "bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 hover:scale-110"
          } ${isCallingWaiter ? "animate-pulse" : ""}`}
        >
          {waiterCallSuccess ? (
            <CheckCircle className="h-8 w-8 text-white" />
          ) : (
            <Bell
              className={`h-8 w-8 text-white ${
                isCallingWaiter ? "animate-swing" : ""
              }`}
            />
          )}
          {/* Subtle ripple effect */}
          {!waiterCallSuccess && !isCallingWaiter && (
            <span
              className="absolute inset-0 rounded-full bg-orange-400 animate-ping opacity-20"
              style={{ animationDuration: "3s" }}
            ></span>
          )}
        </div>

        {/* Integrated label below button */}
        <span
          className={`text-xs font-medium px-3 py-1 rounded-full transition-all duration-300 ${
            waiterCallSuccess
              ? "bg-green-600 text-white shadow-lg"
              : "bg-card text-foreground border border-border shadow-md group-hover:border-orange-500 group-hover:text-orange-600"
          }`}
        >
          {waiterCallSuccess ? "✓ Notified" : "Call Waiter"}
        </span>
      </button>

      {/* Table Migration Dialog */}
      <Dialog open={showMigrationDialog} onOpenChange={setShowMigrationDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Switch Table</DialogTitle>
            <DialogDescription>
              Enter the new table identifier to move your cart to a different
              table.
              {cart.length > 0 && " Your cart items will be preserved."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Current Table
              </label>
              <div className="px-3 py-2 bg-muted rounded-md text-sm">
                {tableInfo?.name || tabel_identifier}
              </div>
            </div>
            <div>
              <label
                htmlFor="new-table"
                className="text-sm font-medium mb-2 block"
              >
                New Table Identifier
              </label>
              <Input
                id="new-table"
                placeholder="Enter table QR code or identifier"
                value={newTableIdentifier}
                onChange={(e) => setNewTableIdentifier(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleTableMigration();
                  }
                }}
                disabled={isMigrating}
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                You can scan the QR code on the new table or enter the table
                identifier manually
              </p>
            </div>
            {cart.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  <strong>Note:</strong> You have {cart.length} item
                  {cart.length > 1 ? "s" : ""} in your cart. They will be moved
                  to the new table.
                </p>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setShowMigrationDialog(false);
                setNewTableIdentifier("");
              }}
              disabled={isMigrating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleTableMigration}
              disabled={isMigrating || !newTableIdentifier.trim()}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {isMigrating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Switching...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Switch Table
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Join Table Dialog */}
      <Dialog
        open={showJoinDialog}
        onOpenChange={(open) => {
          setShowJoinDialog(open);
          if (!open) {
            setJoinTableIdentifier("");
            setJoinTableInfo(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Join Table</DialogTitle>
            <DialogDescription>
              Enter the table identifier to join an existing table's order.
              {cart.length > 0 && " You can add your items to their order."}
            </DialogDescription>
          </DialogHeader>

          {!joinTableInfo ? (
            // Step 1: Enter table identifier
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Current Table
                </label>
                <div className="px-3 py-2 bg-muted rounded-md text-sm">
                  {tableInfo?.name || tabel_identifier}
                </div>
              </div>
              <div>
                <label
                  htmlFor="join-table"
                  className="text-sm font-medium mb-2 block"
                >
                  Table to Join
                </label>
                <Input
                  id="join-table"
                  placeholder="Enter table QR code or identifier"
                  value={joinTableIdentifier}
                  onChange={(e) => setJoinTableIdentifier(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCheckJoinTable();
                    }
                  }}
                  disabled={isJoining}
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Scan the QR code on the table you want to join or enter the
                  identifier
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>Join Table</strong> allows you to add items to an
                  existing table's order. Perfect for joining friends!
                </p>
              </div>
            </div>
          ) : (
            // Step 2: Confirm join
            <div className="space-y-4 mt-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-green-900 dark:text-green-100 mb-1">
                      Table Found!
                    </h4>
                    <p className="text-sm text-green-800 dark:text-green-300">
                      <strong>{joinTableInfo.name}</strong> has an active order.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-sm">What happens next:</h4>
                <ul className="text-sm text-muted-foreground space-y-1.5 ml-4">
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 mt-0.5">•</span>
                    <span>You'll be moved to {joinTableInfo.name}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 mt-0.5">•</span>
                    <span>
                      You can view and add items to the existing order
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 mt-0.5">•</span>
                    <span>Your cart items will be preserved</span>
                  </li>
                </ul>
              </div>

              {cart.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    You have {cart.length} item{cart.length > 1 ? "s" : ""} in
                    your cart that will be moved to the new table.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setShowJoinDialog(false);
                setJoinTableIdentifier("");
                setJoinTableInfo(null);
              }}
              disabled={isJoining}
            >
              Cancel
            </Button>
            {!joinTableInfo ? (
              <Button
                onClick={handleCheckJoinTable}
                disabled={isJoining || !joinTableIdentifier.trim()}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                {isJoining ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>Check Table</>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleConfirmJoinTable}
                disabled={isJoining}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isJoining ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Join Table
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MenuContent;
