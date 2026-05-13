// Mirrors the SQL schema 1:1 — swap MOCK_PRODUCTS for a real API fetch when ready

export interface Product {
  id: number;                   // PRODUCTS.product_id
  name: string;                 // PRODUCTS.name
  slug: string;                 // PRODUCTS.slug
  description: string;          // PRODUCTS.description
  price: number;                // PRODUCTS.price
  originalPrice?: number;       // PRODUCTS.compare_at_price
  category: string;             // CATEGORIES.name (joined)
  categorySlug: string;         // CATEGORIES.slug
  brand: string;                // BRANDS.name (joined)
  imageUrl: string;             // PRODUCT_IMAGES.url (first/primary)
  images?: string[];            // PRODUCT_IMAGES (all)
  rating: number;               // avg of REVIEWS.rating
  reviewCount: number;          // count of REVIEWS
  stock: number;                // INVENTORY.quantity_available
  tags?: string[];              // TAGS via PRODUCT_TAGS (joined)
  isFeatured?: boolean;         // PRODUCTS.is_featured
  isNew?: boolean;              // derived: created_at within 30 days
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface ProductsResponse {
  data: Product[];
  total: number;
  page: number;
  pageSize: number;
}
