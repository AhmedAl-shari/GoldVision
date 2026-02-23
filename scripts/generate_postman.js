const fs = require('fs');
const path = require('path');

console.log('📋 Generating Postman collection from OpenAPI spec...');

try {
  // Read OpenAPI spec
  const openApiPath = path.join(__dirname, '..', 'openapi.json');
  const openApiSpec = JSON.parse(fs.readFileSync(openApiPath, 'utf8'));
  
  // Convert to Postman collection format
  const collection = {
    info: {
      name: openApiSpec.info.title,
      description: openApiSpec.info.description,
      version: openApiSpec.info.version,
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    variable: [
      {
        key: "baseUrl",
        value: "http://localhost:8000",
        type: "string"
      }
    ],
    item: []
  };

  // Convert paths to Postman requests
  Object.entries(openApiSpec.paths).forEach(([path, methods]) => {
    Object.entries(methods).forEach(([method, operation]) => {
      const request = {
        name: operation.summary || `${method.toUpperCase()} ${path}`,
        request: {
          method: method.toUpperCase(),
          header: [],
          url: {
            raw: "{{baseUrl}}" + path,
            host: ["{{baseUrl}}"],
            path: path.split('/').filter(p => p)
          }
        }
      };

      // Add authentication header for protected endpoints
      if (operation.security && operation.security.some(s => s.bearerAuth)) {
        request.request.header.push({
          key: "Authorization",
          value: "Bearer {{accessToken}}",
          type: "text"
        });
      }

      // Add request body for POST/PUT requests
      if (['post', 'put', 'patch'].includes(method.toLowerCase()) && operation.requestBody) {
        const contentType = operation.requestBody.content['application/json'];
        if (contentType && contentType.schema) {
          request.request.body = {
            mode: "raw",
            raw: JSON.stringify(generateExampleFromSchema(contentType.schema), null, 2),
            options: {
              raw: {
                language: "json"
              }
            }
          };
        }
      }

      collection.item.push(request);
    });
  });

  // Write collection to artifacts
  const artifactsDir = path.join(__dirname, '..', 'artifacts');
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  const collectionPath = path.join(artifactsDir, 'postman_collection.json');
  fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2));
  
  console.log(`✅ Postman collection generated: ${collectionPath}`);
  
} catch (error) {
  console.error('❌ Error generating Postman collection:', error.message);
  process.exit(1);
}

function generateExampleFromSchema(schema) {
  if (schema.type === 'object' && schema.properties) {
    const example = {};
    Object.entries(schema.properties).forEach(([key, prop]) => {
      example[key] = generateExampleValue(prop);
    });
    return example;
  }
  return generateExampleValue(schema);
}

function generateExampleValue(prop) {
  switch (prop.type) {
    case 'string':
      if (prop.format === 'email') return 'user@example.com';
      if (prop.format === 'date') return '2025-01-01';
      return 'string';
    case 'integer':
      return 1;
    case 'number':
      return 1.0;
    case 'boolean':
      return true;
    case 'array':
      return [generateExampleValue(prop.items || { type: 'string' })];
    case 'object':
      return generateExampleFromSchema(prop);
    default:
      return null;
  }
}
