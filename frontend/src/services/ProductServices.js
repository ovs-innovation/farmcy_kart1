import requests from "./httpServices";

const fallbackProducts = [
  {
    _id: "demo-product-1",
    title: { en: "Paracetamol 500mg", de: "Paracetamol 500mg" },
    slug: "paracetamol-500mg",
    image: ["/placeholder.png"],
    stock: 50,
    prices: { price: 50, originalPrice: 60, discount: 10 },
    variants: [],
    isCombination: false,
  },
  {
    _id: "demo-product-2",
    title: { en: "Vitamin C 1000mg", de: "Vitamin C 1000mg" },
    slug: "vitamin-c-1000mg",
    image: ["/placeholder.png"],
    stock: 100,
    prices: { price: 120, originalPrice: 150, discount: 30 },
    variants: [],
    isCombination: false,
  },
  {
    _id: "demo-product-3",
    title: { en: "First Aid Kit", de: "Erste-Hilfe-Kasten" },
    slug: "first-aid-kit",
    image: ["/placeholder.png"],
    stock: 30,
    prices: { price: 250, originalPrice: 300, discount: 50 },
    variants: [],
    isCombination: false,
  }
];

const fallbackStoreProducts = {
  products: fallbackProducts,
  popularProducts: fallbackProducts,
  discountedProducts: fallbackProducts,
  bestSellingProducts: fallbackProducts,
};

const ProductServices = {
  getShowingProducts: async () => {
    try {
      const res = await requests.get("/products/show");
      return res && res.length > 0 ? res : fallbackProducts;
    } catch (error) {
      return fallbackProducts;
    }
  },
  getShowingStoreProducts: async ({
    category = "",
    title = "",
    slug = "",
    brand = "",
  }) => {
    try {
      const res = await requests.get(
        `/products/store?category=${category}&title=${title}&slug=${slug}&brand=${brand}`
      );
      if (!res) return fallbackStoreProducts;
      const hasData = (res.popularProducts?.length > 0) || (res.discountedProducts?.length > 0) || (res.bestSellingProducts?.length > 0) || (res.products?.length > 0);
      return hasData ? res : { ...res, ...fallbackStoreProducts };
    } catch (error) {
      return fallbackStoreProducts;
    }
  },
  getDiscountedProducts: async () => {
    try {
      const res = await requests.get("/products/discount");
      return res && res.length > 0 ? res : fallbackProducts;
    } catch (error) {
      return fallbackProducts;
    }
  },

  getProductBySlug: async (slug) => {
    return requests.get(`/products/${slug}`);
  },
  // Enterprise Search API
  searchProducts: async ({
    query = "",
    category = "",
    brand = "",
    minPrice,
    maxPrice,
    rating,
    discount,
    inStock,
    sort = "relevance",
    page = 1,
    limit = 20,
    signal,
  } = {}) => {
    try {
      const params = new URLSearchParams();
      if (query) params.append("q", query);
      if (category) params.append("category", category);
      if (brand) params.append("brand", brand);
      if (minPrice !== undefined && minPrice !== "") params.append("minPrice", minPrice);
      if (maxPrice !== undefined && maxPrice !== "") params.append("maxPrice", maxPrice);
      if (rating) params.append("rating", rating);
      if (discount) params.append("discount", discount);
      if (inStock) params.append("inStock", inStock);
      if (sort) params.append("sort", sort);
      if (page) params.append("page", page);
      if (limit) params.append("limit", limit);

      const res = await requests.get(`/products/search?${params.toString()}`, { signal });
      return res || { products: [], totalDoc: 0, totalPages: 1 };
    } catch (error) {
      if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") {
        throw error;
      }
      return { products: fallbackProducts, totalDoc: fallbackProducts.length, totalPages: 1 };
    }
  },
  // Fast Autocomplete Suggestions API
  getAutocompleteSuggestions: async (query = "", signal) => {
    try {
      if (!query || query.trim().length < 2) return { query, suggestions: [] };
      const res = await requests.get(
        `/products/autocomplete?q=${encodeURIComponent(query.trim())}`,
        { signal }
      );
      return res || { query, suggestions: [] };
    } catch (error) {
      if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") {
        throw error;
      }
      return { query, suggestions: [] };
    }
  },
  // Track product view
  addProductView: async (body) => {
    return requests.post("/products/view", body);
  },

  // Get suggested products
  getSuggestedProducts: async ({ productIds }) => {
    // If we have productIds (guest mode), send them as query params
    const queryString = productIds ? `?productIds=${productIds}` : "";
    try {
      const res = await requests.get(`/products/suggested${queryString}`);
      return res && res.length > 0 ? res : fallbackProducts;
    } catch (error) {
      return fallbackProducts;
    }
  },
};

export default ProductServices;
