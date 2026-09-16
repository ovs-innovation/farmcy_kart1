import { useRouter } from "next/router";
import { useMemo, useState, useEffect } from "react";
import useUtilsFunction from "@hooks/useUtilsFunction";

const useFilter = (data, allCategories = []) => {
  const router = useRouter();
  const [pending, setPending] = useState([]);
  const [processing, setProcessing] = useState([]);
  const [delivered, setDelivered] = useState([]);
  const [sortedField, setSortedField] = useState("");
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 100000 });
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedRating, setSelectedRating] = useState(0);
  const [selectedDiscount, setSelectedDiscount] = useState(0);
  const { showingTranslateValue } = useUtilsFunction();

  // Get search query from router
  const searchQuery = router.query?.query || router.query?.q || "";
  
  // Initialize sortedField from URL when router is ready
  useEffect(() => {
    if (router.isReady && router.query?.sort && !sortedField) {
      setSortedField(router.query.sort);
    } else if (router.isReady && !router.query?.sort && !sortedField) {
      setSortedField("All");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady]);

  // console.log("sortedfield", sortedField, data);

  const productData = useMemo(() => {
    let services = data || [];

    // Filter by Search Query (Brand Name, Category Name, or Product Title)
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      services = services.filter((product) => {
        // Search in product title
        const productTitle = showingTranslateValue(product?.title)?.toLowerCase() || "";
        if (productTitle.includes(query)) return true;

        // Search in brand name
        const brandName = showingTranslateValue(product?.brand?.name)?.toLowerCase() || "";
        if (brandName.includes(query)) return true;

        // Search in category name
        const categoryName = showingTranslateValue(product?.category?.name)?.toLowerCase() || "";
        if (categoryName.includes(query)) return true;

        // Search in categories array (multiple categories)
        if (product?.categories && Array.isArray(product.categories)) {
          const categoryMatch = product.categories.some((cat) => {
            const catName = showingTranslateValue(cat?.name)?.toLowerCase() || "";
            return catName.includes(query);
          });
          if (categoryMatch) return true;
        }

        return false;
      });
    }

    // Filter by Brand
    if (selectedBrands.length > 0) {
      services = services.filter((product) =>
        selectedBrands.includes(product.brand?._id || product.brand)
      );
    }

    // Filter by Category
    if (selectedCategories.length > 0) {
      // Get names of selected categories for fallback matching
      const selectedNames = new Set();
      
      const findNameInTree = (cats, id) => {
        for (const c of cats) {
          if (c._id === id) {
            const name = c.name?.en || c.name;
            if (typeof name === 'string') selectedNames.add(name.toLowerCase().trim());
          }
          if (c.children) findNameInTree(c.children, id);
        }
      };

      selectedCategories.forEach(id => findNameInTree(allCategories, id));

      services = services.filter((product) => {
        const productCategoryIds = [];
        const productCategoryNames = [];
        
        const processCategory = (cat) => {
          if (!cat) return;
          const id = (cat._id || cat).toString();
          productCategoryIds.push(id);
          
          const name = cat.name?.en || cat.name;
          if (typeof name === 'string') {
            productCategoryNames.push(name.toLowerCase().trim());
          }
        };

        processCategory(product.category);
        if (product.categories && Array.isArray(product.categories)) {
          product.categories.forEach(processCategory);
        }

        // Match by ID
        if (productCategoryIds.some(id => selectedCategories.includes(id))) return true;

        // Match by Name (Fallback for duplicates)
        if (productCategoryNames.some(name => selectedNames.has(name))) return true;
        
        return false;
      });
    }

    // Filter by Price
    services = services.filter(
      (product) =>
        product.prices?.price >= priceRange.min &&
        product.prices?.price <= priceRange.max
    );

    // Filter by Rating
    if (selectedRating > 0) {
      services = services.filter(
        (product) => (product.averageRating || 0) >= selectedRating
      );
    }

    // Filter by Discount
    if (selectedDiscount > 0) {
      services = services.filter(
        (product) => (product.prices?.discount || 0) >= selectedDiscount
      );
    }

    //filter user order
    if (router.pathname === "/user/dashboard") {
      const orderPending = services?.filter(
        (statusP) => statusP.status === "Pending"
      );
      setPending(orderPending);

      const orderProcessing = services?.filter(
        (statusO) => statusO.status === "Processing"
      );
      setProcessing(orderProcessing);

      const orderDelivered = services?.filter(
        (statusD) => statusD.status === "Delivered"
      );
      setDelivered(orderDelivered);
    }

    //service sorting with low and high price
    if (sortedField === "Low") {
      services = [...services].sort((a, b) => a.prices.price - b.prices.price);
    }
    if (sortedField === "High") {
      services = [...services].sort((a, b) => b.prices.price - a.prices.price);
    }
    if (sortedField === "newest") {
      services = [...services].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
    }
    if (sortedField === "best-selling") {
      services = [...services].sort((a, b) => (b.sales || 0) - (a.sales || 0));
    }
    if (sortedField === "most-discounted") {
      services = [...services].sort(
        (a, b) => (b.prices?.discount || 0) - (a.prices?.discount || 0)
      );
    }

    return services;

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    sortedField,
    data,
    selectedBrands,
    priceRange,
    selectedCategories,
    selectedRating,
    selectedDiscount,
    searchQuery,
  ]);

  return {
    productData,
    pending,
    processing,
    delivered,
    setSortedField,
    selectedBrands,
    setSelectedBrands,
    priceRange,
    setPriceRange,
    selectedCategories,
    setSelectedCategories,
    selectedRating,
    setSelectedRating,
    selectedDiscount,
    setSelectedDiscount,
  };
};

export default useFilter;
