---
name: method
description: Add a new public API method to the Refold SDK with types, JSDoc, and endpoint mapping. Use when adding new SDK functionality.
metadata:
  author: iamtraction
  version: "1.0.0"
  argument-hint: <method-name>
---

# Add SDK Method

Add a new public API method to the Refold class with TypeScript types, JSDoc documentation, and backend endpoint mapping.

## Usage

The user provides a method name (e.g., "getWorkflows", "createConfig") and describes the backend endpoint it maps to.

## Steps

1. **Ask for details** if not provided: method name, HTTP method, endpoint URL, request payload shape, response shape, whether it supports pagination
2. **Define TypeScript interfaces** — request payload and response types
3. **Add JSDoc-documented method** to the `Refold` class
4. **Build** to verify compilation

## Implementation Order

1. **Interfaces** — Define request/response types (before the class)
2. **Method** — Add to `Refold` class with JSDoc
3. **Build** — Run `npm run build` to generate `.js` and `.d.ts`

## Interface Template

```ts
// Add before the Refold class in refold.ts

/** The payload for creating a resource. */
export interface CreateResourcePayload {
    /** The resource name. */
    name: string;
    /** Optional description. */
    description?: string;
    /** Configuration object. */
    config?: Record<string, unknown>;
}

/** A resource object. */
export interface Resource {
    /** The resource ID. */
    _id: string;
    /** The resource name. */
    name: string;
    /** The resource description. */
    description?: string;
    /** When the resource was created. */
    createdAt: string;
    /** When the resource was last updated. */
    updatedAt: string;
}
```

## Method Templates

### GET Request (single item)

```ts
/**
 * Returns the resource details for the specified resource ID.
 * @param {String} id The resource ID.
 * @returns {Promise<Resource>} The resource details.
 */
public async getResource(id: string): Promise<Resource> {
    const res = await fetch(`${this.baseUrl}/api/v2/f-sdk/resource/${id}`, {
        headers: {
            authorization: `Bearer ${this.token}`,
        },
    });

    if (res.status >= 400 && res.status < 600) {
        const error = await res.json();
        throw error;
    }

    return await res.json();
}
```

### GET Request (list with optional overloads)

```ts
/**
 * Returns the list of all resources.
 * @returns {Promise<Resource[]>} The list of resources.
 */
public async getResources(): Promise<Resource[]>;
/**
 * Returns the resource details for the specified slug.
 * @param {String} slug The resource slug.
 * @returns {Promise<Resource>} The resource details.
 */
public async getResources(slug: string): Promise<Resource>;
public async getResources(slug?: string): Promise<Resource | Resource[]> {
    const res = await fetch(`${this.baseUrl}/api/v2/f-sdk/resource${slug ? `/${slug}` : ""}`, {
        headers: {
            authorization: `Bearer ${this.token}`,
        },
    });

    if (res.status >= 400 && res.status < 600) {
        const error = await res.json();
        throw error;
    }

    return await res.json();
}
```

### POST Request (with JSON body)

```ts
/**
 * Creates a new resource with the specified configuration.
 * @param {CreateResourcePayload} payload The resource configuration.
 * @returns {Promise<Resource>} The created resource.
 */
public async createResource(payload: CreateResourcePayload): Promise<Resource> {
    const res = await fetch(`${this.baseUrl}/api/v2/f-sdk/resource`, {
        method: "POST",
        headers: {
            authorization: `Bearer ${this.token}`,
            "content-type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (res.status >= 400 && res.status < 600) {
        const error = await res.json();
        throw error;
    }

    return await res.json();
}
```

### PUT Request (update)

```ts
/**
 * Updates an existing resource.
 * @param {String} id The resource ID.
 * @param {Partial<CreateResourcePayload>} payload The fields to update.
 * @returns {Promise<Resource>} The updated resource.
 */
public async updateResource(id: string, payload: Partial<CreateResourcePayload>): Promise<Resource> {
    const res = await fetch(`${this.baseUrl}/api/v2/f-sdk/resource/${id}`, {
        method: "PUT",
        headers: {
            authorization: `Bearer ${this.token}`,
            "content-type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (res.status >= 400 && res.status < 600) {
        const error = await res.json();
        throw error;
    }

    return await res.json();
}
```

### DELETE Request

```ts
/**
 * Deletes the specified resource.
 * @param {String} id The resource ID.
 * @returns {Promise<unknown>} The deletion result.
 */
public async deleteResource(id: string): Promise<unknown> {
    const res = await fetch(`${this.baseUrl}/api/v2/f-sdk/resource/${id}`, {
        method: "DELETE",
        headers: {
            authorization: `Bearer ${this.token}`,
        },
    });

    if (res.status >= 400 && res.status < 600) {
        const error = await res.json();
        throw error;
    }

    return await res.json();
}
```

### Paginated GET Request

```ts
/**
 * Returns a paginated list of resources.
 * @param {Object} [params] Pagination parameters.
 * @param {Number} [params.page] The page number.
 * @param {Number} [params.limit] The number of items per page.
 * @returns {Promise<PaginatedResponse<Resource>>} The paginated list.
 */
public async listResources(params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Resource>> {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));

    const res = await fetch(`${this.baseUrl}/api/v2/f-sdk/resources?${query}`, {
        headers: {
            authorization: `Bearer ${this.token}`,
        },
    });

    if (res.status >= 400 && res.status < 600) {
        const error = await res.json();
        throw error;
    }

    return await res.json();
}
```

## Existing Patterns Reference

### Error Handling Pattern (used by ALL methods)
```ts
if (res.status >= 400 && res.status < 600) {
    const error = await res.json();
    throw error;
}
```

### Auth Header (used by ALL methods)
```ts
headers: {
    authorization: `Bearer ${this.token}`,
}
```

### Custom Headers (some methods pass app slug)
```ts
headers: {
    authorization: `Bearer ${this.token}`,
    "content-type": "application/json",
    slug,  // Custom header for app context
}
```

### PaginatedResponse Generic
```ts
interface PaginatedResponse<T> {
    docs: T[];
    totalDocs: number;
    limit: number;
    totalPages: number;
    page: number;
}
```

## Verification

```bash
npm run build     # Compile to refold.js + refold.d.ts
npm run docs:llms # Generate TypeDoc (optional)
```

## Important

- **Zero dependencies** — only use native `fetch`, no external HTTP libraries
- **JSDoc on every method** — TypeDoc generates SDK documentation from these
- **JSDoc on every interface field** — include description for each property
- **Method overloads** — use TypeScript overloads for methods with optional parameters that change return type
- **Error handling** — always check `res.status >= 400 && res.status < 600` and throw the parsed error
- **`Bearer` auth** — all methods include `authorization: Bearer ${this.token}`
- **Single file** — everything goes in `refold.ts`, no separate files
- **Export interfaces** — all types are exported for consumer use
- **Backward compatibility** — never rename or remove existing methods, use `@deprecated` JSDoc tag
- **Build output** — `refold.js` (CommonJS) + `refold.d.ts` (type declarations)
