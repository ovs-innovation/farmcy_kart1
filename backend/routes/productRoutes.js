const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { isAuthOptional, isAuth, isAdmin } = require("../config/auth");
const {
    exportProductsCSV,
    importProductsCSV,
  searchProducts,
  autocompleteProducts,
  addProductView,
  getRecommendations,
  addProduct,
  addAllProducts,
  getAllProducts,
  getShowingProducts,
  getProductById,
  getProductBySlug,
  updateProduct,
  updateManyProducts,
  updateStatus,
  deleteProduct,
  deleteManyProducts,
  getShowingStoreProducts,
 
} = require("../controller/productController");

// Rate limiters to prevent abuse
const viewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // Limit each IP to 100 views per hour
  message: "Too many views from this IP, please try again after an hour"
});

const recommendationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // Limit each IP to 20 recommendation requests per minute
  standardHeaders: true,
  legacyHeaders: false,
});

const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // Limit each IP to 120 search queries per minute
  standardHeaders: true,
  legacyHeaders: false,
});

// ================= EXPORT ROUTE FIRST =================
router.get("/export/csv", exportProductsCSV);

// ================= IMPORT ROUTE =================
router.post("/import/csv", isAuth, isAdmin, importProductsCSV);

// ================= ENTERPRISE SEARCH & AUTOCOMPLETE ROUTES =================
router.get("/search", searchLimiter, searchProducts);
router.get("/autocomplete", searchLimiter, autocompleteProducts);

//add a product
router.post("/add", isAuth, isAdmin, addProduct);

//track product view
router.post("/view", viewLimiter, isAuthOptional, addProductView);

//get recommendations (using POST to allow body with guest IDs if needed)
router.post("/recommendations", recommendationLimiter, isAuthOptional, getRecommendations);

//get suggested products (GET endpoint as requested)
router.get("/suggested", recommendationLimiter, isAuthOptional, getRecommendations);

//add multiple products
router.post("/all", isAuth, isAdmin, addAllProducts);

//get a product
router.post("/:id", getProductById);

//get showing products only
router.get("/show", getShowingProducts);

//get showing products in store
router.get("/store", getShowingStoreProducts);

//get all products
router.get("/", getAllProducts);

//get a product by slug
router.get("/product/:slug", getProductBySlug);

//update a product
router.patch("/:id", isAuth, isAdmin, updateProduct);

//update many products
router.patch("/update/many", isAuth, isAdmin, updateManyProducts);

//update a product status
router.put("/status/:id", isAuth, isAdmin, updateStatus);

//delete a product
router.delete("/:id", isAuth, isAdmin, deleteProduct);

//delete many product
router.patch("/delete/many", isAuth, isAdmin, deleteManyProducts);


module.exports = router;
