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
  const { addToCart, recentlyAdded } = useCart();
  // Use inline SVG data URI to avoid 404 errors
  const defaultImage =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f3f4f6'/%3E%3Cpath d='M200 100 L250 150 L200 200 L150 150 Z' fill='%23d1d5db'/%3E%3Cpath d='M200 130 L230 150 L200 170 L170 150 Z' fill='%23e5e7eb'/%3E%3Ccircle cx='185' cy='140' r='3' fill='%239ca3af'/%3E%3Ccircle cx='215' cy='140' r='3' fill='%239ca3af'/%3E%3Cpath d='M185 155 Q200 165 215 155' stroke='%239ca3af' stroke-width='2' fill='none'/%3E%3C/svg%3E";

  // Construct full image URL if it's a relative path
  const getImageUrl = (imagePath: string | null) => {
    if (!imagePath) return defaultImage;
    if (imagePath.startsWith("http")) return imagePath;
    return `${getApiBaseUrl()}${imagePath}`;
  };

  return (
    <div className="bg-card rounded-xl overflow-hidden border border-border hover:shadow-md transition-shadow">
      <div className="aspect-video relative">
        <img
          src={getImageUrl(item.image)}
          alt={item.name}
          className="w-full h-full object-cover"
          onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
            e.currentTarget.src = defaultImage;
          }}
          loading="lazy"
        />
        {!item.available && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
            <span className="text-lg font-medium">Currently Unavailable</span>
          </div>
        )}
        {item.isSearchResult && (
          <Badge className="absolute top-2 right-2 bg-blue-500">
            Search Result
          </Badge>
        )}
        {isPopular && !item.isSearchResult && (
          <Badge className="absolute top-2 right-2 bg-purple-500">
            Popular
          </Badge>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-medium">{item.name}</h3>
            <p className="text-xs text-muted-foreground">{item.category}</p>
          </div>
          <span className="font-medium">Rs. {item.price.toFixed(2)}</span>
        </div>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {item.description}
        </p>
        <Button
          className={`w-full ${
            recentlyAdded[item.id]
              ? "bg-green-500 hover:bg-green-600 text-white"
              : "bg-orange-500 hover:bg-orange-600 text-white"
          }`}
          disabled={!item.available}
          onClick={() => addToCart(item)}
        >
          {recentlyAdded[item.id] ? "Added ✓" : "Add to Cart"}
        </Button>
      </div>
    </div>
  );
};

export default MenuItem;
