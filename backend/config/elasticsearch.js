"use strict";

const axios = require("axios");

let elasticClient = null;
let isElasticsearchConnected = false;
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL_MS = 30000; // 30s cache for health status

const config = {
  enabled: process.env.ENABLE_ELASTICSEARCH !== "false",
  node: (
    process.env.ELASTICSEARCH_NODE ||
    process.env.ELASTICSEARCH_URL ||
    "http://localhost:9200"
  ).replace(/\/+$/, ""),
  index: process.env.ELASTICSEARCH_INDEX || "farmacykart_products",
  alias: process.env.ELASTICSEARCH_ALIAS || "farmacykart_products_active",
  username: process.env.ELASTICSEARCH_USERNAME || "",
  password: process.env.ELASTICSEARCH_PASSWORD || "",
  apiKey: process.env.ELASTICSEARCH_API_KEY || "",
  requestTimeout: Number(process.env.ELASTICSEARCH_TIMEOUT_MS) || 5000,
};

// Build authorization headers for HTTP transport
const getAuthHeaders = () => {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (config.apiKey) {
    headers["Authorization"] = `ApiKey ${config.apiKey}`;
  } else if (config.username && config.password) {
    const credentials = Buffer.from(
      `${config.username}:${config.password}`
    ).toString("base64");
    headers["Authorization"] = `Basic ${credentials}`;
  }
  return headers;
};

// Resilient HTTP Client based on axios
const httpClient = axios.create({
  baseURL: config.node,
  timeout: config.requestTimeout,
  headers: getAuthHeaders(),
  validateStatus: (status) => status >= 200 && status < 300,
});

// Try to initialize official @elastic/elasticsearch client if available
let officialClient = null;
try {
  const { Client } = require("@elastic/elasticsearch");
  const clientOptions = {
    node: config.node,
    requestTimeout: config.requestTimeout,
  };
  if (config.apiKey) {
    clientOptions.auth = { apiKey: config.apiKey };
  } else if (config.username && config.password) {
    clientOptions.auth = {
      username: config.username,
      password: config.password,
    };
  }
  officialClient = new Client(clientOptions);
} catch (err) {
  // Official client not installed yet; will transparently use resilient HTTP transport
  officialClient = null;
}

/**
 * Unified Elasticsearch Client Wrapper
 */
const client = {
  config,

  /**
   * Check if Elasticsearch is responsive
   */
  async ping() {
    if (!config.enabled) return false;
    try {
      if (officialClient) {
        await officialClient.ping();
      } else {
        await httpClient.get("/");
      }
      isElasticsearchConnected = true;
      return true;
    } catch (err) {
      isElasticsearchConnected = false;
      return false;
    }
  },

  /**
   * Health status with periodic check caching
   */
  async isHealthy() {
    if (!config.enabled) return false;
    const now = Date.now();
    if (now - lastHealthCheck < HEALTH_CHECK_INTERVAL_MS && isElasticsearchConnected) {
      return true;
    }
    lastHealthCheck = now;
    return await this.ping();
  },

  /**
   * Search
   */
  async search({ index, body, params = {} }) {
    const targetIndex = index || config.alias;
    if (officialClient) {
      const response = await officialClient.search({
        index: targetIndex,
        body,
        ...params,
      });
      // v8 vs v7 compatibility
      return response.body || response;
    }
    const res = await httpClient.post(`/${encodeURIComponent(targetIndex)}/_search`, body, {
      params,
    });
    return res.data;
  },

  /**
   * Index single document
   */
  async index({ index, id, body, refresh = false }) {
    const targetIndex = index || config.index;
    if (officialClient) {
      const response = await officialClient.index({
        index: targetIndex,
        id,
        body,
        refresh: refresh ? "wait_for" : false,
      });
      return response.body || response;
    }
    const url = id
      ? `/${encodeURIComponent(targetIndex)}/_doc/${encodeURIComponent(id)}${refresh ? "?refresh=wait_for" : ""}`
      : `/${encodeURIComponent(targetIndex)}/_doc${refresh ? "?refresh=wait_for" : ""}`;
    const res = await httpClient.post(url, body);
    return res.data;
  },

  /**
   * Delete single document
   */
  async delete({ index, id, refresh = false }) {
    const targetIndex = index || config.index;
    if (officialClient) {
      const response = await officialClient.delete({
        index: targetIndex,
        id,
        refresh: refresh ? "wait_for" : false,
      });
      return response.body || response;
    }
    const res = await httpClient.delete(
      `/${encodeURIComponent(targetIndex)}/_doc/${encodeURIComponent(id)}${refresh ? "?refresh=wait_for" : ""}`
    );
    return res.data;
  },

  /**
   * Bulk operations
   */
  async bulk({ body, refresh = false }) {
    if (officialClient) {
      const response = await officialClient.bulk({
        body,
        refresh: refresh ? "wait_for" : false,
      });
      return response.body || response;
    }
    // Format ndjson for axios
    let ndjsonBody = "";
    if (Array.isArray(body)) {
      ndjsonBody = body.map((item) => JSON.stringify(item)).join("\n") + "\n";
    } else {
      ndjsonBody = body;
    }
    const res = await httpClient.post(`/_bulk${refresh ? "?refresh=wait_for" : ""}`, ndjsonBody, {
      headers: {
        "Content-Type": "application/x-ndjson",
      },
    });
    return res.data;
  },

  /**
   * Indices operations
   */
  indices: {
    async exists({ index }) {
      try {
        if (officialClient) {
          const res = await officialClient.indices.exists({ index });
          return res.body !== undefined ? res.body : res;
        }
        await httpClient.head(`/${encodeURIComponent(index)}`);
        return true;
      } catch (err) {
        if (err.response && err.response.status === 404) return false;
        return false;
      }
    },

    async create({ index, body }) {
      if (officialClient) {
        const res = await officialClient.indices.create({ index, body });
        return res.body || res;
      }
      const res = await httpClient.put(`/${encodeURIComponent(index)}`, body);
      return res.data;
    },

    async delete({ index }) {
      if (officialClient) {
        const res = await officialClient.indices.delete({ index });
        return res.body || res;
      }
      const res = await httpClient.delete(`/${encodeURIComponent(index)}`);
      return res.data;
    },

    async putAlias({ index, name }) {
      if (officialClient) {
        const res = await officialClient.indices.putAlias({ index, name });
        return res.body || res;
      }
      const res = await httpClient.put(`/${encodeURIComponent(index)}/_alias/${encodeURIComponent(name)}`);
      return res.data;
    },

    async updateAliases({ body }) {
      if (officialClient) {
        const res = await officialClient.indices.updateAliases({ body });
        return res.body || res;
      }
      const res = await httpClient.post(`/_aliases`, body);
      return res.data;
    },

    async getAlias({ name }) {
      try {
        if (officialClient) {
          const res = await officialClient.indices.getAlias({ name });
          return res.body || res;
        }
        const res = await httpClient.get(`/_alias/${encodeURIComponent(name)}`);
        return res.data;
      } catch (err) {
        if (err.response && err.response.status === 404) return {};
        return {};
      }
    },
  },
};

module.exports = client;
