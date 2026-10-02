"use strict";

const esClient = require("../config/elasticsearch");
const Product = require("../models/Product");
const Category = require("../models/Category");
const Brand = require("../models/Brand");
const mongoose = require("mongoose");
const { languageCodes } = require("../utils/data");

// In-memory bounded cache with TTL (60s)
const searchCache = new Map();
const CACHE_TTL_MS = 60 * 1000;
const MAX_CACHE_SIZE = 500;

const getCacheKey = (prefix, params) => {
  return `${prefix}:${JSON.stringify(params)}`;
};

const getFromCache = (key) => {
  const cached = searchCache.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    searchCache.delete(key);
    return null;
  }
  return cached.data;
};

const setInCache = (key, data, ttlMs = CACHE_TTL_MS) => {
  if (searchCache.size >= MAX_CACHE_SIZE) {
    const firstKey = searchCache.keys().next().value;
    if (firstKey) searchCache.delete(firstKey);
  }
  searchCache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
};

const clearSearchCache = () => {
  searchCache.clear();
};

/**
 * Elasticsearch Index Settings & Mappings
 */
const getIndexMapping = () => {
  return {
    settings: {
      number_of_shards: 1,
      number_of_replicas: 0,
      analysis: {
        tokenizer: {
          edge_ngram_tokenizer: {
            type: "edge_ngram",
            min_gram: 2,
            max_gram: 15,
            token_chars: ["letter", "digit"],
          },
        },
        analyzer: {
          autocomplete_index_analyzer: {
            type: "custom",
            tokenizer: "edge_ngram_tokenizer",
            filter: ["lowercase", "asciifolding"],
          },
          autocomplete_search_analyzer: {
            type: "custom",
            tokenizer: "standard",
            filter: ["lowercase", "asciifolding"],
          },
          pharmacy_text_analyzer: {
            type: "custom",
            tokenizer: "standard",
            filter: ["lowercase", "asciifolding", "english_stop"],
          },
        },
        filter: {
          english_stop: {
            type: "stop",
            stopwords: "_english_",
          },
        },
      },
    },
    mappings: {
      properties: {
        id: { type: "keyword" },
        slug: { type: "keyword" },
        sku: {
          type: "keyword",
          fields: {
            text: { type: "text", analyzer: "pharmacy_text_analyzer" },
          },
        },
        barcode: { type: "keyword" },
        batchNo: { type: "keyword" },
        title: {
          properties: {
            en: {
              type: "text",
              analyzer: "pharmacy_text_analyzer",
              fields: {
                autocomplete: {
                  type: "text",
                  analyzer: "autocomplete_index_analyzer",
                  search_analyzer: "autocomplete_search_analyzer",
                },
                raw: { type: "keyword" },
              },
            },
            de: {
              type: "text",
              analyzer: "pharmacy_text_analyzer",
              fields: {
                autocomplete: {
                  type: "text",
                  analyzer: "autocomplete_index_analyzer",
                  search_analyzer: "autocomplete_search_analyzer",
                },
                raw: { type: "keyword" },
              },
            },
          },
        },
        category: {
          properties: {
            id: { type: "keyword" },
            name: {
              properties: {
                en: {
                  type: "text",
                  analyzer: "pharmacy_text_analyzer",
                  fields: {
                    raw: { type: "keyword" },
                    autocomplete: {
                      type: "text",
                      analyzer: "autocomplete_index_analyzer",
                      search_analyzer: "autocomplete_search_analyzer",
                    },
                  },
                },
                de: {
                  type: "text",
                  analyzer: "pharmacy_text_analyzer",
                  fields: {
                    raw: { type: "keyword" },
                    autocomplete: {
                      type: "text",
                      analyzer: "autocomplete_index_analyzer",
                      search_analyzer: "autocomplete_search_analyzer",
                    },
                  },
                },
              },
            },
            slug: { type: "keyword" },
          },
        },
        categories: {
          type: "nested",
          properties: {
            id: { type: "keyword" },
            name: {
              properties: {
                en: { type: "text", analyzer: "pharmacy_text_analyzer" },
                de: { type: "text", analyzer: "pharmacy_text_analyzer" },
              },
            },
            slug: { type: "keyword" },
          },
        },
        categoryIds: { type: "keyword" },
        brand: {
          properties: {
            id: { type: "keyword" },
            name: {
              properties: {
                en: {
                  type: "text",
                  analyzer: "pharmacy_text_analyzer",
                  fields: {
                    raw: { type: "keyword" },
                    autocomplete: {
                      type: "text",
                      analyzer: "autocomplete_index_analyzer",
                      search_analyzer: "autocomplete_search_analyzer",
                    },
                  },
                },
                de: {
                  type: "text",
                  analyzer: "pharmacy_text_analyzer",
                  fields: {
                    raw: { type: "keyword" },
                    autocomplete: {
                      type: "text",
                      analyzer: "autocomplete_index_analyzer",
                      search_analyzer: "autocomplete_search_analyzer",
                    },
                  },
                },
              },
            },
            slug: { type: "keyword" },
            logo: { type: "keyword", index: false },
          },
        },
        brandId: { type: "keyword" },
        composition: { type: "text", analyzer: "pharmacy_text_analyzer" },
        ingredients: { type: "text", analyzer: "pharmacy_text_analyzer" },
        keyUses: { type: "text", analyzer: "pharmacy_text_analyzer" },
        productHighlights: { type: "text", analyzer: "pharmacy_text_analyzer" },
        description: {
          properties: {
            en: { type: "text", analyzer: "pharmacy_text_analyzer" },
            de: { type: "text", analyzer: "pharmacy_text_analyzer" },
          },
        },
        tag: {
          type: "text",
          analyzer: "pharmacy_text_analyzer",
          fields: { raw: { type: "keyword" } },
        },
        image: { type: "keyword", index: false },
        prices: {
          properties: {
            originalPrice: { type: "double" },
            price: { type: "double" },
            discount: { type: "double" },
          },
        },
        stock: { type: "integer" },
        sales: { type: "integer" },
        averageRating: { type: "float" },
        totalRatings: { type: "integer" },
        totalReviews: { type: "integer" },
        isWholesaler: { type: "boolean" },
        wholePrice: { type: "double" },
        minQuantity: { type: "integer" },
        status: { type: "keyword" },
        isCombination: { type: "boolean" },
        createdAt: { type: "date" },
        updatedAt: { type: "date" },
      },
    },
  };
};

/**
 * Clean & normalize search text safely
 */
const normalizeQueryText = (query) => {
  if (!query || typeof query !== "string") return "";
  // Trim, collapse multiple spaces, strip problematic control chars while preserving alphanumerics & standard punctuation
  return query
    .trim()
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .slice(0, 200); // Guard against excessively long queries
};

/**
 * Format Product for Elasticsearch Indexing
 */
const formatProductForES = (product) => {
  if (!product) return null;

  const extractText = (section) => {
    if (!section) return "";
    if (typeof section === "string") return section;
    if (section.description) return section.description;
    if (Array.isArray(section.items)) {
      return section.items
        .map((item) => (typeof item === "string" ? item : `${item.key || ""} ${item.value || ""}`))
        .join(" ");
    }
    return "";
  };

  const categoryDoc = product.category && typeof product.category === "object"
    ? {
        id: String(product.category._id || product.category.id || ""),
        name: {
          en: product.category.name?.en || product.category.name || "",
          de: product.category.name?.de || "",
        },
        slug: product.category.slug || "",
      }
    : null;

  const categoriesDoc = Array.isArray(product.categories)
    ? product.categories
        .filter(Boolean)
        .map((c) => ({
          id: String(c._id || c.id || c),
          name: typeof c === "object" ? { en: c.name?.en || c.name || "", de: c.name?.de || "" } : { en: "", de: "" },
          slug: typeof c === "object" ? c.slug || "" : "",
        }))
    : [];

  const categoryIds = [
    ...(categoryDoc?.id ? [categoryDoc.id] : []),
    ...categoriesDoc.map((c) => c.id),
  ].filter(Boolean);

  const brandDoc = product.brand && typeof product.brand === "object"
    ? {
        id: String(product.brand._id || product.brand.id || ""),
        name: {
          en: product.brand.name?.en || product.brand.name || "",
          de: product.brand.name?.de || "",
        },
        slug: product.brand.slug || "",
        logo: product.brand.logo || "",
      }
    : null;

  const originalPrice = Math.max(0, Number(product.prices?.originalPrice) || 0);
  const price = Math.max(0, Number(product.prices?.price) || 0);
  const discount = Math.max(0, Number(product.prices?.discount) || 0);

  return {
    id: String(product._id || product.id),
    slug: product.slug || "",
    sku: product.sku || "",
    barcode: product.barcode || "",
    batchNo: product.batchNo || "",
    title: {
      en: product.title?.en || (typeof product.title === "string" ? product.title : ""),
      de: product.title?.de || "",
    },
    category: categoryDoc,
    categories: categoriesDoc,
    categoryIds,
    brand: brandDoc,
    brandId: brandDoc?.id || (typeof product.brand === "string" ? product.brand : ""),
    composition: extractText(product.composition),
    ingredients: extractText(product.ingredients),
    keyUses: extractText(product.keyUses),
    productHighlights: extractText(product.productHighlights) || extractText(product.highlights),
    description: {
      en: product.description?.en || (typeof product.description === "string" ? product.description : "") || extractText(product.productDescription),
      de: product.description?.de || "",
    },
    tag: Array.isArray(product.tag) ? product.tag : [],
    image: Array.isArray(product.image) ? product.image : (product.image ? [product.image] : []),
    prices: {
      originalPrice,
      price,
      discount,
    },
    stock: Number(product.stock) || 0,
    sales: Number(product.sales) || 0,
    averageRating: Number(product.averageRating) || 0,
    totalRatings: Number(product.totalRatings) || 0,
    totalReviews: Number(product.totalReviews) || 0,
    isWholesaler: Boolean(product.isWholesaler),
    wholePrice: Number(product.wholePrice) || 0,
    minQuantity: Number(product.minQuantity) || 0,
    status: product.status || "show",
    isCombination: Boolean(product.isCombination),
    createdAt: product.createdAt ? new Date(product.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: product.updatedAt ? new Date(product.updatedAt).toISOString() : new Date().toISOString(),
  };
};

/**
 * Build Enterprise Elasticsearch Bool Query with Relevance Boosting
 */
const buildSearchQuery = ({
  query = "",
  category = "",
  brand = "",
  minPrice,
  maxPrice,
  rating,
  discount,
  inStock = false,
  status = "show",
  sort = "relevance",
  page = 1,
  limit = 20,
}) => {
  const normalizedQuery = normalizeQueryText(query);
  const boolQuery = {
    must: [],
    should: [],
    filter: [],
  };

  // Status Filter
  if (status) {
    boolQuery.filter.push({ term: { status } });
  }

  // Text Matching & Relevance Scoring
  if (normalizedQuery) {
    const isShortQuery = normalizedQuery.length < 4;

    // 1. Exact Match on Raw Title / SKU / Barcode (Top Boost: 20)
    boolQuery.should.push(
      { term: { "title.en.raw": { value: normalizedQuery, boost: 20 } } },
      { term: { "title.de.raw": { value: normalizedQuery, boost: 20 } } },
      { term: { "sku": { value: normalizedQuery, boost: 15 } } },
      { term: { "barcode": { value: normalizedQuery, boost: 15 } } }
    );

    // 2. Phrase Match on Title (Boost: 12)
    boolQuery.should.push({
      multi_match: {
        query: normalizedQuery,
        type: "phrase",
        fields: ["title.en^12", "title.de^12"],
      },
    });

    // 3. Prefix & Autocomplete Match on Title (Boost: 8)
    boolQuery.should.push({
      multi_match: {
        query: normalizedQuery,
        type: "bool_prefix",
        fields: [
          "title.en.autocomplete^8",
          "title.de.autocomplete^8",
          "title.en^7",
          "title.de^7",
        ],
      },
    });

    // 4. Brand Match (Boost: 6)
    boolQuery.should.push({
      multi_match: {
        query: normalizedQuery,
        fields: [
          "brand.name.en.raw^6",
          "brand.name.de.raw^6",
          "brand.name.en^5",
          "brand.name.de^5",
          "brand.name.en.autocomplete^4",
        ],
      },
    });

    // 5. Category Match (Boost: 4)
    boolQuery.should.push({
      multi_match: {
        query: normalizedQuery,
        fields: [
          "category.name.en.raw^4",
          "category.name.de.raw^4",
          "category.name.en^3",
          "category.name.de^3",
          "categories.name.en^3",
        ],
      },
    });

    // 6. Generic Drug Composition & Active Ingredients (Boost: 3)
    boolQuery.should.push({
      multi_match: {
        query: normalizedQuery,
        fields: ["composition^3", "ingredients^3", "keyUses^2"],
      },
    });

    // 7. Product Highlights, Tags & Descriptions (Boost: 1)
    boolQuery.should.push({
      multi_match: {
        query: normalizedQuery,
        fields: [
          "tag^1.5",
          "productHighlights^1",
          "description.en^0.8",
          "description.de^0.8",
        ],
      },
    });

    // 8. Controlled Typo Tolerance (Fuzziness) - Only applied for terms >= 4 chars to prevent drug name mixups
    if (!isShortQuery) {
      boolQuery.should.push({
        multi_match: {
          query: normalizedQuery,
          fields: ["title.en", "title.de", "brand.name.en"],
          fuzziness: "AUTO",
          prefix_length: 2,
          max_expansions: 10,
          boost: 0.5,
        },
      });
    }

    boolQuery.minimum_should_match = 1;
  } else {
    // If no search text, match all documents within filters
    boolQuery.must.push({ match_all: {} });
  }

  // Category Filter
  if (category) {
    if (Array.isArray(category)) {
      boolQuery.filter.push({ terms: { categoryIds: category } });
    } else {
      boolQuery.filter.push({ term: { categoryIds: category } });
    }
  }

  // Brand Filter
  if (brand) {
    if (Array.isArray(brand)) {
      boolQuery.filter.push({ terms: { brandId: brand } });
    } else {
      boolQuery.filter.push({ term: { brandId: brand } });
    }
  }

  // Price Filter
  if (minPrice !== undefined || maxPrice !== undefined) {
    const priceRange = {};
    if (minPrice !== undefined && minPrice !== "") priceRange.gte = Number(minPrice);
    if (maxPrice !== undefined && maxPrice !== "") priceRange.lte = Number(maxPrice);
    if (Object.keys(priceRange).length > 0) {
      boolQuery.filter.push({ range: { "prices.price": priceRange } });
    }
  }

  // Rating Filter
  if (rating && Number(rating) > 0) {
    boolQuery.filter.push({
      range: { averageRating: { gte: Number(rating) } },
    });
  }

  // Discount Filter
  if (discount && Number(discount) > 0) {
    boolQuery.filter.push({
      range: { "prices.discount": { gte: Number(discount) } },
    });
  }

  // Stock Filter
  if (inStock) {
    boolQuery.filter.push({ range: { stock: { gt: 0 } } });
  }

  // Sorting
  const sortRules = [];
  const normalizedSort = (sort || "").toLowerCase();

  if (normalizedSort === "low" || normalizedSort === "price-low") {
    sortRules.push({ "prices.price": "asc" }, { _score: "desc" });
  } else if (normalizedSort === "high" || normalizedSort === "price-high") {
    sortRules.push({ "prices.price": "desc" }, { _score: "desc" });
  } else if (normalizedSort === "newest" || normalizedSort === "date-added-desc") {
    sortRules.push({ createdAt: "desc" }, { _score: "desc" });
  } else if (normalizedSort === "best-selling") {
    sortRules.push({ sales: "desc" }, { _score: "desc" });
  } else if (normalizedSort === "most-discounted") {
    sortRules.push({ "prices.discount": "desc" }, { _score: "desc" });
  } else {
    // Default relevance sorting
    if (normalizedQuery) {
      sortRules.push({ _score: "desc" }, { sales: "desc" }, { createdAt: "desc" });
    } else {
      sortRules.push({ createdAt: "desc" });
    }
  }

  // Pagination calculation
  const validatedPage = Math.max(1, Number(page) || 1);
  const validatedLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const from = (validatedPage - 1) * validatedLimit;

  return {
    query: { bool: boolQuery },
    sort: sortRules,
    from,
    size: validatedLimit,
  };
};

/**
 * Transform Elasticsearch hits back into standard Product schema objects
 */
const formatESResults = (esResponse, page = 1, limit = 20) => {
  const hits = esResponse?.hits?.hits || [];
  const total = typeof esResponse?.hits?.total === "object"
    ? esResponse.hits.total.value
    : Number(esResponse?.hits?.total) || 0;

  const products = hits.map((hit) => {
    const src = hit._source || {};
    return {
      _id: src.id || hit._id,
      id: src.id || hit._id,
      slug: src.slug,
      sku: src.sku,
      barcode: src.barcode,
      title: src.title,
      category: src.category ? { _id: src.category.id, name: src.category.name, slug: src.category.slug } : null,
      categories: (src.categories || []).map((c) => ({ _id: c.id, name: c.name, slug: c.slug })),
      brand: src.brand ? { _id: src.brand.id, name: src.brand.name, slug: src.brand.slug, logo: src.brand.logo } : null,
      description: src.description,
      composition: src.composition,
      ingredients: src.ingredients,
      keyUses: src.keyUses,
      productHighlights: src.productHighlights,
      tag: src.tag || [],
      image: src.image || [],
      prices: src.prices || { originalPrice: 0, price: 0, discount: 0 },
      stock: src.stock || 0,
      sales: src.sales || 0,
      averageRating: src.averageRating || 0,
      totalRatings: src.totalRatings || 0,
      totalReviews: src.totalReviews || 0,
      status: src.status || "show",
      isCombination: src.isCombination || false,
      isWholesaler: src.isWholesaler || false,
      wholePrice: src.wholePrice || 0,
      minQuantity: src.minQuantity || 0,
      createdAt: src.createdAt,
      updatedAt: src.updatedAt,
      _score: hit._score,
    };
  });

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    products,
    totalDoc: total,
    total,
    pages: totalPages,
    totalPages,
    currentPage: page,
    limits: limit,
    limit,
  };
};

/**
 * MongoDB Fallback Implementation for Search
 */
const fallbackMongoSearch = async ({
  query = "",
  category = "",
  brand = "",
  minPrice,
  maxPrice,
  rating,
  discount,
  inStock = false,
  status = "show",
  sort = "relevance",
  page = 1,
  limit = 20,
}) => {
  const queryObject = {};
  if (status) queryObject.status = status;

  if (category) {
    if (mongoose.Types.ObjectId.isValid(category)) {
      queryObject.$or = [
        { category: category },
        { categories: { $in: [category] } },
      ];
    } else {
      queryObject.categories = category;
    }
  }

  if (brand) {
    queryObject.brand = brand;
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    queryObject["prices.price"] = {};
    if (minPrice !== undefined && minPrice !== "") queryObject["prices.price"].$gte = Number(minPrice);
    if (maxPrice !== undefined && maxPrice !== "") queryObject["prices.price"].$lte = Number(maxPrice);
  }

  if (rating && Number(rating) > 0) {
    queryObject.averageRating = { $gte: Number(rating) };
  }

  if (discount && Number(discount) > 0) {
    queryObject["prices.discount"] = { $gte: Number(discount) };
  }

  if (inStock) {
    queryObject.stock = { $gt: 0 };
  }

  const normalizedQuery = normalizeQueryText(query);
  if (normalizedQuery) {
    const titleQueries = languageCodes.map((lang) => ({
      [`title.${lang}`]: { $regex: normalizedQuery, $options: "i" },
    }));

    // Find brands and categories matching query
    const brandQueries = languageCodes.map((lang) => ({
      [`name.${lang}`]: { $regex: normalizedQuery, $options: "i" },
    }));
    const categoryQueries = languageCodes.map((lang) => ({
      [`name.${lang}`]: { $regex: normalizedQuery, $options: "i" },
    }));

    const [matchingBrands, matchingCategories] = await Promise.all([
      Brand.find({ $or: brandQueries, status: "show" }).select("_id").lean(),
      Category.find({ $or: categoryQueries, status: "show" }).select("_id").lean(),
    ]);

    const orConditions = [...titleQueries];
    if (matchingBrands.length > 0) {
      orConditions.push({ brand: { $in: matchingBrands.map((b) => b._id) } });
    }
    if (matchingCategories.length > 0) {
      const catIds = matchingCategories.map((c) => c._id);
      orConditions.push({ category: { $in: catIds } });
      orConditions.push({ categories: { $in: catIds } });
    }

    if (queryObject.$or) {
      queryObject.$and = [{ $or: queryObject.$or }, { $or: orConditions }];
      delete queryObject.$or;
    } else {
      queryObject.$or = orConditions;
    }
  }

  // Sort
  let sortObject = {};
  const normalizedSort = (sort || "").toLowerCase();
  if (normalizedSort === "low" || normalizedSort === "price-low") {
    sortObject = { "prices.price": 1 };
  } else if (normalizedSort === "high" || normalizedSort === "price-high") {
    sortObject = { "prices.price": -1 };
  } else if (normalizedSort === "newest" || normalizedSort === "date-added-desc") {
    sortObject = { createdAt: -1 };
  } else if (normalizedSort === "best-selling") {
    sortObject = { sales: -1 };
  } else if (normalizedSort === "most-discounted") {
    sortObject = { "prices.discount": -1 };
  } else {
    sortObject = { createdAt: -1 };
  }

  const validatedPage = Math.max(1, Number(page) || 1);
  const validatedLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (validatedPage - 1) * validatedLimit;

  const [totalDoc, products] = await Promise.all([
    Product.countDocuments(queryObject),
    Product.find(queryObject)
      .populate({ path: "category", select: "_id name slug" })
      .populate({ path: "categories", select: "_id name slug" })
      .populate({ path: "brand", select: "_id name slug logo" })
      .sort(sortObject)
      .skip(skip)
      .limit(validatedLimit)
      .lean(),
  ]);

  const totalPages = Math.ceil(totalDoc / validatedLimit) || 1;

  return {
    products,
    totalDoc,
    total: totalDoc,
    pages: totalPages,
    totalPages,
    currentPage: validatedPage,
    limits: validatedLimit,
    limit: validatedLimit,
  };
};

/**
 * MongoDB Fallback Implementation for Autocomplete
 */
const fallbackMongoAutocomplete = async (query) => {
  const normalized = normalizeQueryText(query);
  if (!normalized || normalized.length < 2) {
    return { query: normalized, suggestions: [] };
  }

  const titleQueries = languageCodes.map((lang) => ({
    [`title.${lang}`]: { $regex: normalized, $options: "i" },
  }));
  const nameQueries = languageCodes.map((lang) => ({
    [`name.${lang}`]: { $regex: normalized, $options: "i" },
  }));

  const [matchedProducts, matchedBrands, matchedCategories] = await Promise.all([
    Product.find({ $or: titleQueries, status: "show" })
      .select("_id title slug image prices category brand")
      .populate({ path: "category", select: "_id name slug" })
      .populate({ path: "brand", select: "_id name slug logo" })
      .limit(6)
      .lean(),
    Brand.find({ $or: nameQueries, status: "show" })
      .select("_id name slug logo")
      .limit(2)
      .lean(),
    Category.find({ $or: nameQueries, status: "show" })
      .select("_id name slug icon")
      .limit(2)
      .lean(),
  ]);

  const suggestions = [];

  // Products
  matchedProducts.forEach((p) => {
    suggestions.push({
      type: "product",
      id: String(p._id),
      title: p.title?.en || p.title || "",
      slug: p.slug,
      image: Array.isArray(p.image) ? p.image[0] : p.image || null,
      price: p.prices?.price || 0,
      originalPrice: p.prices?.originalPrice || 0,
      category: p.category?._id ? String(p.category._id) : null,
      brand: p.brand?._id ? String(p.brand._id) : null,
    });
  });

  // Brands
  matchedBrands.forEach((b) => {
    suggestions.push({
      type: "brand",
      id: String(b._id),
      title: b.name?.en || b.name || "",
      slug: b.slug,
      image: b.logo || null,
    });
  });

  // Categories
  matchedCategories.forEach((c) => {
    suggestions.push({
      type: "category",
      id: String(c._id),
      title: c.name?.en || c.name || "",
      slug: c.slug,
      image: c.icon || null,
    });
  });

  return {
    query: normalized,
    suggestions,
  };
};

/**
 * Main Search Service API
 */
const searchService = {
  clearCache: clearSearchCache,

  /**
   * Search Products with Elasticsearch & Resilient Fallback
   */
  async searchProducts(params = {}) {
    const cacheKey = getCacheKey("search", params);
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    const isHealthy = await esClient.isHealthy();
    if (!isHealthy) {
      const fallbackResult = await fallbackMongoSearch(params);
      setInCache(cacheKey, fallbackResult, 30000); // 30s cache for fallback
      return fallbackResult;
    }

    try {
      const esQueryBody = buildSearchQuery(params);
      const esResponse = await esClient.search({
        index: esClient.config.alias,
        body: esQueryBody,
      });

      const formattedResult = formatESResults(
        esResponse,
        Math.max(1, Number(params.page) || 1),
        Math.min(100, Math.max(1, Number(params.limit) || 20))
      );

      setInCache(cacheKey, formattedResult, CACHE_TTL_MS);
      return formattedResult;
    } catch (err) {
      console.warn(
        "⚠️ [SearchService] Elasticsearch query failed, falling back to MongoDB:",
        err.message
      );
      const fallbackResult = await fallbackMongoSearch(params);
      return fallbackResult;
    }
  },

  /**
   * Fast Autocomplete with Elasticsearch & Resilient Fallback
   */
  async autocomplete(query = "") {
    const normalized = normalizeQueryText(query);
    if (!normalized || normalized.length < 2) {
      return { query: normalized, suggestions: [] };
    }

    const cacheKey = getCacheKey("ac", { q: normalized });
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    const isHealthy = await esClient.isHealthy();
    if (!isHealthy) {
      const fallback = await fallbackMongoAutocomplete(normalized);
      setInCache(cacheKey, fallback, 30000);
      return fallback;
    }

    try {
      // Elasticsearch prefix & autocomplete query
      const esQuery = {
        size: 8,
        query: {
          bool: {
            must: [
              { term: { status: "show" } },
              {
                multi_match: {
                  query: normalized,
                  type: "bool_prefix",
                  fields: [
                    "title.en.autocomplete^5",
                    "title.de.autocomplete^5",
                    "title.en^4",
                    "brand.name.en.autocomplete^3",
                    "brand.name.en^2",
                    "category.name.en.autocomplete^2",
                    "category.name.en^1.5",
                  ],
                },
              },
            ],
          },
        },
      };

      const response = await esClient.search({
        index: esClient.config.alias,
        body: esQuery,
      });

      const hits = response?.hits?.hits || [];
      const suggestions = hits.map((hit) => {
        const src = hit._source || {};
        return {
          type: "product",
          id: src.id || hit._id,
          title: src.title?.en || src.title?.de || "",
          slug: src.slug,
          image: Array.isArray(src.image) ? src.image[0] : src.image || null,
          price: src.prices?.price || 0,
          originalPrice: src.prices?.originalPrice || 0,
          category: src.category?.id || null,
          brand: src.brand?.id || null,
        };
      });

      const result = { query: normalized, suggestions };
      setInCache(cacheKey, result, CACHE_TTL_MS);
      return result;
    } catch (err) {
      console.warn(
        "⚠️ [SearchService] Elasticsearch autocomplete failed, falling back to MongoDB:",
        err.message
      );
      const fallback = await fallbackMongoAutocomplete(normalized);
      return fallback;
    }
  },

  /**
   * Ensure Base Index Exists with Correct Mappings
   */
  async ensureIndexExists() {
    if (!esClient.config.enabled) return false;
    const isHealthy = await esClient.ping();
    if (!isHealthy) return false;

    try {
      const indexName = esClient.config.index;
      const aliasName = esClient.config.alias;

      const indexExists = await esClient.indices.exists({ index: indexName });
      if (!indexExists) {
        console.log(`[SearchService] Creating index '${indexName}' with pharmacy schema...`);
        await esClient.indices.create({
          index: indexName,
          body: getIndexMapping(),
        });
        console.log(`[SearchService] Setting alias '${aliasName}' -> '${indexName}'...`);
        await esClient.indices.putAlias({
          index: indexName,
          name: aliasName,
        });
      }
      return true;
    } catch (err) {
      console.error("[SearchService] Index initialization error:", err.message);
      return false;
    }
  },

  getIndexMapping,
  formatProductForES,
  normalizeQueryText,
};

module.exports = searchService;
