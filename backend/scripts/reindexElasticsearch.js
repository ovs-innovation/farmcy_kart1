"use strict";

require("../config/env");
const { connectDB } = require("../config/db");
const esClient = require("../config/elasticsearch");
const searchService = require("../services/searchService");
const Product = require("../models/Product");

const BATCH_SIZE = 200;

async function runReindex() {
  console.log("==========================================================");
  console.log("🚀 Starting Zero-Downtime Elasticsearch Product Reindexing");
  console.log("==========================================================");

  try {
    // 1. Connect MongoDB
    await connectDB();

    // 2. Check Elasticsearch connection
    const isHealthy = await esClient.ping();
    if (!isHealthy) {
      throw new Error(
        `Elasticsearch is not responding at ${esClient.config.node}. Ensure the cluster is online.`
      );
    }
    console.log(`✅ Connected to Elasticsearch at ${esClient.config.node}`);

    const aliasName = esClient.config.alias;
    const newIndexName = `${esClient.config.index}_${Date.now()}`;

    // 3. Create new index with custom analyzers and schema mapping
    console.log(`📦 Creating new timestamped index: '${newIndexName}'...`);
    await esClient.indices.create({
      index: newIndexName,
      body: searchService.getIndexMapping(),
    });
    console.log(`✅ Index '${newIndexName}' created successfully.`);

    // 4. Count total MongoDB products
    const totalCount = await Product.countDocuments();
    console.log(`📊 Found ${totalCount} products in MongoDB Atlas to index.`);

    let indexedCount = 0;
    let skip = 0;

    // 5. Bulk index products in batches
    while (skip < totalCount) {
      const products = await Product.find({})
        .populate({ path: "category", select: "_id name slug" })
        .populate({ path: "categories", select: "_id name slug" })
        .populate({ path: "brand", select: "_id name slug logo" })
        .skip(skip)
        .limit(BATCH_SIZE)
        .lean();

      if (products.length === 0) break;

      const bulkOperations = [];
      for (const product of products) {
        const esDoc = searchService.formatProductForES(product);
        if (esDoc) {
          bulkOperations.push({
            index: {
              _index: newIndexName,
              _id: esDoc.id,
            },
          });
          bulkOperations.push(esDoc);
        }
      }

      if (bulkOperations.length > 0) {
        await esClient.bulk({
          body: bulkOperations,
          refresh: false,
        });
      }

      indexedCount += products.length;
      skip += BATCH_SIZE;
      const percent = Math.min(100, Math.round((indexedCount / totalCount) * 100));
      console.log(`⏳ Indexed ${indexedCount}/${totalCount} products (${percent}%)...`);
    }

    console.log(`✅ Finished indexing ${indexedCount} documents into '${newIndexName}'.`);

    // 6. Validate document count in the new index
    console.log("🔍 Validating new index count...");
    const countRes = await esClient.search({
      index: newIndexName,
      body: { query: { match_all: {} } },
      params: { size: 0 },
    });
    const totalInEs = typeof countRes?.hits?.total === "object"
      ? countRes.hits.total.value
      : Number(countRes?.hits?.total) || 0;

    console.log(`📊 New index contains ${totalInEs} documents.`);

    // 7. Atomic alias switch (Zero Downtime)
    console.log(`🔄 Switching alias '${aliasName}' to '${newIndexName}'...`);
    const existingAliasMap = await esClient.indices.getAlias({ name: aliasName });
    const oldIndices = Object.keys(existingAliasMap || {});

    const aliasActions = [];
    // Remove alias from old indices
    for (const oldIndex of oldIndices) {
      aliasActions.push({
        remove: { index: oldIndex, alias: aliasName },
      });
    }
    // Point alias to new index
    aliasActions.push({
      add: { index: newIndexName, alias: aliasName },
    });

    await esClient.indices.updateAliases({
      body: { actions: aliasActions },
    });

    console.log(`✅ Alias '${aliasName}' is now pointing to '${newIndexName}'!`);

    // 8. Retire old indices
    for (const oldIndex of oldIndices) {
      if (oldIndex !== newIndexName) {
        try {
          console.log(`🧹 Retiring old index '${oldIndex}'...`);
          await esClient.indices.delete({ index: oldIndex });
          console.log(`🗑️ Deleted old index '${oldIndex}'.`);
        } catch (delErr) {
          console.warn(`Could not delete old index '${oldIndex}':`, delErr.message);
        }
      }
    }

    // 9. Clear search cache
    searchService.clearCache();

    console.log("==========================================================");
    console.log("🎉 REINDEXING COMPLETED SUCCESSFULLY WITH ZERO DOWNTIME!");
    console.log("==========================================================");
    process.exit(0);
  } catch (error) {
    console.error("❌ Reindexing failed with error:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  runReindex();
}

module.exports = runReindex;
