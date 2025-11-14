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
import toast from "react-hot-toast";
import Cart, { MobileCartButton } from "@/components/menu/Cart";
import { useCart } from "@/context/CartContext";
import MenuItem from "@/components/menu/MenuItem";
import Link from "next/link";
import { useTheme } from "../ThemeProvider";
import { getApiBaseUrl } from "@/lib/api";

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
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [sortMethod, setSortMethod] = useState("popularity");
  const [sortOrder, setSortOrder] = useState("desc");
  const [isSorting, setIsSorting] = useState(false);
  const [showOrderNotification, setShowOrderNotification] = useState(false);

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
        // Generate a unique toast ID for this status update
        const toastKey = `order-${pendingOrder.id}-${pendingOrder.status}`;
        const toastId = `${toastKey}-menu-${Date.now()}`;

        // Check if we've shown this exact status update before (in the last 30 seconds)
        // Increased from 5 to 30 seconds to prevent duplicate toasts across page navigations
        const lastShown = localStorage.getItem(`last_toast_${toastKey}`);
        const shouldShow =
          !lastShown || Date.now() - parseInt(lastShown) > 30000;

        if (shouldShow) {
          // Save this toast's timestamp
          localStorage.setItem(`last_toast_${toastKey}`, Date.now().toString());

          toast.success(
            "Your order has been accepted and is ready for payment!",
            {
              id: toastId,
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
    return matchesCategory && matchesSearch && item.available;
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 border-b border-border shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{vendorInfo?.restaurant_name}</h1>
            {tableInfo && (
              <p className="text-xs text-muted-foreground">{tableInfo.name}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={toggleTheme}
              variant="ghost"
              size="icon"
              className="transition-colors"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/order-tracking">
                <Package className="h-4 w-4 mr-2" />
                Track Order
              </Link>
            </Button>
            {/* Cart Component */}
            <Cart vendorId={vendor} tableNo={tabel_identifier} />
          </div>
        </div>{" "}
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
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              name="search"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch(e.currentTarget.value);
                }
              }}
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin" />
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
        <div className="flex gap-2 overflow-x-auto py-4 scrollbar-hide mt-2">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              className={
                selectedCategory === category
                  ? "bg-orange-500 hover:bg-orange-600 text-white"
                  : ""
              }
              onClick={() => handleCategoryChange(category)}
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Menu Items */}
      <div className="container mx-auto px-4 pb-8">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-border p-8">
            <Search className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No menu items found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or selecting a different category
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredItems.map((item) => (
              <MenuItem
                key={item.id}
                item={item}
                isPopular={topPopularItems.includes(item.id)}
              />
            ))}
          </div>
        )}{" "}
      </div>

      {/* Add the mobile cart button at the bottom */}
      <div className="md:hidden">
        <MobileCartButton vendorId={vendor} tableNo={tabel_identifier} />
        <div className="pb-20"></div>
      </div>
    </div>
  );
};

export default MenuContent;
