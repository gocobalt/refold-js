"use strict";
/**
 * Refold Frontend SDK
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
exports.Refold = exports.GrantType = exports.AuthStatus = exports.AuthType = void 0;
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
/** The OAuth grant an application uses. Absent ⇒ {@link GrantType.AuthorizationCode}. */
var GrantType;
(function (GrantType) {
    GrantType["AuthorizationCode"] = "authorization_code";
    GrantType["AuthorizationCodePKCE"] = "authorization_code_pkce";
    GrantType["ClientCredentials"] = "client_credentials";
})(GrantType || (exports.GrantType = GrantType = {}));
/** How often, in milliseconds, connection status is polled during authentication. */
const POLL_INTERVAL = 3e3;
/** How long, in milliseconds, polling continues after the auth window closes or the wait times out, since the connection may complete moments later. */
const POLL_GRACE = 6e3;
/** The number of consecutive polling failures tolerated before authentication is aborted. */
const MAX_POLL_FAILURES = 3;
/** The default maximum time, in milliseconds, to wait for authentication. */
const DEFAULT_CONNECT_TIMEOUT = 300e3;
class Refold {
    /**
     * Refold Frontend SDK
     * @param {Object} options The options to configure the Refold SDK.
     * @param {String} [options.token] The session token.
     * @param {String} [options.baseUrl=https://app.refold.ai] The base URL of the Refold API.
     */
    constructor(options = {}) {
        this.baseUrl = options.baseUrl
            ? /^https?:\/\//.test(options.baseUrl)
                ? options.baseUrl
                : "https://" + options.baseUrl
            : "https://app.refold.ai";
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
     * the application is enabled in Refold. If no application is specified,
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
    /** Base path for a universal connector's own auth endpoints. */
    universalConnectorUrl(slug) {
        return `${this.baseUrl}/api/v1/auth-service/f-sdk/universal-connector/${encodeURIComponent(slug)}`;
    }
    /**
     * Whether a slug is a universal connector. Trusts an explicitly supplied `kind`
     * (no request); otherwise resolves it from the app. A failed lookup falls back to
     * `false` so an unrelated outage can't turn a native connect into a wrong-endpoint
     * call — the native path then reports the real error.
     * @private
     */
    isUniversalConnector(slug, kind) {
        return __awaiter(this, void 0, void 0, function* () {
            if (kind)
                return kind === "universal_connector";
            try {
                const app = yield this.getApp(slug);
                return (app === null || app === void 0 ? void 0 : app.kind) === "universal_connector";
            }
            catch (_a) {
                return false;
            }
        });
    }
    /**
     * Starts the connect flow for the specified application against `/integrate`.
     *
     * Transport is chosen from the application's grant: {@link GrantType.ClientCredentials}
     * (M2M) submits the fields in the request body so a private key or client
     * secret never rides in a URL, and the server mints the token and returns
     * `connected`. Redirect grants (authorization_code / PKCE) carry only
     * non-secret pre-requisite fields, sent as query parameters, and the server
     * returns an `auth_url` to open.
     * @private
     * @param {String} slug The application slug.
     * @param {Object.<string, string>} [params] The key value pairs of auth data.
     * @param {GrantType} [grant] The application's OAuth grant. Omit for redirect grants.
     * @returns {Promise<{auth_url?: string, connected?: boolean}>} The server response.
     */
    integrate(slug, params, grant, kind) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = (yield this.isUniversalConnector(slug, kind))
                ? `${this.universalConnectorUrl(slug)}/integrate`
                : `${this.baseUrl}/api/v1/${slug}/integrate`;
            const res = grant === GrantType.ClientCredentials
                ? yield fetch(url, {
                    method: "POST",
                    headers: {
                        authorization: `Bearer ${this.token}`,
                        "content-type": "application/json",
                    },
                    body: JSON.stringify(params !== null && params !== void 0 ? params : {}),
                })
                : yield fetch(`${url}?${new URLSearchParams(params).toString()}`, {
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
     * Handle OAuth for the specified application.
     * @private
     * @param params - The parameters for the OAuth flow.
     * @param params.slug - The application slug.
     * @param params.payload - The key value pairs of auth data.
     * @param params.autoClose - Whether to close the authentication window automatically. Defaults to `true`.
     * @param params.timeout - Maximum time in milliseconds to wait for authentication before giving up. Set to `0` to wait indefinitely. Defaults to 5 minutes.
     * @returns {Promise<Boolean>} Whether the user authenticated.
     */
    oauth(_a) {
        return __awaiter(this, arguments, void 0, function* ({ slug, payload, grantType, kind, autoClose = true, timeout = DEFAULT_CONNECT_TIMEOUT, }) {
            const data = yield this.integrate(slug, payload, grantType, kind);
            // No auth_url ⇒ the server completed the connection without a redirect
            // (client-credentials / M2M); report the outcome it gives us. A response
            // with neither an auth_url nor a connection result is unexpected — surface
            // it rather than silently reporting failure.
            if (!data.auth_url) {
                if (typeof data.connected === "boolean")
                    return data.connected;
                throw Object.assign(new Error("The server returned neither an authentication URL nor a connection result."), { code: "UNEXPECTED_INTEGRATE_RESPONSE" });
            }
            const connectWindow = window.open(data.auth_url);
            if (!connectWindow) {
                throw Object.assign(new Error("The authentication window could not be opened. It may have been blocked by the browser."), { code: "POPUP_BLOCKED" });
            }
            const hasActiveOAuthAccount = (app) => { var _a; return Boolean((_a = app === null || app === void 0 ? void 0 : app.connected_accounts) === null || _a === void 0 ? void 0 : _a.filter(a => a.auth_type === AuthType.OAuth2).some(a => a.status === AuthStatus.Active)); };
            return new Promise((resolve, reject) => {
                const startedAt = Date.now();
                let inFlight = false;
                let consecutiveFailures = 0;
                let firstFailure;
                let graceStartedAt;
                // keep checking connection status
                const interval = setInterval(() => {
                    const timedOut = timeout > 0 && Date.now() - startedAt >= timeout;
                    if (connectWindow.closed || timedOut) {
                        // the connection may complete moments around the window
                        // closing or the wait timing out, so keep polling for a
                        // little longer before giving up
                        if (timedOut && autoClose)
                            connectWindow.close();
                        graceStartedAt !== null && graceStartedAt !== void 0 ? graceStartedAt : (graceStartedAt = Date.now());
                        if (Date.now() - graceStartedAt >= POLL_GRACE) {
                            clearInterval(interval);
                            resolve(false);
                            return;
                        }
                    }
                    // don't check the status again until the previous check settles
                    if (inFlight)
                        return;
                    inFlight = true;
                    this.getApp(slug)
                        .then(app => {
                        inFlight = false;
                        consecutiveFailures = 0;
                        firstFailure = undefined;
                        if (hasActiveOAuthAccount(app)) {
                            // close auth window
                            if (autoClose)
                                connectWindow.close();
                            // clear interval
                            clearInterval(interval);
                            // resolve status
                            resolve(true);
                        }
                    })
                        .catch(e => {
                        console.error(e);
                        inFlight = false;
                        // tolerate transient errors while the user authenticates
                        consecutiveFailures += 1;
                        firstFailure !== null && firstFailure !== void 0 ? firstFailure : (firstFailure = e);
                        if (consecutiveFailures >= MAX_POLL_FAILURES) {
                            clearInterval(interval);
                            reject(firstFailure);
                        }
                    });
                }, POLL_INTERVAL);
            });
        });
    }
    /**
     * Save auth data for the specified keybased application.
     * @param params - The parameters for key-based auth.
     * @param params.slug - The application slug.
     * @param params.payload - The key value pairs of auth data.
     * @returns {Promise<Boolean>} Whether the auth data was saved successfully.
     */
    keybased(_a) {
        return __awaiter(this, arguments, void 0, function* ({ slug, payload, kind, }) {
            // Universal connectors store credentials through their own endpoint.
            const url = (yield this.isUniversalConnector(slug, kind))
                ? `${this.universalConnectorUrl(slug)}/save-credentials`
                : `${this.baseUrl}/api/v2/app/${slug}/save`;
            const res = yield fetch(url, {
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
     * @param params.grantType - The application's OAuth grant. Pass {@link GrantType.ClientCredentials} for machine-to-machine connectors (fields are submitted to the server, no window opens). Omit for redirect grants.
     * @param params.autoClose - Whether to close the authentication window automatically. If not provided, it defaults to `true`.
     * @param params.timeout - Maximum time in milliseconds to wait for authentication before giving up. Only applicable to the OAuth2 flow. Set to `0` to wait indefinitely. If not provided, it defaults to 5 minutes.
     * @returns A promise that resolves to true if the connection was successful, otherwise false.
     * @throws Throws an error if the authentication type is invalid or the connection fails.
     */
    connect(_a) {
        return __awaiter(this, arguments, void 0, function* ({ slug, type, payload, grantType, kind, autoClose = true, timeout = DEFAULT_CONNECT_TIMEOUT, }) {
            switch (type) {
                case AuthType.OAuth2:
                    return this.oauth({ slug, payload, grantType, kind, autoClose, timeout });
                case AuthType.KeyBased:
                    return this.keybased({ slug, payload, kind });
                default:
                    // client-credentials (M2M) is OAuth2 but carries a payload, so it
                    // must not be mistaken for a key-based connect.
                    if (grantType === GrantType.ClientCredentials)
                        return this.oauth({ slug, payload, grantType, kind, autoClose, timeout });
                    if (payload)
                        return this.keybased({ slug, payload, kind });
                    return this.oauth({ slug, grantType, kind, autoClose, timeout });
            }
        });
    }
    /**
     * Disconnect the specified application and remove any associated data from Refold.
     * @param {String} slug The application slug.
     * @param {AuthType} [type] The authentication type to use. If not provided, it'll remove all the connected accounts.
     * @param {ConnectorKind} [kind] The connector kind (from the app object). Pass it to skip the lookup.
     * @returns {Promise<unknown>}
     */
    disconnect(slug, type, kind) {
        return __awaiter(this, void 0, void 0, function* () {
            // Universal connectors revoke through their own endpoint.
            const isConnector = yield this.isUniversalConnector(slug, kind);
            const res = isConnector
                ? yield fetch(`${this.universalConnectorUrl(slug)}/revoke`, {
                    method: "POST",
                    headers: {
                        authorization: `Bearer ${this.token}`,
                    },
                })
                : yield fetch(`${this.baseUrl}/api/v1/linked-acc/integration/${slug}${type ? `?auth_type=${type}` : ""}`, {
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
     * @param {Record<string, unknown>} [payload] The payload to be sent in the request body.
     * @returns {Promise<Field>} The specified config field.
     */
    getConfigField(slug, fieldId, workflowId, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield fetch(`${this.baseUrl}/api/v2/public/config/field/${fieldId}${workflowId ? `?workflow_id=${workflowId}` : ""}`, {
                method: "POST",
                headers: {
                    authorization: `Bearer ${this.token}`,
                    "content-type": "application/json",
                    slug,
                },
                body: JSON.stringify(payload || {}),
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
exports.Refold = Refold;
