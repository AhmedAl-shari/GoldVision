#!/usr/bin/env node

/**
 * Export Postman Collection from OpenAPI JSON
 * Generates a Postman collection from the OpenAPI specification
 */

const fs = require("fs");
const path = require("path");
const axios = require("axios");

const BASE_URL = process.env.API_BASE_URL || "http://localhost:8000";
const OPENAPI_URL = `${BASE_URL}/openapi.json`;
const OUTPUT_FILE = "artifacts/postman_collection.json";

/**
 * Convert OpenAPI spec to Postman collection format
 */
function convertToPostman(openApiSpec) {
  const collection = {
    info: {
      name: openApiSpec.info.title || "GoldVision API",
      description:
        openApiSpec.info.description ||
        "Gold price tracking and forecasting API",
      version: openApiSpec.info.version || "1.0.0",
      schema:
        "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    variable: [
      {
        key: "baseUrl",
        value: BASE_URL,
        type: "string",
      },
      {
        key: "accessToken",
        value: "",
        type: "string",
      },
    ],
    auth: {
      type: "bearer",
      bearer: [
        {
          key: "token",
          value: "{{accessToken}}",
          type: "string",
        },
      ],
    },
    item: [],
  };

  // Group endpoints by tags
  const groupedEndpoints = {};

  Object.entries(openApiSpec.paths).forEach(([path, methods]) => {
    Object.entries(methods).forEach(([method, operation]) => {
      const tag = operation.tags?.[0] || "General";

      if (!groupedEndpoints[tag]) {
        groupedEndpoints[tag] = [];
      }

      const item = {
        name: operation.summary || `${method.toUpperCase()} ${path}`,
        request: {
          method: method.toUpperCase(),
          header: [],
          url: {
            raw: `{{baseUrl}}${path}`,
            host: ["{{baseUrl}}"],
            path: path.split("/").filter((p) => p),
          },
          description: operation.description || "",
        },
        response: [],
      };

      // Add authentication header if required
      if (operation.security && operation.security.length > 0) {
        item.request.header.push({
          key: "Authorization",
          value: "Bearer {{accessToken}}",
          type: "text",
        });
      }

      // Add content-type header for POST/PUT requests
      if (["post", "put", "patch"].includes(method)) {
        item.request.header.push({
          key: "Content-Type",
          value: "application/json",
          type: "text",
        });
      }

      // Add request body if defined
      if (operation.requestBody) {
        const content = operation.requestBody.content;
        if (content["application/json"]) {
          item.request.body = {
            mode: "raw",
            raw: JSON.stringify(
              generateExampleBody(content["application/json"].schema),
              null,
              2
            ),
            options: {
              raw: {
                language: "json",
              },
            },
          };
        }
      }

      // Add query parameters
      if (operation.parameters) {
        const queryParams = operation.parameters.filter(
          (param) => param.in === "query"
        );
        if (queryParams.length > 0) {
          item.request.url.query = queryParams.map((param) => ({
            key: param.name,
            value: param.example || "",
            description: param.description || "",
          }));
        }
      }

      // Add example responses
      if (operation.responses) {
        Object.entries(operation.responses).forEach(
          ([statusCode, response]) => {
            if (response.content && response.content["application/json"]) {
              item.response.push({
                name: `${statusCode} ${response.description || "Response"}`,
                originalRequest: {
                  method: method.toUpperCase(),
                  header: [],
                  url: {
                    raw: `{{baseUrl}}${path}`,
                    host: ["{{baseUrl}}"],
                    path: path.split("/").filter((p) => p),
                  },
                },
                status: "OK",
                code: parseInt(statusCode),
                _postman_previewlanguage: "json",
                header: [
                  {
                    key: "Content-Type",
                    value: "application/json",
                  },
                ],
                body: JSON.stringify(
                  generateExampleResponse(
                    response.content["application/json"].schema
                  ),
                  null,
                  2
                ),
              });
            }
          }
        );
      }

      groupedEndpoints[tag].push(item);
    });
  });

  // Convert grouped endpoints to Postman folders
  Object.entries(groupedEndpoints).forEach(([tag, items]) => {
    collection.item.push({
      name: tag,
      item: items,
    });
  });

  return collection;
}

/**
 * Generate example request body from schema
 */
function generateExampleBody(schema) {
  if (!schema) return {};

  if (schema.example) {
    return schema.example;
  }

  if (schema.properties) {
    const example = {};
    Object.entries(schema.properties).forEach(([key, prop]) => {
      example[key] = generateExampleValue(prop);
    });
    return example;
  }

  return {};
}

/**
 * Generate example response from schema
 */
function generateExampleResponse(schema) {
  if (!schema) return {};

  if (schema.example) {
    return schema.example;
  }

  if (schema.properties) {
    const example = {};
    Object.entries(schema.properties).forEach(([key, prop]) => {
      example[key] = generateExampleValue(prop);
    });
    return example;
  }

  return {};
}

/**
 * Generate example value from property schema
 */
function generateExampleValue(prop) {
  if (prop.example !== undefined) {
    return prop.example;
  }

  switch (prop.type) {
    case "string":
      if (prop.enum) {
        return prop.enum[0];
      }
      if (prop.format === "date") {
        return "2025-01-01";
      }
      if (prop.format === "date-time") {
        return "2025-01-01T00:00:00Z";
      }
      if (prop.format === "email") {
        return "user@example.com";
      }
      return "string";

    case "number":
    case "integer":
      return prop.minimum || 0;

    case "boolean":
      return true;

    case "array":
      if (prop.items) {
        return [generateExampleValue(prop.items)];
      }
      return [];

    case "object":
      if (prop.properties) {
        const example = {};
        Object.entries(prop.properties).forEach(([key, subProp]) => {
          example[key] = generateExampleValue(subProp);
        });
        return example;
      }
      return {};

    default:
      return null;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log("📤 Exporting Postman Collection...");
    console.log(`🔗 Fetching OpenAPI spec from: ${OPENAPI_URL}`);

    // Create artifacts directory if it doesn't exist
    const artifactsDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(artifactsDir)) {
      fs.mkdirSync(artifactsDir, { recursive: true });
    }

    // Fetch OpenAPI spec
    const response = await axios.get(OPENAPI_URL, { timeout: 10000 });
    const openApiSpec = response.data;

    console.log("✅ OpenAPI spec fetched successfully");

    // Convert to Postman collection
    const postmanCollection = convertToPostman(openApiSpec);

    // Write to file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(postmanCollection, null, 2));

    console.log(`✅ Postman collection exported to: ${OUTPUT_FILE}`);
    console.log(
      `📊 Collection contains ${postmanCollection.item.length} folders`
    );

    // Count total requests
    const totalRequests = postmanCollection.item.reduce((count, folder) => {
      return count + (folder.item ? folder.item.length : 0);
    }, 0);

    console.log(`📋 Total requests: ${totalRequests}`);

    // Show collection summary
    console.log("\n📁 Collection Structure:");
    postmanCollection.item.forEach((folder) => {
      console.log(
        `  📂 ${folder.name} (${folder.item ? folder.item.length : 0} requests)`
      );
    });
  } catch (error) {
    console.error("❌ Error exporting Postman collection:", error.message);

    if (error.code === "ECONNREFUSED") {
      console.error("💡 Make sure the API server is running on", BASE_URL);
    }

    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  convertToPostman,
  generateExampleBody,
  generateExampleResponse,
};
