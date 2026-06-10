"use strict";
/**
 * Cobalt Frontend SDK
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cobalt = exports.AuthStatus = exports.AuthType = void 0;
var AuthType;
(function (AuthType) {
    AuthType["OAuth2"] = "oauth2";
    AuthType["KeyBased"] = "keybased";
})(AuthType || (exports.AuthType = AuthType = {}));
var AuthStatus;
(function (AuthStatus) {
    AuthStatus["Active"] = "active";
    AuthStatus["Expired"] = "expired";
})(AuthStatus || (exports.AuthStatus = AuthStatus = {}));
class Cobalt {
    /**
     * Cobalt Frontend SDK
     * @param {Object} options The options to configure the Cobalt SDK.
     * @param {String} [options.token] The session token.
     * @param {String} [options.baseUrl=https://api.gocobalt.io] The base URL of the Cobalt API.
     */
    constructor(options = {}) {
        this.baseUrl = options.baseUrl
            ? /^https?:\/\//.test(options.baseUrl)
                ? options.baseUrl
                : "https://" + options.baseUrl
            : "https://api.gocobalt.io";
        this.token = options.token || "";
    }
    /**
     * Returns the org & customer details for the associated token.
     * @private
     * @returns {Promise<unknown>}
     */
    async getAccountDetails() {
        const res = await fetch(`${this.baseUrl}/api/v3/org/basics`, {
            headers: {
                authorization: `Bearer ${this.token}`,
            },
        });
        if (res.status >= 400 && res.status < 600) {
            const error = await res.json();
            throw error;
        }
        const data = await res.json();
        return data;
    }
    /**
     * Returns the org & customer details for the associated token.
     * @private
     * @returns {Promise<unknown>}
     */
    async updateAccount(payload) {
        const res = await fetch(`${this.baseUrl}/api/v2/public/linked-account`, {
            method: "PUT",
            headers: {
                authorization: `Bearer ${this.token}`,
                "content-type": "application/json",
            },
            body: JSON.stringify({
                ...payload,
            }),
        });
        if (res.status >= 400 && res.status < 600) {
            const error = await res.json();
            throw error;
        }
        const data = await res.json();
        return data;
    }
    /**
     * Returns the application details for the specified application, provided
     * the application is enabled in Cobalt. If no application is specified,
     * it returns all the enabled applications.
     * @param {String} [slug] The application slug.
     * @returns {Promise<Application | Application[]>} The application details.
     */
    async getApp(slug) {
        const res = await fetch(`${this.baseUrl}/api/v2/f-sdk/application${slug ? `/${slug}` : ""}`, {
            headers: {
                authorization: `Bearer ${this.token}`,
            },
        });
        if (res.status >= 400 && res.status < 600) {
            const error = await res.json();
            throw error;
        }
        const data = await res.json();
        return data;
    }
    /**
     * Returns all the enabled apps.
     * @returns {Promise<Application[]>} The list of applications.
     */
    async getApps() {
        const res = await fetch(`${this.baseUrl}/api/v2/f-sdk/application`, {
            headers: {
                authorization: `Bearer ${this.token}`,
            },
        });
        if (res.status >= 400 && res.status < 600) {
            const error = await res.json();
            throw error;
        }
        const data = await res.json();
        return data;
    }
    /**
     * Returns the auth configs for the specified application.
     * @param {String} slug The application slug.
     * @returns {Promise<AuthConfig[]>} The auth configs.
     */
    async getAuthConfigs(slug) {
        const res = await fetch(`${this.baseUrl}/api/v2/public/slug/${slug}/auth-config`, {
            headers: {
                authorization: `Bearer ${this.token}`,
            },
        });
        if (res.status >= 400 && res.status < 600) {
            const error = await res.json();
            throw error;
        }
        const data = await res.json();
        return data.docs || [];
    }
    /**
     * Returns the auth URL that users can use to authenticate themselves to the
     * specified application.
     * @private
     * @param {OAuthParams} params The OAuth parameters.
     * @returns {Promise<String>} The auth URL where users can authenticate themselves.
     */
    async getOAuthUrl({ slug, authConfig, payload, }) {
        const queryParams = new URLSearchParams();
        if (authConfig)
            queryParams.append("auth_config_id", authConfig);
        if (typeof payload === "object") {
            for (const [key, value] of Object.entries(payload)) {
                queryParams.append(key, value);
            }
        }
        const res = await fetch(`${this.baseUrl}/api/v1/${slug}/integrate?${queryParams.toString()}`, {
            headers: {
                authorization: `Bearer ${this.token}`,
            },
        });
        if (res.status >= 400 && res.status < 600) {
            const error = await res.json();
            throw error;
        }
        const data = await res.json();
        return data.auth_url;
    }
    /**
     * Handle OAuth for the specified application.
     * @private
     * @param {OAuthParams} params The OAuth parameters.
     * @returns {Promise<Boolean>} Whether the user authenticated.
     */
    async oauth({ slug, authConfig, payload, autoClose = true, }) {
        return new Promise((resolve, reject) => {
            this.getOAuthUrl({ slug, authConfig, payload })
                .then(oauthUrl => {
                const connectWindow = window.open(oauthUrl);
                // keep checking connection status
                const interval = setInterval(() => {
                    this.getApp(slug)
                        .then(app => {
                        const oauthAccounts = app.connected_accounts?.filter(a => a.auth_type === AuthType.OAuth2 && a.status !== AuthStatus.Expired);
                        if (app && oauthAccounts?.some(a => authConfig ? a.auth_config_id === authConfig : true)) {
                            // close auth window
                            if (autoClose)
                                connectWindow && connectWindow.close();
                            // clear interval
                            clearInterval(interval);
                            // resovle status
                            resolve(true);
                        }
                        else {
                            // user closed oauth window without authenticating
                            if (connectWindow && connectWindow.closed) {
                                // clear interval
                                clearInterval(interval);
                                // resolve status
                                resolve(false);
                            }
                        }
                    })
                        .catch(e => {
                        console.error(e);
                        // connectWindow?.close();
                        clearInterval(interval);
                        reject(e);
                    });
                }, 3e3);
            })
                .catch(reject);
        });
    }
    /**
     * Save auth data for the specified keybased application.
     * @param {KeyBasedParams} params The key based parameters.
     * @returns {Promise<Boolean>} Whether the auth data was saved successfully.
     */
    async keybased({ slug, authConfig, payload, }) {
        const res = await fetch(`${this.baseUrl}/api/v2/app/${slug}/save?auth_config_id=${authConfig}`, {
            method: "POST",
            headers: {
                authorization: `Bearer ${this.token}`,
                "content-type": "application/json",
            },
            body: JSON.stringify({
                ...payload,
            }),
        });
        if (res.status >= 400 && res.status < 600) {
            const error = await res.json();
            throw error;
        }
        const data = await res.json();
        return data.success;
    }
    /**
     * Connects the specified application using the provided authentication type and optional auth data.
     * @param params - The parameters for connecting the application.
     * @param params.slug - The application slug.
     * @param params.authConfig - The identifier of the auth config.
     * @param params.type - The authentication type to use. If not provided, it defaults to `keybased` if payload is provided, otherwise `oauth2`.
     * @param params.payload - key-value pairs of authentication data required for the specified auth type.
     * @param params.autoClose - Whether to close the authentication window automatically. If not provided, it defaults to `true`.
     * @returns A promise that resolves to true if the connection was successful, otherwise false.
     * @throws Throws an error if the authentication type is invalid or the connection fails.
     */
    async connect({ slug, authConfig, type, payload, autoClose = true, }) {
        switch (type) {
            case AuthType.OAuth2:
                return this.oauth({ slug, authConfig, payload, autoClose });
            case AuthType.KeyBased:
                return this.keybased({ slug, authConfig, payload });
            default:
                if (payload)
                    return this.keybased({ slug, authConfig, payload });
                return this.oauth({ slug, authConfig });
        }
    }
    /**
     * Disconnect the specified application and remove any associated data from Cobalt.
     * @param {String} slug The application slug.
     * @param {AuthType} [type] The authentication type to use. If not provided, it'll remove all the connected accounts.
     * @param {String} [authConfig] The identifier of the auth config.
     * @returns {Promise<unknown>}
     */
    async disconnect(slug, type, authConfig) {
        const queryParams = new URLSearchParams();
        if (type)
            queryParams.append("auth_type", type);
        if (authConfig)
            queryParams.append("auth_config_id", authConfig);
        const res = await fetch(`${this.baseUrl}/api/v1/linked-acc/integration/${slug}?${queryParams.toString()}`, {
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
    /**
     * Returns the specified config, or creates one if it doesn't exist.
     * @param {ConfigPayload} payload The payload object for config.
     * @returns {Promise<Config>} The specified config.
     */
    async config(payload) {
        const res = await fetch(`${this.baseUrl}/api/v2/f-sdk/config`, {
            method: "POST",
            headers: {
                authorization: `Bearer ${this.token}`,
                "content-type": "application/json",
            },
            body: JSON.stringify({
                ...payload,
                labels: payload.labels || [],
            }),
        });
        if (res.status >= 400 && res.status < 600) {
            const error = await res.json();
            throw error;
        }
        return await res.json();
    }
    /**
     * Returns the configs created for the specified application.
     * @param {String} slug The application slug.
     * @returns {Promise<{ config_id: string; }[]>} The configs created for the specified application.
     */
    async getConfigs(slug) {
        const res = await fetch(`${this.baseUrl}/api/v2/public/slug/${slug}/configs`, {
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
    /**
     * Returns the specified config.
     * @param {String} slug The application slug.
     * @param {String} [configId] The unique ID of the config.
     * @param {Boolean} [excludeOptions] Whether to exclude the options from the fields in the response.
     * @returns {Promise<Config>} The specified config.
     */
    async getConfig(slug, configId, excludeOptions) {
        const res = await fetch(`${this.baseUrl}/api/v2/f-sdk/slug/${slug}/config${configId ? `/${configId}` : ""}`, {
            headers: {
                authorization: `Bearer ${this.token}`,
                ...(excludeOptions ? { disable_field_options: "true" } : {}),
            },
        });
        if (res.status >= 400 && res.status < 600) {
            const error = await res.json();
            throw error;
        }
        return await res.json();
    }
    /**
     * Update the specified config.
     * @param {UpdateConfigPayload} payload The update payload.
     * @returns {Promise<Config>} The specified config.
     */
    async updateConfig(payload) {
        const res = await fetch(`${this.baseUrl}/api/v2/f-sdk/config`, {
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
    /**
     * Delete the specified config.
     * @param {String} slug The application slug.
     * @param {String} [configId] The unique ID of the config.
     * @returns {Promise<unknown>}
     */
    async deleteConfig(slug, configId) {
        const res = await fetch(`${this.baseUrl}/api/v2/f-sdk/slug/${slug}/config${configId ? `/${configId}` : ""}`, {
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
    /**
     * Returns the specified field of the config.
     * @param {String} slug The application slug.
     * @param {String} fieldId The unique ID of the field.
     * @param {String} [workflowId] The unique ID of the workflow.
     * @param {Record<string, unknown>} [payload] The payload to be sent in the request body.
     * @returns {Promise<Field>} The specified config field.
     */
    async getConfigField(slug, fieldId, workflowId, payload) {
        const res = await fetch(`${this.baseUrl}/api/v2/public/config/field/${fieldId}${workflowId ? `?workflow_id=${workflowId}` : ""}`, {
            method: "POST",
            headers: {
                authorization: `Bearer ${this.token}`,
                "content-type": "application/json",
                slug,
            },
            body: JSON.stringify(payload || {}),
        });
        if (res.status >= 400 && res.status < 600) {
            const error = await res.json();
            throw error;
        }
        return await res.json();
    }
    /**
     * Update the specified config field value.
     * @param {String} slug The application slug.
     * @param {String} fieldId The unique ID of the field.
     * @param {String | Number | Boolean | null} value The new value for the field.
     * @param {String} [workflowId] The unique ID of the workflow.
     * @returns {Promise<Field>} The updated config field.
     */
    async updateConfigField(slug, fieldId, value, workflowId) {
        const res = await fetch(`${this.baseUrl}/api/v2/public/config/field/${fieldId}${workflowId ? `?workflow_id=${workflowId}` : ""}`, {
            method: "PUT",
            headers: {
                authorization: `Bearer ${this.token}`,
                "content-type": "application/json",
                slug,
            },
            body: JSON.stringify({ value }),
        });
        if (res.status >= 400 && res.status < 600) {
            const error = await res.json();
            throw error;
        }
        return await res.json();
    }
    /**
     * Delete the specified config field value.
     * @param {String} slug The application slug.
     * @param {String} fieldId The unique ID of the field.
     * @param {String} [workflowId] The unique ID of the workflow.
     * @returns {Promise<unknown>}
     */
    async deleteConfigField(slug, fieldId, workflowId) {
        const res = await fetch(`${this.baseUrl}/api/v2/public/config/field/${fieldId}${workflowId ? `?workflow_id=${workflowId}` : ""}`, {
            method: "DELETE",
            headers: {
                authorization: `Bearer ${this.token}`,
                slug,
            },
        });
        if (res.status >= 400 && res.status < 600) {
            const error = await res.json();
            throw error;
        }
        return await res.json();
    }
    /**
     * Returns the options for the specified field.
     * @param {String} lhs The selected value of the lhs field.
     * @param {String} slug The application slug.
     * @param {String} fieldId The unique ID of the field.
     * @param {String} [workflowId] The unique ID of the workflow, if this is a workflow field.
     * @returns {Promise<RuleOptions>} The specified rule field's options.
     */
    async getFieldOptions(lhs, slug, fieldId, workflowId) {
        const res = await fetch(`${this.baseUrl}/api/v2/public/config/rule-engine/${fieldId}${workflowId ? `?workflow_id=${workflowId}` : ""}`, {
            method: "POST",
            headers: {
                authorization: `Bearer ${this.token}`,
                "content-type": "application/json",
                slug,
            },
            body: JSON.stringify({
                rule_column: { lhs },
            }),
        });
        if (res.status >= 400 && res.status < 600) {
            const error = await res.json();
            throw error;
        }
        return await res.json();
    }
    /**
     * Returns the private workflows for the specified application.
     * @param {Object} params
     * @param {String} [params.slug]
     * @param {String} [params.name]
     * @param {Number} [params.page]
     * @param {Number} [params.limit]
     * @param {String} [params.start_date] ISO date string — filter workflows created on or after this date.
     * @param {String} [params.end_date] ISO date string — filter workflows created on or before this date.
     * @param {Boolean} [params.published] Filter by workflow published status.
     * @returns
     */
    async getWorkflows({ page = 1, limit = 100, ...rest } = {}) {
        const query = new URLSearchParams({ page: String(page), limit: String(limit) });
        for (const key of Object.keys(rest)) {
            const value = rest[key];
            if (value !== undefined && value !== "")
                query.set(key, String(value));
        }
        const res = await fetch(`${this.baseUrl}/api/v2/public/workflow?${query}`, {
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
    /**
     * Create a public workflow for the linked account.
     * @param {Object} params
     * @param {String} params.name The workflow name.
     * @param {String} [params.description] The workflow description.
     * @param {String} [params.slug] The application slug in which this workflow should be created.
     * If slug isn't set, the workflow will be created in the organization's default application.
     * @returns {Promise<PublicWorkflow>} The created public workflow.
     */
    async createWorkflow(params) {
        const res = await fetch(`${this.baseUrl}/api/v2/public/workflow`, {
            method: "POST",
            headers: {
                authorization: `Bearer ${this.token}`,
                "content-type": "application/json",
            },
            body: JSON.stringify({
                name: params.name,
                description: params.description,
                slug: params.slug,
            }),
        });
        if (res.status >= 400 && res.status < 600) {
            const error = await res.json();
            throw error;
        }
        const data = await res.json();
        return data?.workflow ?? data;
    }
    /**
     * Delete the specified public workflow.
     * @param {String} workflowId The workflow ID.
     * @returns {Promise<unknown>}
     */
    async deleteWorkflow(workflowId) {
        const res = await fetch(`${this.baseUrl}/api/v2/public/workflow/${workflowId}`, {
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
    /**
     * Returns the execution payload for the specified public workflow.
     * @param {String} workflowId The workflow ID.
     * @returns {Promise<WorkflowPayloadResponse>} The workflow payload response.
     */
    async getWorkflowPayload(workflowId) {
        const res = await fetch(`${this.baseUrl}/api/v2/public/workflow/request-structure/${workflowId}`, {
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
    /**
     * Execute the specified public workflow.
     * @param {ExecuteWorkflowPayload} options The execution payload.
     * @param {String} options.worklfow The workflow id or alias.
     * @param {String} [options.slug] The application's slug this workflow belongs to. Slug is required if you're using workflow alias.
     * @param {Record<string, any>} [options.payload] The execution payload.
     * @returns {Promise<unknown>}
     */
    async executeWorkflow(options) {
        const res = await fetch(`${this.baseUrl}/api/v2/public/workflow/${options?.worklfow}/execute`, {
            method: "POST",
            headers: {
                authorization: `Bearer ${this.token}`,
                "content-type": "application/json",
                slug: options?.slug || "",
                sync_execution: options?.sync_execution ? "true" : "false",
            },
            body: JSON.stringify(options?.payload),
        });
        if (res.status >= 400 && res.status < 600) {
            const error = await res.json();
            throw error;
        }
        return await res.json();
    }
    /**
     * Returns the workflow execution logs for the linked account.
     * @param {Object} [params]
     * @param {Number} [params.page]
     * @param {Number} [params.limit]
     * @param {String} [params.status] - Filter by execution status (COMPLETED, RUNNING, ERRORED, STOPPED, STOPPING, TIMED_OUT)
     * @param {String} [params.workflow_name] - Filter by workflow name
     * @param {String} [params.workflow_id] - Filter by workflow ID
     * @param {String} [params.start_date] - Filter executions after this date
     * @param {String} [params.end_date] - Filter executions before this date
     * @param {String} [params.execution_type] - Filter by execution type (SYNC, ASYNC)
     * @param {String} [params.execution_source] - Filter by execution source (Event, Schedule, API Call)
     * @returns {Promise<PaginatedResponse<Execution>>} The paginated workflow execution logs.
     */
    async getExecutions({ page = 1, limit = 10, ...rest } = {}) {
        const query = new URLSearchParams({ page: String(page), limit: String(limit) });
        for (const key of Object.keys(rest)) {
            const value = rest[key];
            if (value !== undefined && value !== "")
                query.set(key, String(value));
        }
        const res = await fetch(`${this.baseUrl}/api/v2/public/execution?${query}`, {
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
    /**
     * Returns the specified workflow execution log.
     * @param {String} executionId The execution ID.
     * @returns {Promise<Execution>} The specified execution log.
     */
    async getExecution(executionId) {
        const res = await fetch(`${this.baseUrl}/api/v2/public/execution/${executionId}`, {
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
}
exports.Cobalt = Cobalt;
