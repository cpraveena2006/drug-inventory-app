import swaggerJsdoc from "swagger-jsdoc";

export const openApiSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Drug Inventory & Supply Chain API",
      version: "1.1.0",
      description: "Inventory, traceability, supplier incident, quote, and demand APIs.",
    },
    servers: [{ url: "/api" }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
      schemas: {
        ApiError: {
          type: "object",
          required: ["message", "code"],
          properties: {
            message: { type: "string" },
            code: { type: "string" },
            details: { type: "object", additionalProperties: true },
          },
        },
      },
    },
    paths: {
      "/health": {
        get: {
          summary: "Health and MongoDB connection state",
          responses: { 200: { description: "Service health" } },
        },
      },
      "/auth/register": {
        post: {
          summary: "Create a public pharmacist account",
          requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
          responses: { 201: { description: "Account created" }, 400: { description: "Validation error" } },
        },
      },
      "/auth/login": {
        post: {
          summary: "Sign in",
          responses: { 200: { description: "JWT and user profile" }, 401: { description: "Invalid credentials" } },
        },
      },
      "/drugs": {
        get: { summary: "List catalog drugs", security: [{ bearerAuth: [] }], responses: { 200: { description: "Drug list" } } },
        post: { summary: "Create a drug", security: [{ bearerAuth: [] }], responses: { 201: { description: "Drug created" } } },
      },
      "/drugs/{id}/insights": {
        get: { summary: "Purchase, sales, quality, demand, and supplier metrics", security: [{ bearerAuth: [] }], responses: { 200: { description: "Drug insights" } } },
      },
      "/batches": {
        get: { summary: "List batches; supplier accounts are scoped to their own supplier", security: [{ bearerAuth: [] }], responses: { 200: { description: "Batch list" } } },
        post: { summary: "Receive stock as a batch", security: [{ bearerAuth: [] }], responses: { 201: { description: "Batch created" } } },
      },
      "/batches/{id}/report-damage": {
        post: { summary: "Atomically report damaged stock and notify its supplier", security: [{ bearerAuth: [] }], responses: { 201: { description: "Damage recorded" } } },
      },
      "/batches/{id}/details": {
        get: { summary: "Batch quantity, supplier totals, dispatch history, incidents, and timeline", security: [{ bearerAuth: [] }], responses: { 200: { description: "Batch details" } } },
      },
      "/orders/dispatch": {
        post: { summary: "Dispatch stock using FEFO allocation", security: [{ bearerAuth: [] }], responses: { 201: { description: "Dispatch created" }, 409: { description: "Insufficient stock" } } },
      },
      "/incidents": {
        get: { summary: "List incidents with supplier scoping", security: [{ bearerAuth: [] }], responses: { 200: { description: "Paginated incidents" } } },
        post: { summary: "Create a manual incident", security: [{ bearerAuth: [] }], responses: { 201: { description: "Incident created" } } },
      },
      "/incidents/{id}/notify": {
        post: { summary: "Re-notify an incident's supplier", security: [{ bearerAuth: [] }], responses: { 200: { description: "Supplier notification queued" } } },
      },
      "/notifications": {
        get: { summary: "List notifications for the signed-in user or supplier", security: [{ bearerAuth: [] }], responses: { 200: { description: "Notifications" } } },
      },
      "/requests": {
        get: { summary: "List unavailable-drug requests", security: [{ bearerAuth: [] }], responses: { 200: { description: "Demand-sorted requests" } } },
        post: { summary: "Log or aggregate a customer request", security: [{ bearerAuth: [] }], responses: { 201: { description: "Request recorded" } } },
      },
      "/inquiries": {
        get: { summary: "List supplier inquiries", security: [{ bearerAuth: [] }], responses: { 200: { description: "Inquiries" } } },
        post: { summary: "Ask multiple suppliers for a quote", security: [{ bearerAuth: [] }], responses: { 201: { description: "Inquiry created" } } },
      },
      "/inquiries/{id}/respond": {
        post: { summary: "Submit a supplier quote response", security: [{ bearerAuth: [] }], responses: { 200: { description: "Response saved" } } },
      },
      "/inquiries/{id}/choose": {
        post: { summary: "Choose a supplier and return a purchase-order draft", security: [{ bearerAuth: [] }], responses: { 200: { description: "Purchase-order payload" } } },
      },
      "/suppliers/{id}/scorecard": {
        get: { summary: "Supplier scorecard and reliability score", security: [{ bearerAuth: [] }], responses: { 200: { description: "Scorecard" } } },
      },
      "/reports/reorder-suggestions": {
        get: { summary: "Suggest reorder quantities and supplier options", security: [{ bearerAuth: [] }], responses: { 200: { description: "Reorder suggestions" } } },
      },
      "/audit-logs": {
        get: { summary: "Admin-only audit log viewer", security: [{ bearerAuth: [] }], responses: { 200: { description: "Paginated audit logs" } } },
      },
    },
  },
  apis: [],
});
