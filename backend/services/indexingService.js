"use strict";

const esClient = require("../config/elasticsearch");
const searchService = require("./searchService");
const Product = require("../models/Product");

/**
 * Enterprise Product Indexing & Real-Time Sync Service
 */
const indexingService = {
  /**
   * Sync a single product (create or update) to Elasticsearch
   */
  async syncProduct(productIdOrDoc) {
    if (!esClient.config.enabled) return false;

    // Run asynchronously to avoid blocking user response
    setImmediate(async () => {
      try {
        let productDoc = productIdOrDoc;

        // If an ID or unpopulated doc was passed, fetch fully populated document
        if (
          typeof productIdOrDoc === "string" ||
          productIdOrDoc instanceof Object && (!productIdOrDoc.category || typeof productIdOrDoc.category !== "object")
        ) {
          const id = typeof productIdOrDoc === "string" ? productIdOrDoc : productIdOrDoc._id;
          productDoc = await Product.findById(id)
            .populate({ path: "category", select: "_id name slug" })
            .populate({ path: "categories", select: "_id name slug" })
            .populate({ path: "brand", select: "_id name slug logo" })
            .lean();
        }

        if (!productDoc) return false;

        const isHealthy = await esClient.isHealthy();
        if (!isHealthy) return false;

        const esDoc = searchService.formatProductForES(productDoc);
        if (!esDoc) return false;

        await esClient.index({
          index: esClient.config.index,
          id: esDoc.id,
          body: esDoc,
        });

        // Invalidate in-memory search caches
        searchService.clearCache();
        return true;
      } catch (err) {
        console.error(
          `[IndexingService] Failed to sync product '${productIdOrDoc}':`,
          err.message
        );
        return false;
      }
    });
  },

  /**
   * Delete a single product from Elasticsearch
   */
  async deleteProduct(productId) {
    if (!esClient.config.enabled || !productId) return false;

    setImmediate(async () => {
      try {
        const isHealthy = await esClient.isHealthy();
        if (!isHealthy) return false;

        await esClient.delete({
          index: esClient.config.index,
          id: String(productId),
        });

        searchService.clearCache();
        return true;
      } catch (err) {
        // Document not found is acceptable on delete
        if (!err.message?.includes("404") && !err.message?.includes("not_found")) {
          console.error(
            `[IndexingService] Failed to delete product '${productId}':`,
            err.message
          );
        }
        return false;
      }
    });
  },

  /**
   * Bulk sync products to Elasticsearch
   */
  async bulkSyncProducts(productDocs = []) {
    if (!esClient.config.enabled || !Array.isArray(productDocs) || productDocs.length === 0) {
      return false;
    }

    setImmediate(async () => {
      try {
        const isHealthy = await esClient.isHealthy();
        if (!isHealthy) return false;

        const bulkOperations = [];
        for (const doc of productDocs) {
          const esDoc = searchService.formatProductForES(doc);
          if (esDoc) {
            bulkOperations.push({
              index: {
                _index: esClient.config.index,
                _id: esDoc.id,
              },
            });
            bulkOperations.push(esDoc);
          }
        }

        if (bulkOperations.length === 0) return false;

        await esClient.bulk({ body: bulkOperations });
        searchService.clearCache();
        return true;
      } catch (err) {
        console.error("[IndexingService] Bulk sync failed:", err.message);
        return false;
      }
    });
  },

  /**
   * Bulk delete products from Elasticsearch
   */
  async bulkDeleteProducts(productIds = []) {
    if (!esClient.config.enabled || !Array.isArray(productIds) || productIds.length === 0) {
      return false;
    }

    setImmediate(async () => {
      try {
        const isHealthy = await esClient.isHealthy();
        if (!isHealthy) return false;

        const bulkOperations = productIds.map((id) => ({
          delete: {
            _index: esClient.config.index,
            _id: String(id),
          },
        }));

        await esClient.bulk({ body: bulkOperations });
        searchService.clearCache();
        return true;
      } catch (err) {
        console.error("[IndexingService] Bulk delete failed:", err.message);
        return false;
      }
    });
  },
};

module.exports = indexingService;
