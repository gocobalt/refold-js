/**
 * Refold Frontend SDK
 */

export enum AuthType {
    OAuth2 = "oauth2",
    KeyBased = "keybased",
}

/**
 * The auth types a universal connector can offer, as keyed in
 * {@link Application.auth_type_options}. A native application is only ever an
 * {@link AuthType}; a connector names its own and may support several, so the caller has
 * to say which one it is submitting.
 */
export enum ConnectorAuthType {
    OAuth2 = "oauth2",
    ApiKey = "api_key",
    BasicAuth = "basic_auth",
    BearerToken = "bearer_token",
}

export enum AuthStatus {
    Active = "active",
    Expired = "expired",
}

/** The OAuth grant an application uses. Absent ⇒ {@link GrantType.AuthorizationCode}. */
export enum GrantType {
    AuthorizationCode = "authorization_code",
    AuthorizationCodePKCE = "authorization_code_pkce",
    ClientCredentials = "client_credentials",
}

/** An application in Refold. */
/**
 * What kind of connector an application is. Universal connectors are configured in
 * Refold rather than shipped as native integrations, and authenticate through their
 * own endpoints — {@link Refold.connect} and {@link Refold.disconnect} route on this.
 */
export type ConnectorKind = "native" | "custom" | "universal_connector";

export interface Application {
    /** Application ID */
    app_id: string;
    /** Whether this is a native app, a custom app, or a universal connector. */
    kind?: ConnectorKind;
    /**The application name. */
    name: string;
    /**The application description. */
    description: string;
    /**The application icon. */
    icon: string;
    /**
     * @deprecated Use `slug` instead.
     * The application slug for native apps and `custom` for custom apps.
     */
    type: string | "custom";
    /** The application slug. */
    slug: string;
    /** The categories/tags for the application. */
    tags?: string[];
    /**
     * OAuth grant type. Absent ⇒ {@link GrantType.AuthorizationCode}. Pass this
     * to {@link Refold.connect} as {@link OAuthParams.grantType}; for
     * {@link GrantType.ClientCredentials} (machine-to-machine) `connect()` routes
     * to the OAuth path regardless of `type`, submits the fields to the server,
     * and opens no browser window.
     */
    grant_type?: GrantType;
    /** The supported auth types for the application, and the fields required from the user to connect the application. */
    auth_type_options?: {
        /**
         * The fields required from the user to connect the application, keyed by auth
         * type. Native apps use {@link AuthType} (`oauth2` / `keybased`); universal
         * connectors key by their own {@link ConnectorAuthType} (`api_key`,
         * `basic_auth`, `bearer_token`, `oauth2`) and may offer several for the user to
         * choose from. Keys are optional because which ones appear depends on the kind.
         */
        [authType in AuthType | ConnectorAuthType]?: InputField[];
    };
    /** The list of connected accounts for this application */
    connected_accounts?: {
        /** The identifier (username, email, etc.) of the connected account. */
        identifier: unknown;
        /** The auth type used to connect the account. */
        auth_type: AuthType;
        /** The timestamp at which the account was connected. */
        connectedAt: string;
        /** The current status of the connection. */
        status?: AuthStatus;
    }[];
    /**
     * The type of auth used by application.
     * @deprecated Check `auth_type_options` and `connected_accounts` for multiple auth types support.
     */
    auth_type: "oauth2" | "keybased";
    /**
     * Whether the user has connected the application.
     * @deprecated Check `connected_accounts` for multiple auth types support.
     */
    connected?: boolean;
    /**
     * Whether the connection has expired and re-auth is required.
     * @deprecated Check `connected_accounts` for multiple auth types support.
     */
    reauth_required?: boolean;
    /**
     * The fields required from the user to connect the application (for `keybased` auth type).
     * @deprecated Check `auth_type_options` for multiple auth types support.
     */
    auth_input_map?: InputField[];
}

/** An Input field to take input from the user. */
export interface InputField  {
    /** Key name of the field. */
    name: string;
    /** Input type of the field. */
    type: string;
    /** Whether the field is required. */
    required: boolean;
    /** Whether the field accepts multiple values. */
    multiple?: boolean;
    /** The placeholder of the field. */
    placeholder: string;
    /** The label of the field. */
    label: string;
    /** The help text for the field. */
    help_text?: string;
    /** The options for the field. */
    options?: {
        name?: string;
        value: string;
    }[];
}

export interface OAuthParams {
    /** The application slug. */
    slug: string;
    /** The key value pairs of auth data. */
    payload?: Record<string, string>;
    /**
     * The application's OAuth grant (from the app object). Pass
     * {@link GrantType.ClientCredentials} for machine-to-machine connectors so
     * their fields are submitted to the server and no browser window is opened.
     * Omit for redirect grants (authorization_code / PKCE), the default.
     */
    grantType?: GrantType;
    /** Whether to close the authentication window automatically. */
    autoClose?: boolean;
    /** Maximum time in milliseconds to wait for authentication before giving up. Set to `0` to wait indefinitely. Defaults to 5 minutes. */
    timeout?: number;
}

export interface KeyBasedParams {
    /** The application slug. */
    slug: string;
    /** The key value pairs of auth data. */
    payload?: Record<string, string>;
    /**
     * The auth type being submitted, as named by the application's
     * {@link Application.auth_type_options}. Universal connectors distinguish
     * `api_key` / `basic_auth` / `bearer_token`, so a connector offering more than one
     * cannot be resolved from the credentials alone.
     */
    authType?: AuthType | ConnectorAuthType;
}

export interface ConnectParams extends OAuthParams {
    /**
     * The authentication type to use — an {@link AuthType} for native applications, or
     * one of a universal connector's own types (a key of
     * {@link Application.auth_type_options}). If not provided, it defaults to `keybased`
     * when a payload is given, otherwise `oauth2`.
     */
    type?: AuthType | ConnectorAuthType;
}

/** The payload object for config. */
export interface ConfigPayload {
    /** The application slug. */
    slug: string;
    /**  Unique ID for the config. */
    config_id?: string;
    /** The dynamic label mappings. */
    labels?: Label[];
}

/** Label Mapping */
export interface Label {
    /** The label name. */
    name: string;
    /** The label value. */
    value: string | number | boolean;
}

/** The configuration data for an application. */
export interface UpdateConfigPayload {
    /** The application slug */
    slug: string;
    /** Unique ID for the config. */
    config_id?: string;
    /** A map of application fields and their values. */
    fields: Record<string, string | number | boolean>;
    /** The config workflows data. */
    workflows: WorkflowPayload[];
}

/** The workflow. */
export interface WorkflowPayload  {
    /** The ID of the workflow. */
    id: string;
    /** Whether the workflow is enabled. */
    enabled: boolean;
    /** A map of workflow field names and their values. */
    fields: Record<string, string | number | boolean>;
}

/** The payload object for toggling a config workflow. */
export interface ToggleConfigWorkflowPayload {
    /** The application slug. */
    slug: string;
    /** Unique ID for the config. */
    config_id: string;
    /** Unique ID for the workflow. */
    workflow_id: string;
    /** Whether the workflow should be enabled. */
    enabled: boolean;
}

export interface RefoldOptions {
    /** The base URL of the Refold API. You don't need to set this. */
    baseUrl?: string;
    /** The session token. */
    token?: string;
    /**
     * The single-use code from a connect URL, traded for a session token on the first request.
     * Prefer this over `token`: a code that reaches the wrong person is already spent, whereas a
     * token stays usable until it expires. Ignored if `token` is also given.
     */
    code?: string;
}

export interface RuleOptions {
    rule_column: {
        rhs: {
            name: string,
            type: "text" | "select",
            options?: Label[],
        },
        operator: {
            name: string,
            type: "select",
            options: Label[],
        },
    },
    conditional_code_stdout?: string[],
    error?: {
        message?: string,
        stack?: string
    }
}

/** A public workflow in Refold. */
export interface PublicWorkflow {
    /**The workflow ID. */
    _id: string;
    /**The workflow name. */
    name: string;
    /**The workflow description. */
    description?: string;
    /**The application's slug in which this workflow exists. */
    slug?: string;
    /**The workflow created at. */
    createdAt: string;
    /**The workflow updated at. */
    updatedAt: string;
    /**Whether the workflow is published. */
    published: boolean;
}

/** The payload for creating a public workflow for the linked account. */
export interface PublicWorkflowPayload {
    /**The workflow name. */
    name: string;
    /**The workflow description. */
    description?: string;
    /** The application slug in which this workflow should be created. */
    slug?: string;
}

/** Parameters for filtering and paginating the list of workflows. */
export interface PublicWorkflowsPayload extends PaginationProps {
    /** Filter workflows by the application slug. */
    slug?: string;
    /** Filter workflows by name (partial match). */
    name?: string;
    /** Filter workflows created on or after this ISO 8601 date string. */
    start_date?: string;
    /** Filter workflows created on or before this ISO 8601 date string. */
    end_date?: string;
    /** Filter by workflow published status. `true` returns only published workflows, `false` returns only drafts. */
    published?: boolean;
    /** Any additional filter keys supported by the API. */
    [key: string]: string | number | boolean | undefined;
}

interface PaginationProps {
    page?: number;
    limit?: number;
}

/** The current status of a workflow execution. */
export type ExecutionStatus = "COMPLETED" | "RUNNING" | "ERRORED" | "STOPPED" | "STOPPING" | "TIMED_OUT";
/** The trigger source that initiated a workflow execution. */
export type ExecutionSource = "Event" | "Schedule" | "API Call";
/** Whether a workflow execution runs synchronously (waits for result) or asynchronously (fire-and-forget). */
export type ExecutionType = "SYNC" | "ASYNC";

/** Filters for narrowing down the list of workflow executions. */
export interface ExecutionFilters {
    /** Filter executions by their current status. */
    status?: ExecutionStatus;
    /** Filter executions by workflow name (partial match). */
    workflow_name?: string;
    /** Filter executions by workflow ID. */
    workflow_id?: string;
    /** Filter executions that started on or after this ISO 8601 date string. */
    start_date?: string;
    /** Filter executions that started on or before this ISO 8601 date string. */
    end_date?: string;
    /** Filter by how the execution was invoked — synchronously or asynchronously. */
    execution_type?: ExecutionType;
    /** Filter by the trigger source that initiated the execution. */
    execution_source?: ExecutionSource;
}

/** Parameters for filtering and paginating the list of workflow executions. */
export interface GetExecutionsParams extends PaginationProps, ExecutionFilters {
    /** Any additional filter keys supported by the API. */
    [key: string]: string | number | undefined;
}

interface PaginatedResponse<T> {
    docs: T[];
    totalDocs: number;
    limit: number;
    totalPages: number;
    page: number;
}

export interface Config {
    slug: string;
    config_id?: string;
    fields?: ConfigField[];
    workflows?: ConfigWorkflow[];
    field_errors?: {
        id: string;
        name: string;
        error: {
            message: string;
            error?: unknown;
        };
    }[];
}

export interface ConfigField {
    id: string;
    name: string;
    field_type: "text" | "date" | "number" | "url" | "email" | "textarea" | "select" | "json" | "map" | "map_v2" | "rule_engine" | string;
    options?: {
        name?: string;
        value: string;
    }[];
    parent?: string;
    labels?: {
        name?: string;
        value: string;
    }[];
    multiple?: boolean;
    required?: boolean;
    hidden?: boolean;
    value?: any;
    /** The placeholder for the field. */
    placeholder?: string;
    /** The help text for the field. */
    help_text?: string;
    /** The page this field is associated with. */
    associated_page?: string;
}

export interface ConfigWorkflow {
    id: string;
    name: string;
    description?: string;
    enabled: boolean;
    fields?: ConfigField[];
}

export interface WorkflowPayloadResponse {
    payload: Record<string, any>;
    schema?: unknown;
    schema_interpreted?: unknown;
}

export interface ExecuteWorkflowPayload {
    /**The workflow id or alias. */
    worklfow: string;
    /** The application's slug this workflow belongs to. */
    slug?: string;
    /** The payload to execute the workflow. */
    payload?: Record<string, any>;
    /** Whether to execute the workflow synchronously. */
    sync_execution?: boolean;
}

export interface Execution {
    _id: string;
    id?: string;
    name: string;
    org_id: string;
    associated_application: {
        _id: string;
        name: string;
        icon?: string;
    };
    status: ExecutionStatus;
    associated_workflow: {
        _id: string;
        name: string;
    };
    associated_trigger_application: {
        _id: string;
        name: string;
        icon?: string;
        app_type?: "custom" | string;
        origin_trigger: {
            _id: string;
            name: string;
        }
    };
    trigger_application_event?: string;
    linked_account_id: string;
    environment: "test" | "production";
    config_id: string;
    associated_event_id: string;
    custom_trigger_id?: string;
    custom_application_id?: string;
    completion_percentage?: number;
    nodes?: {
        node_id: string;
        node_name: string;
        node_type: string;
        node_status: "Success" | "Ready" | "Errored" | "Waiting" | "Stopped" | "Rejected"| "Errored_and_Skipped" | "Timed_Out";
        is_batch?: boolean;
        attempts_made: number;
        maximum_attempts: number;
        input_data: unknown;
        latest_output: unknown;
    }[];
    createdAt: string;
}

type Field = any;

/** How often, in milliseconds, connection status is polled during authentication. */
const POLL_INTERVAL = 3e3;
/** How long, in milliseconds, polling continues after the auth window closes or the wait times out, since the connection may complete moments later. */
const POLL_GRACE = 6e3;
/**
 * Identifies one SDK instance to the connect-code exchange. Not a secret — it only proves a retry
 * comes from the same caller — but there is no point emitting a guessable one, so an environment
 * without crypto gets nothing and forgoes the retry instead.
 */
const randomId = (): string | undefined => {
    const c: Crypto | undefined = globalThis.crypto;
    if (typeof c?.randomUUID === "function") return c.randomUUID();
    if (typeof c?.getRandomValues === "function") {
        return Array.from(c.getRandomValues(new Uint8Array(16)), b => (b + 0x100).toString(16).slice(1)).join("");
    }
    return undefined;
};

/** The number of consecutive polling failures tolerated before authentication is aborted. */
const MAX_POLL_FAILURES = 3;
/** The default maximum time, in milliseconds, to wait for authentication. */
const DEFAULT_CONNECT_TIMEOUT = 300e3;

class Refold {
    private baseUrl: string;
    public token: string;
    private code: string;
    private claim?: string;
    private exchange?: Promise<string>;

    /**
     * Refold Frontend SDK
     * @param {Object} options The options to configure the Refold SDK.
     * @param {String} [options.code] The single-use code from a connect URL.
     * @param {String} [options.token] The session token.
     * @param {String} [options.baseUrl=https://app.refold.ai] The base URL of the Refold API.
     */
    constructor(options: RefoldOptions = {}) {
        this.baseUrl = options.baseUrl
            ?   /^https?:\/\//.test(options.baseUrl)
                ?   options.baseUrl
                :   "https://" + options.baseUrl
            :   "https://app.refold.ai";
        this.token = options.token || "";
        this.code = options.code || "";

        if (this.code && !this.token) {
            // Identifies this instance to the exchange, so a request whose response never arrived
            // can be retried by us and only us. Minted before the first attempt, since that is the
            // case it exists for. Without a source of randomness we send nothing rather than
            // something guessable, and simply forgo the retry.
            this.claim = randomId();
            // Exchanged up front, not on the first call. `connect()` opens a popup immediately
            // after its request, and browsers drop user activation across a network round-trip —
            // an exchange in that path gets the popup blocked. Failures are swallowed here and
            // resurfaced on the call that actually needs the token.
            void this.startExchange().catch(() => undefined);
        }
    }

    /**
     * The `Authorization` header every request carries. A code is traded for its session token on
     * first use and the token is then held in memory only, so it never reaches the URL, storage or
     * anywhere else the page can leak it.
     * @private
     */
    private async bearer(): Promise<string> {
        if (!this.token && this.code) this.token = await this.startExchange();
        return `Bearer ${this.token}`;
    }

    /**
     * The one in-flight exchange for this instance. A code is spendable once, so concurrent calls
     * share it rather than race. A failure is not cached — a spent code fails again anyway, while
     * caching the rejection would let one network blip brick the instance for good.
     * @private
     */
    private startExchange(): Promise<string> {
        this.exchange ??= this.exchangeCode(this.code, this.claim).catch(error => {
            this.exchange = undefined;
            throw error;
        });
        return this.exchange;
    }

    /**
     * Claims a connect code, which spends it. Unauthenticated by construction — possession of the
     * code is the credential, and the page holding it has nothing else to present.
     * @private
     */
    private async exchangeCode(code: string, claim_id?: string): Promise<string> {
        const res = await fetch(`${this.baseUrl}/api/v2/public/connect-code/exchange`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({ code, claim_id }),
        });

        if (res.status >= 400 && res.status < 600) {
            // Not every failure is the API answering. A misconfigured gateway serves an HTML page,
            // and parsing that as JSON would surface "Unexpected token <" instead of the status.
            throw await res.json().catch(() => Object.assign(
                new Error(`The connect code could not be exchanged (HTTP ${res.status}).`),
                { code: "EXCHANGE_FAILED", status: res.status },
            ));
        }

        const data = await res.json().catch(() => undefined);
        if (!data?.token) {
            throw Object.assign(
                new Error("The connect code exchange returned no session token."),
                { code: "EXCHANGE_FAILED", status: res.status },
            );
        }
        return data.token;
    }

    /**
     * Returns the org & customer details for the associated token.
     * @private
     * @returns {Promise<unknown>}
     */
    public async getAccountDetails(): Promise<unknown> {
        const res = await fetch(`${this.baseUrl}/api/v3/org/basics`, {
            headers: {
                authorization: await this.bearer(),
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
    public async updateAccount(payload: Record<string, unknown>): Promise<unknown> {
        const res = await fetch(`${this.baseUrl}/api/v2/public/linked-account`, {
            method: "PUT",
            headers: {
                authorization: await this.bearer(),
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
     * Returns the list of enabled applications and their details.
     * @returns {Promise<Application[]>} The list of applications.
     */
    public async getApp(): Promise<Application[]>;
    /**
     * Returns the application details for the specified application, provided
     * the application is enabled in Refold.
     * @param {String} slug The application slug.
     * @returns {Promise<Application>} The application details.
     */
    public async getApp(slug: string): Promise<Application>;
    /**
     * Returns the application details for the specified application, provided
     * the application is enabled in Refold. If no application is specified,
     * it returns all the enabled applications.
     * @param {String} [slug] The application slug.
     * @returns {Promise<Application | Application[]>} The application details.
     */
    public async getApp(slug?: string): Promise<Application | Application[]> {
        const res = await fetch(`${this.baseUrl}/api/v2/f-sdk/application${slug ? `/${slug}` : ""}`, {
            headers: {
                authorization: await this.bearer(),
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
    public async getApps(): Promise<Application[]> {
        const res = await fetch(`${this.baseUrl}/api/v2/f-sdk/application`, {
            headers: {
                authorization: await this.bearer(),
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
    private async integrate(
        slug: string,
        params?: Record<string, string>,
        grant?: GrantType,
    ): Promise<{ auth_url?: string; connected?: boolean }> {
        const url = `${this.baseUrl}/api/v1/${slug}/integrate`;
        const res = grant === GrantType.ClientCredentials
            ? await fetch(url, {
                method: "POST",
                headers: {
                    authorization: await this.bearer(),
                    "content-type": "application/json",
                },
                body: JSON.stringify(params ?? {}),
            })
            : await fetch(`${url}?${new URLSearchParams(params).toString()}`, {
                headers: {
                    authorization: await this.bearer(),
                },
            });

        if (res.status >= 400 && res.status < 600) {
            const error = await res.json();
            throw error;
        }

        return await res.json();
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
    private async oauth({
        slug,
        payload,
        grantType,
        autoClose = true,
        timeout = DEFAULT_CONNECT_TIMEOUT,
    }: OAuthParams): Promise<boolean> {
        const data = await this.integrate(slug, payload, grantType);

        // No auth_url ⇒ the server completed the connection without a redirect
        // (client-credentials / M2M); report the outcome it gives us. A response
        // with neither an auth_url nor a connection result is unexpected — surface
        // it rather than silently reporting failure.
        if (!data.auth_url) {
            if (typeof data.connected === "boolean") return data.connected;
            throw Object.assign(
                new Error("The server returned neither an authentication URL nor a connection result."),
                { code: "UNEXPECTED_INTEGRATE_RESPONSE" },
            );
        }

        const connectWindow = window.open(data.auth_url);
        if (!connectWindow) {
            throw Object.assign(
                new Error("The authentication window could not be opened. It may have been blocked by the browser."),
                { code: "POPUP_BLOCKED" },
            );
        }

        const hasActiveOAuthAccount = (app: Application) =>
            Boolean(app?.connected_accounts?.filter(a => a.auth_type === AuthType.OAuth2).some(a => a.status === AuthStatus.Active));

        return new Promise((resolve, reject) => {
            const startedAt = Date.now();
            let inFlight = false;
            let consecutiveFailures = 0;
            let firstFailure: unknown;
            let graceStartedAt: number | undefined;

            // keep checking connection status
            const interval = setInterval(() => {
                const timedOut = timeout > 0 && Date.now() - startedAt >= timeout;
                if (connectWindow.closed || timedOut) {
                    // the connection may complete moments around the window
                    // closing or the wait timing out, so keep polling for a
                    // little longer before giving up
                    if (timedOut && autoClose) connectWindow.close();
                    graceStartedAt ??= Date.now();
                    if (Date.now() - graceStartedAt >= POLL_GRACE) {
                        clearInterval(interval);
                        resolve(false);
                        return;
                    }
                }

                // don't check the status again until the previous check settles
                if (inFlight) return;
                inFlight = true;

                this.getApp(slug)
                .then(app => {
                    inFlight = false;
                    consecutiveFailures = 0;
                    firstFailure = undefined;
                    if (hasActiveOAuthAccount(app)) {
                        // close auth window
                        if (autoClose) connectWindow.close();
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
                    firstFailure ??= e;
                    if (consecutiveFailures >= MAX_POLL_FAILURES) {
                        clearInterval(interval);
                        reject(firstFailure);
                    }
                });
            }, POLL_INTERVAL);
        });
    }

    /**
     * Save auth data for the specified keybased application.
     * @param params - The parameters for key-based auth.
     * @param params.slug - The application slug.
     * @param params.payload - The key value pairs of auth data.
     * @returns {Promise<Boolean>} Whether the auth data was saved successfully.
     */
    private async keybased({
        slug,
        payload,
        authType,
    }: KeyBasedParams): Promise<boolean> {
        // A connector offering several key-based types needs to be told which one; the generic
        // `keybased` is not one of them, so it is not forwarded and an application's body stays
        // exactly the credentials it always was. A connector with a single key-based type has
        // it inferred server-side.
        const connectorAuthType = authType && authType !== AuthType.KeyBased ? authType : undefined;
        const res = await fetch(`${this.baseUrl}/api/v2/app/${slug}/save`, {
            method: "POST",
            headers: {
                authorization: await this.bearer(),
                "content-type": "application/json",
            },
            body: JSON.stringify({
                ...payload,
                ...(connectorAuthType ? { auth_type: connectorAuthType } : {}),
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
     * @param params.type - The authentication type to use. If not provided, it defaults to `keybased` if payload is provided, otherwise `oauth2`.
     * @param params.payload - key-value pairs of authentication data required for the specified auth type.
     * @param params.grantType - The application's OAuth grant. Pass {@link GrantType.ClientCredentials} for machine-to-machine connectors (fields are submitted to the server, no window opens). Omit for redirect grants.
     * @param params.autoClose - Whether to close the authentication window automatically. If not provided, it defaults to `true`.
     * @param params.timeout - Maximum time in milliseconds to wait for authentication before giving up. Only applicable to the OAuth2 flow. Set to `0` to wait indefinitely. If not provided, it defaults to 5 minutes.
     * @returns A promise that resolves to true if the connection was successful, otherwise false.
     * @throws Throws an error if the authentication type is invalid or the connection fails.
     */
    public async connect({
        slug,
        type,
        payload,
        grantType,
        autoClose = true,
        timeout = DEFAULT_CONNECT_TIMEOUT,
    }: ConnectParams): Promise<boolean> {
        switch (type) {
            case AuthType.OAuth2:
                return this.oauth({ slug, payload, grantType, autoClose, timeout });
            case AuthType.KeyBased:
                return this.keybased({ slug, payload, authType: type });
            default:
                // client-credentials (M2M) is OAuth2 but carries a payload, so it
                // must not be mistaken for a key-based connect.
                if (grantType === GrantType.ClientCredentials)
                    return this.oauth({ slug, payload, grantType, autoClose, timeout });
                if (payload) return this.keybased({ slug, payload, authType: type });
                return this.oauth({ slug, grantType, autoClose, timeout });
        }
    }

    /**
     * Disconnect the specified application and remove any associated data from Refold.
     * @param {String} slug The application slug.
     * @param {AuthType} [type] The authentication type to use. If not provided, it'll remove all the connected accounts.
     * @returns {Promise<unknown>}
     */
    public async disconnect(slug: string, type?: AuthType): Promise<unknown> {
        const res = await fetch(`${this.baseUrl}/api/v1/linked-acc/integration/${slug}${type ? `?auth_type=${type}` : ""}`, {
            method: "DELETE",
            headers: {
                authorization: await this.bearer(),
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
    public async config(payload: ConfigPayload): Promise<Config> {
        const res = await fetch(`${this.baseUrl}/api/v2/f-sdk/config`, {
            method: "POST",
            headers: {
                authorization: await this.bearer(),
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
    async getConfigs(slug: string): Promise<{ config_id: string; }[]> {
        const res = await fetch(`${this.baseUrl}/api/v2/public/slug/${slug}/configs`, {
            headers: {
                authorization: await this.bearer(),
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
    async getConfig(slug: string, configId: string, excludeOptions?: boolean): Promise<Config> {
        const res = await fetch(`${this.baseUrl}/api/v2/f-sdk/slug/${slug}/config${configId ? `/${configId}` : ""}`, {
            headers: {
                authorization: await this.bearer(),
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
    async updateConfig(payload: UpdateConfigPayload): Promise<Config> {
        const res = await fetch(`${this.baseUrl}/api/v2/f-sdk/config`, {
            method: "PUT",
            headers: {
                authorization: await this.bearer(),
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
    async deleteConfig(slug: string, configId?: string): Promise<unknown> {
        const res = await fetch(`${this.baseUrl}/api/v2/f-sdk/slug/${slug}/config${configId ? `/${configId}` : ""}`, {
            method: "DELETE",
            headers: {
                authorization: await this.bearer(),
            },
        });

        if (res.status >= 400 && res.status < 600) {
            const error = await res.json();
            throw error;
        }

        return await res.json();
    }

    /**
     * Enables or disables a single workflow within a config, without re-installing the config.
     * @param {ToggleConfigWorkflowPayload} payload The toggle payload.
     * @returns {Promise<ConfigWorkflow[]>} The updated list of workflows in the config.
     */
    async toggleConfigWorkflow(payload: ToggleConfigWorkflowPayload): Promise<ConfigWorkflow[]> {
        const { slug, config_id, workflow_id, enabled } = payload;
        const res = await fetch(`${this.baseUrl}/api/v2/public/slug/${slug}/config/${config_id}/workflows/${workflow_id}`, {
            method: "PATCH",
            headers: {
                authorization: await this.bearer(),
                "content-type": "application/json",
            },
            body: JSON.stringify({ enabled }),
        });

        if (res.status >= 400 && res.status < 600) {
            const error = await res.json();
            throw error;
        }

        const data: { workflows: ConfigWorkflow[]; } = await res.json();
        return data.workflows;
    }

    /**
     * Returns the specified field of the config.
     * @param {String} slug The application slug.
     * @param {String} fieldId The unique ID of the field.
     * @param {String} [workflowId] The unique ID of the workflow.
     * @param {Record<string, unknown>} [payload] The payload to be sent in the request body.
     * @returns {Promise<Field>} The specified config field.
     */
    async getConfigField(slug: string, fieldId: string, workflowId?: string, payload?: Record<string, unknown>): Promise<Config> {
        const res = await fetch(`${this.baseUrl}/api/v2/public/config/field/${fieldId}${workflowId ? `?workflow_id=${workflowId}` : ""}`, {
            method: "POST",
            headers: {
                authorization: await this.bearer(),
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
    async updateConfigField(slug: string, fieldId: string, value: string | number | boolean | null, workflowId?: string): Promise<Config> {
        const res = await fetch(`${this.baseUrl}/api/v2/public/config/field/${fieldId}${workflowId ? `?workflow_id=${workflowId}` : ""}`, {
            method: "PUT",
            headers: {
                authorization: await this.bearer(),
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
    async deleteConfigField(slug: string, fieldId: string, workflowId?: string): Promise<unknown> {
        const res = await fetch(`${this.baseUrl}/api/v2/public/config/field/${fieldId}${workflowId ? `?workflow_id=${workflowId}` : ""}`, {
            method: "DELETE",
            headers: {
                authorization: await this.bearer(),
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
    async getFieldOptions(lhs: string, slug: string, fieldId: string, workflowId?: string): Promise<RuleOptions> {
        const res = await fetch(`${this.baseUrl}/api/v2/public/config/rule-engine/${fieldId}${workflowId ? `?workflow_id=${workflowId}` : ""}`, {
            method: "POST",
            headers: {
                authorization: await this.bearer(),
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
    async getWorkflows({ page = 1, limit = 100, ...rest }: PublicWorkflowsPayload = {}): Promise<PaginatedResponse<PublicWorkflow>> {
        const query = new URLSearchParams({ page: String(page), limit: String(limit) });
        for (const key of Object.keys(rest)) {
            const value = rest[key];
            if (value !== undefined && value !== "") query.set(key, String(value));
        }

        const res = await fetch(`${this.baseUrl}/api/v2/public/workflow?${query}`, {
            headers: {
                authorization: await this.bearer(),
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
    async createWorkflow(params: PublicWorkflowPayload): Promise<PublicWorkflow> {
        const res = await fetch(`${this.baseUrl}/api/v2/public/workflow`, {
            method: "POST",
            headers: {
                authorization: await this.bearer(),
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
    async deleteWorkflow(workflowId: string): Promise<unknown> {
        const res = await fetch(`${this.baseUrl}/api/v2/public/workflow/${workflowId}`, {
            method: "DELETE",
            headers: {
                authorization: await this.bearer(),
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
    async getWorkflowPayload(workflowId: string): Promise<WorkflowPayloadResponse> {
        const res = await fetch(`${this.baseUrl}/api/v2/public/workflow/request-structure/${workflowId}`, {
            headers: {
                authorization: await this.bearer(),
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
    async executeWorkflow(options: ExecuteWorkflowPayload): Promise<unknown> {
        const res = await fetch(`${this.baseUrl}/api/v2/public/workflow/${options?.worklfow}/execute`, {
            method: "POST",
            headers: {
                authorization: await this.bearer(),
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
    async getExecutions({ page = 1, limit = 10, ...rest }: GetExecutionsParams = {}): Promise<PaginatedResponse<Execution>> {
        const query = new URLSearchParams({ page: String(page), limit: String(limit) });
        for (const key of Object.keys(rest)) {
            const value = rest[key];
            if (value !== undefined && value !== "") query.set(key, String(value));
        }

        const res = await fetch(`${this.baseUrl}/api/v2/public/execution?${query}`, {
            headers: {
                authorization: await this.bearer(),
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
    async getExecution(executionId: string): Promise<Execution> {
        const res = await fetch(`${this.baseUrl}/api/v2/public/execution/${executionId}`, {
            headers: {
                authorization: await this.bearer(),
            },
        });

        if (res.status >= 400 && res.status < 600) {
            const error = await res.json();
            throw error;
        }

        return await res.json();
    }
}

export { Refold };
