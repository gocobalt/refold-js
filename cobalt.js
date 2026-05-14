"use strict";
/**
 * Cobalt Frontend SDK
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
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
    getAccountDetails() {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield fetch(`${this.baseUrl}/api/v3/org/basics`, {
                headers: {
                    authorization: `Bearer ${this.token}`,
                },
            });
            if (res.status >= 400 && res.status < 600) {
                const error = yield res.json();
                throw error;
            }
            const data = yield res.json();
            return data;
        });
    }
    /**
     * Returns the org & customer details for the associated token.
     * @private
     * @returns {Promise<unknown>}
     */
    updateAccount(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield fetch(`${this.baseUrl}/api/v2/public/linked-account`, {
                method: "PUT",
                headers: {
                    authorization: `Bearer ${this.token}`,
                    "content-type": "application/json",
                },
                body: JSON.stringify(Object.assign({}, payload)),
            });
            if (res.status >= 400 && res.status < 600) {
                const error = yield res.json();
                throw error;
            }
            const data = yield res.json();
            return data;
        });
    }
    /**
     * Returns the application details for the specified application, provided
     * the application is enabled in Cobalt. If no application is specified,
     * it returns all the enabled applications.
     * @param {String} [slug] The application slug.
     * @returns {Promise<Application | Application[]>} The application details.
     */
    getApp(slug) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield fetch(`${this.baseUrl}/api/v2/f-sdk/application${slug ? `/${slug}` : ""}`, {
                headers: {
                    authorization: `Bearer ${this.token}`,
                },
            });
            if (res.status >= 400 && res.status < 600) {
                const error = yield res.json();
                throw error;
            }
            const data = yield res.json();
            return data;
        });
    }
    /**
     * Returns all the enabled apps.
     * @returns {Promise<Application[]>} The list of applications.
     */
    getApps() {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield fetch(`${this.baseUrl}/api/v2/f-sdk/application`, {
                headers: {
                    authorization: `Bearer ${this.token}`,
                },
            });
            if (res.status >= 400 && res.status < 600) {
                const error = yield res.json();
                throw error;
            }
            const data = yield res.json();
            return data;
        });
    }
    /**
     * Returns the auth URL that users can use to authenticate themselves to the
     * specified application.
     * @private
     * @param {String} slug The application slug.
     * @param {Object.<string, string>} [params] The key value pairs of auth data.
     * @returns {Promise<String>} The auth URL where users can authenticate themselves.
     */
    getOAuthUrl(slug, params) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield fetch(`${this.baseUrl}/api/v1/${slug}/integrate?${new URLSearchParams(params).toString()}`, {
                headers: {
                    authorization: `Bearer ${this.token}`,
                },
            });
            if (res.status >= 400 && res.status < 600) {
                const error = yield res.json();
                throw error;
            }
            const data = yield res.json();
            return data.auth_url;
        });
    }
    /**
     * Handle OAuth for the specified application.
     * @private
     * @param {String} slug The application slug.
     * @param {Object.<string, string>} [params] The key value pairs of auth data.
     * @returns {Promise<Boolean>} Whether the user authenticated.
     */
    oauth(slug, params) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                this.getOAuthUrl(slug, params)
                    .then(oauthUrl => {
                    const connectWindow = window.open(oauthUrl);
                    // keep checking connection status
                    const interval = setInterval(() => {
                        this.getApp(slug)
                            .then(app => {
                            var _a;
                            if (app && ((_a = app.connected_accounts) === null || _a === void 0 ? void 0 : _a.filter(a => a.auth_type === AuthType.OAuth2).some(a => a.status === AuthStatus.Active))) {
                                // close auth window
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
        });
    }
    /**
     * Save auth data for the specified keybased application.
     * @param {String} slug The application slug.
     * @param {Object.<string, string>} [payload] The key value pairs of auth data.
     * @returns {Promise<Boolean>} Whether the auth data was saved successfully.
     */
    keybased(slug, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield fetch(`${this.baseUrl}/api/v2/app/${slug}/save`, {
                method: "POST",
                headers: {
                    authorization: `Bearer ${this.token}`,
                    "content-type": "application/json",
                },
                body: JSON.stringify(Object.assign({}, payload)),
            });
            if (res.status >= 400 && res.status < 600) {
                const error = yield res.json();
                throw error;
            }
            const data = yield res.json();
            return data.success;
        });
    }
    /**
     * Connects the specified application using the provided authentication type and optional auth data.
     * @param params - The parameters for connecting the application.
     * @param params.slug - The application slug.
     * @param params.type - The authentication type to use. If not provided, it defaults to `keybased` if payload is provided, otherwise `oauth2`.
     * @param params.payload - key-value pairs of authentication data required for the specified auth type.
     * @returns A promise that resolves to true if the connection was successful, otherwise false.
     * @throws Throws an error if the authentication type is invalid or the connection fails.
     */
    connect(_a) {
        return __awaiter(this, arguments, void 0, function* ({ slug, type, payload, }) {
            switch (type) {
                case AuthType.OAuth2:
                    return this.oauth(slug, payload);
                case AuthType.KeyBased:
                    return this.keybased(slug, payload);
                default:
                    if (payload)
                        return this.keybased(slug, payload);
                    return this.oauth(slug);
            }
        });
    }
    /**
     * Disconnect the specified application and remove any associated data from Cobalt.
     * @param {String} slug The application slug.
     * @param {AuthType} [type] The authentication type to use. If not provided, it'll remove all the connected accounts.
     * @returns {Promise<unknown>}
     */
    disconnect(slug, type) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield fetch(`${this.baseUrl}/api/v1/linked-acc/integration/${slug}${type ? `?auth_type=${type}` : ""}`, {
                method: "DELETE",
                headers: {
                    authorization: `Bearer ${this.token}`,
                },
            });
            if (res.status >= 400 && res.status < 600) {
                const error = yield res.json();
                throw error;
            }
            return yield res.json();
        });
    }
    /**
     * Returns the specified config, or creates one if it doesn't exist.
     * @param {ConfigPayload} payload The payload object for config.
     * @returns {Promise<Config>} The specified config.
     */
    config(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield fetch(`${this.baseUrl}/api/v2/f-sdk/config`, {
                method: "POST",
                headers: {
                    authorization: `Bearer ${this.token}`,
                    "content-type": "application/json",
                },
                body: JSON.stringify(Object.assign(Object.assign({}, payload), { labels: payload.labels || [] })),
            });
            if (res.status >= 400 && res.status < 600) {
                const error = yield res.json();
                throw error;
            }
            return yield res.json();
        });
    }
    /**
     * Returns the configs created for the specified application.
     * @param {String} slug The application slug.
     * @returns {Promise<{ config_id: string; }[]>} The configs created for the specified application.
     */
    getConfigs(slug) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield fetch(`${this.baseUrl}/api/v2/public/slug/${slug}/configs`, {
                headers: {
                    authorization: `Bearer ${this.token}`,
                },
            });
            if (res.status >= 400 && res.status < 600) {
                const error = yield res.json();
                throw error;
            }
            return yield res.json();
        });
    }
    /**
     * Returns the specified config.
     * @param {String} slug The application slug.
     * @param {String} [configId] The unique ID of the config.
     * @param {Boolean} [excludeOptions] Whether to exclude the options from the fields in the response.
     * @returns {Promise<Config>} The specified config.
     */
    getConfig(slug, configId, excludeOptions) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield fetch(`${this.baseUrl}/api/v2/f-sdk/slug/${slug}/config${configId ? `/${configId}` : ""}`, {
                headers: Object.assign({ authorization: `Bearer ${this.token}` }, (excludeOptions ? { disable_field_options: "true" } : {})),
            });
            if (res.status >= 400 && res.status < 600) {
                const error = yield res.json();
                throw error;
            }
            return yield res.json();
        });
    }
    /**
     * Update the specified config.
     * @param {UpdateConfigPayload} payload The update payload.
     * @returns {Promise<Config>} The specified config.
     */
    updateConfig(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield fetch(`${this.baseUrl}/api/v2/f-sdk/config`, {
                method: "PUT",
                headers: {
                    authorization: `Bearer ${this.token}`,
                    "content-type": "application/json",
                },
                body: JSON.stringify(payload),
            });
            if (res.status >= 400 && res.status < 600) {
                const error = yield res.json();
                throw error;
            }
            return yield res.json();
        });
    }
    /**
     * Delete the specified config.
     * @param {String} slug The application slug.
     * @param {String} [configId] The unique ID of the config.
     * @returns {Promise<unknown>}
     */
    deleteConfig(slug, configId) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield fetch(`${this.baseUrl}/api/v2/f-sdk/slug/${slug}/config${configId ? `/${configId}` : ""}`, {
                method: "DELETE",
                headers: {
                    authorization: `Bearer ${this.token}`,
                },
            });
            if (res.status >= 400 && res.status < 600) {
                const error = yield res.json();
                throw error;
            }
            return yield res.json();
        });
    }
    /**
     * Returns the specified field of the config.
     * @param {String} slug The application slug.
     * @param {String} fieldId The unique ID of the field.
     * @param {String} [workflowId] The unique ID of the workflow.
     * @returns {Promise<Field>} The specified config field.
     */
    getConfigField(slug, fieldId, workflowId) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield fetch(`${this.baseUrl}/api/v2/public/config/field/${fieldId}${workflowId ? `?workflow_id=${workflowId}` : ""}`, {
                headers: {
                    authorization: `Bearer ${this.token}`,
                    slug,
                },
            });
            if (res.status >= 400 && res.status < 600) {
                const error = yield res.json();
                throw error;
            }
            return yield res.json();
        });
    }
    /**
     * Update the specified config field value.
     * @param {String} slug The application slug.
     * @param {String} fieldId The unique ID of the field.
     * @param {String | Number | Boolean | null} value The new value for the field.
     * @param {String} [workflowId] The unique ID of the workflow.
     * @returns {Promise<Field>} The updated config field.
     */
    updateConfigField(slug, fieldId, value, workflowId) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield fetch(`${this.baseUrl}/api/v2/public/config/field/${fieldId}${workflowId ? `?workflow_id=${workflowId}` : ""}`, {
                method: "PUT",
                headers: {
                    authorization: `Bearer ${this.token}`,
                    "content-type": "application/json",
                    slug,
                },
                body: JSON.stringify({ value }),
            });
            if (res.status >= 400 && res.status < 600) {
                const error = yield res.json();
                throw error;
            }
            return yield res.json();
        });
    }
    /**
     * Delete the specified config field value.
     * @param {String} slug The application slug.
     * @param {String} fieldId The unique ID of the field.
     * @param {String} [workflowId] The unique ID of the workflow.
     * @returns {Promise<unknown>}
     */
    deleteConfigField(slug, fieldId, workflowId) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield fetch(`${this.baseUrl}/api/v2/public/config/field/${fieldId}${workflowId ? `?workflow_id=${workflowId}` : ""}`, {
                method: "DELETE",
                headers: {
                    authorization: `Bearer ${this.token}`,
                    slug,
                },
            });
            if (res.status >= 400 && res.status < 600) {
                const error = yield res.json();
                throw error;
            }
            return yield res.json();
        });
    }
    /**
     * Returns the options for the specified field.
     * @param {String} lhs The selected value of the lhs field.
     * @param {String} slug The application slug.
     * @param {String} fieldId The unique ID of the field.
     * @param {String} [workflowId] The unique ID of the workflow, if this is a workflow field.
     * @returns {Promise<RuleOptions>} The specified rule field's options.
     */
    getFieldOptions(lhs, slug, fieldId, workflowId) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield fetch(`${this.baseUrl}/api/v2/public/config/rule-engine/${fieldId}${workflowId ? `?workflow_id=${workflowId}` : ""}`, {
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
                const error = yield res.json();
                throw error;
            }
            return yield res.json();
        });
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
    getWorkflows() {
        return __awaiter(this, arguments, void 0, function* (_a = {}) {
            var { page = 1, limit = 100 } = _a, rest = __rest(_a, ["page", "limit"]);
            const query = new URLSearchParams({ page: String(page), limit: String(limit) });
            for (const key of Object.keys(rest)) {
                const value = rest[key];
                if (value !== undefined && value !== "")
                    query.set(key, String(value));
            }
            const res = yield fetch(`${this.baseUrl}/api/v2/public/workflow?${query}`, {
                headers: {
                    authorization: `Bearer ${this.token}`,
                },
            });
            if (res.status >= 400 && res.status < 600) {
                const error = yield res.json();
                throw error;
            }
            return yield res.json();
        });
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
    createWorkflow(params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const res = yield fetch(`${this.baseUrl}/api/v2/public/workflow`, {
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
                const error = yield res.json();
                throw error;
            }
            const data = yield res.json();
            return (_a = data === null || data === void 0 ? void 0 : data.workflow) !== null && _a !== void 0 ? _a : data;
        });
    }
    /**
     * Delete the specified public workflow.
     * @param {String} workflowId The workflow ID.
     * @returns {Promise<unknown>}
     */
    deleteWorkflow(workflowId) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield fetch(`${this.baseUrl}/api/v2/public/workflow/${workflowId}`, {
                method: "DELETE",
                headers: {
                    authorization: `Bearer ${this.token}`,
                },
            });
            if (res.status >= 400 && res.status < 600) {
                const error = yield res.json();
                throw error;
            }
            return yield res.json();
        });
    }
    /**
     * Returns the execution payload for the specified public workflow.
     * @param {String} workflowId The workflow ID.
     * @returns {Promise<WorkflowPayloadResponse>} The workflow payload response.
     */
    getWorkflowPayload(workflowId) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield fetch(`${this.baseUrl}/api/v2/public/workflow/request-structure/${workflowId}`, {
                headers: {
                    authorization: `Bearer ${this.token}`,
                },
            });
            if (res.status >= 400 && res.status < 600) {
                const error = yield res.json();
                throw error;
            }
            return yield res.json();
        });
    }
    /**
     * Execute the specified public workflow.
     * @param {ExecuteWorkflowPayload} options The execution payload.
     * @param {String} options.worklfow The workflow id or alias.
     * @param {String} [options.slug] The application's slug this workflow belongs to. Slug is required if you're using workflow alias.
     * @param {Record<string, any>} [options.payload] The execution payload.
     * @returns {Promise<unknown>}
     */
    executeWorkflow(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield fetch(`${this.baseUrl}/api/v2/public/workflow/${options === null || options === void 0 ? void 0 : options.worklfow}/execute`, {
                method: "POST",
                headers: {
                    authorization: `Bearer ${this.token}`,
                    "content-type": "application/json",
                    slug: (options === null || options === void 0 ? void 0 : options.slug) || "",
                    sync_execution: (options === null || options === void 0 ? void 0 : options.sync_execution) ? "true" : "false",
                },
                body: JSON.stringify(options === null || options === void 0 ? void 0 : options.payload),
            });
            if (res.status >= 400 && res.status < 600) {
                const error = yield res.json();
                throw error;
            }
            return yield res.json();
        });
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
    getExecutions() {
        return __awaiter(this, arguments, void 0, function* (_a = {}) {
            var { page = 1, limit = 10 } = _a, rest = __rest(_a, ["page", "limit"]);
            const query = new URLSearchParams({ page: String(page), limit: String(limit) });
            for (const key of Object.keys(rest)) {
                const value = rest[key];
                if (value !== undefined && value !== "")
                    query.set(key, String(value));
            }
            const res = yield fetch(`${this.baseUrl}/api/v2/public/execution?${query}`, {
                headers: {
                    authorization: `Bearer ${this.token}`,
                },
            });
            if (res.status >= 400 && res.status < 600) {
                const error = yield res.json();
                throw error;
            }
            return yield res.json();
        });
    }
    /**
     * Returns the specified workflow execution log.
     * @param {String} executionId The execution ID.
     * @returns {Promise<Execution>} The specified execution log.
     */
    getExecution(executionId) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield fetch(`${this.baseUrl}/api/v2/public/execution/${executionId}`, {
                headers: {
                    authorization: `Bearer ${this.token}`,
                },
            });
            if (res.status >= 400 && res.status < 600) {
                const error = yield res.json();
                throw error;
            }
            return yield res.json();
        });
    }
}
exports.Cobalt = Cobalt;
