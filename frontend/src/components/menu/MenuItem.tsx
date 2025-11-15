import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { useCart } from "../../context/CartContext";
import React from "react";
import { getApiBaseUrl } from "@/lib/api";

interface MenuItemProps {
  item: {
    id: number;
    name: string;
    category: string;
    price: number;
    description: string;
    image: string | null;
    available: boolean;
    isSearchResult?: boolean;
  };
  isPopular: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({ item, isPopular }) => {
  const { addToCart, recentlyAdded, pendingOrder } = useCart();
  const defaultImage = "/images/default-food-image.svg";

  // Construct full image URL if it's a relative path
  const getImageUrl = (imagePath: string | null) => {
    if (!imagePath) return defaultImage;
    if (imagePath.startsWith("http")) return imagePath;
    return `${getApiBaseUrl()}${imagePath}`;
  };

  return (
    <div className="group bg-card rounded-2xl overflow-hidden border border-border hover:border-orange-300 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative">
      <div className="aspect-[4/3] relative overflow-hidden bg-muted">
        <img
          src={getImageUrl(item.image)}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
            e.currentTarget.src = defaultImage;
          }}
          loading="lazy"
        />
        {item.isSearchResult && (
          <Badge className="absolute top-3 right-3 bg-blue-600 text-white shadow-lg">
            🔍 Match
          </Badge>
        )}
        {isPopular && !item.isSearchResult && (
          <Badge className="absolute top-3 right-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg border-0">
            ⭐ Popular
          </Badge>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between mb-2 gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base mb-1 truncate">
              {item.name}
            </h3>
            <p className="text-xs text-muted-foreground capitalize">
              {item.category}
            </p>
          </div>
          <span className="font-bold text-lg text-orange-600 dark:text-orange-500 whitespace-nowrap">
            ₹{item.price.toFixed(0)}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[2.5rem]">
          {item.description || "Delicious dish prepared with fresh ingredients"}
        </p>
        <Button
          className={`w-full rounded-full font-medium transition-all duration-200 ${
            recentlyAdded[item.id]
              ? "bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/30"
              : "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/30"
          }`}
          disabled={!item.available || pendingOrder !== null}
          onClick={() => addToCart(item)}
        >
          {pendingOrder !== null
            ? "Order Pending"
            : recentlyAdded[item.id]
            ? "✓ Added to Cart"
            : "+ Add to Cart"}
        </Button>
      </div>
      {/* Overlay covers entire card including button */}
      {!item.available && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />
          <div className="relative z-30 text-center">
            <span className="text-lg font-bold text-white drop-shadow-lg">Currently Not Available</span>
            <p className="text-xs text-white/80 mt-1">Check back later</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuItem;
