// Node's built-in runner — this package ships zero dependencies and keeps it that way.
// Run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { setFlagsFromString } from "node:v8";
import { runInNewContext } from "node:vm";

const { Refold } = createRequire(import.meta.url)("./refold.js");

/** Stubs fetch, recording every call, so the exchange can be observed without a server. */
function stubFetch(handler) {
    const calls = [];
    globalThis.fetch = async (url, init = {}) => {
        calls.push({ url: String(url), init });
        return handler(String(url), init);
    };
    return calls;
}

const ok = (body) => ({ status: 200, json: async () => body });

// Exchanges are shared per code across the whole module, so every test spends a code of its own.

test("exchanges a code for a session token before the first request", async () => {
    const calls = stubFetch((url) =>
        url.includes("/connect-code/exchange") ? ok({ token: "session-jwt" }) : ok([]));

    const refold = new Refold({ code: "code-1" });
    await refold.getApps();

    assert.equal(calls.length, 2);
    assert.match(calls[0].url, /\/api\/v2\/public\/connect-code\/exchange$/);
    assert.equal(calls[0].init.method, "POST");
    const body = JSON.parse(calls[0].init.body);
    assert.equal(body.code, "code-1");
    // Proves the retry is ours and only ours: a different browser presents a different id.
    assert.match(body.claim_id, /^[0-9a-f-]{32,36}$/);
    assert.equal(calls[1].init.headers.authorization, "Bearer session-jwt");
    assert.equal(refold.token, "session-jwt");
});

test("sends no credential of its own when claiming the code", async () => {
    const calls = stubFetch((url) =>
        url.includes("/connect-code/exchange") ? ok({ token: "session-jwt" }) : ok([]));

    await new Refold({ code: "code-2" }).getApps();

    // Possession of the code is the credential; an API key must never reach the browser.
    assert.equal(calls[0].init.headers.authorization, undefined);
});

test("spends the code once even when several calls race", async () => {
    const calls = stubFetch((url) =>
        url.includes("/connect-code/exchange") ? ok({ token: "session-jwt" }) : ok([]));

    const refold = new Refold({ code: "code-3" });
    await Promise.all([ refold.getApps(), refold.getApps(), refold.getApps() ]);

    const exchanges = calls.filter(c => c.url.includes("/connect-code/exchange"));
    assert.equal(exchanges.length, 1);
});

test("instances given the same code share one exchange", async () => {
    // Apps that build an instance per render or per call, and React StrictMode constructing twice,
    // would otherwise spend the code on the first instance and fail on every later one.
    const calls = stubFetch((url) =>
        url.includes("/connect-code/exchange") ? ok({ token: "session-jwt" }) : ok([]));

    const first = new Refold({ code: "shared-code" });
    const second = new Refold({ code: "shared-code" });
    await Promise.all([ first.getApps(), second.getApps() ]);
    const later = new Refold({ code: "shared-code" });
    await later.getApps();

    assert.equal(calls.filter(c => c.url.includes("/connect-code/exchange")).length, 1);
    for (const refold of [ first, second, later ]) assert.equal(refold.token, "session-jwt");
});

test("keeps the session token in memory, never in browser storage", async () => {
    stubFetch((url) => url.includes("/connect-code/exchange") ? ok({ token: "session-jwt" }) : ok([]));
    const written = [];
    const store = { setItem: (k, v) => written.push([ k, v ]), getItem: () => null, removeItem: () => {} };
    globalThis.localStorage = store;
    globalThis.sessionStorage = store;

    try {
        await new Refold({ code: "code-4" }).getApps();
        assert.deepEqual(written, []);
    } finally {
        delete globalThis.localStorage;
        delete globalThis.sessionStorage;
    }
});

test("exchanges up front, so connect() does not open a popup behind a round-trip", async () => {
    // Browsers drop user activation across a network hop. connect() calls window.open straight
    // after its request, so the exchange must already be done by the time anyone clicks.
    const calls = stubFetch(() => ok({ token: "session-jwt" }));

    new Refold({ code: "code-5" });
    await new Promise(r => setImmediate(r));

    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /\/connect-code\/exchange$/);
});

test("retries with the same claim id, so the exchange recognises us", async () => {
    let attempt = 0;
    const calls = stubFetch((url) => {
        if (!url.includes("/connect-code/exchange")) return ok([]);
        if (attempt++ === 0) throw new Error("network down");
        return ok({ token: "session-jwt" });
    });

    const refold = new Refold({ code: "code-6" });
    await assert.rejects(refold.getApps(), /network down/);
    await refold.getApps();

    const exchanges = calls.filter(c => c.url.includes("/connect-code/exchange"));
    assert.equal(JSON.parse(exchanges[1].init.body).claim_id, JSON.parse(exchanges[0].init.body).claim_id);
});

test("reports the status when the exchange is misrouted and returns HTML", async () => {
    // A gateway missing the connect-code rule serves an HTML 404. Parsing that as JSON would
    // surface "Unexpected token <" and send the integrator hunting the wrong problem.
    stubFetch(() => ({ status: 404, json: async () => { throw new SyntaxError("Unexpected token <"); } }));

    await assert.rejects(new Refold({ code: "code-7" }).getApps(), (err) => {
        assert.equal(err.code, "EXCHANGE_FAILED");
        assert.equal(err.status, 404);
        assert.match(err.message, /HTTP 404/);
        return true;
    });
});

test("rejects a 200 that carries no session token", async () => {
    stubFetch((url) => url.includes("/connect-code/exchange") ? ok({}) : ok([]));

    await assert.rejects(new Refold({ code: "code-8" }).getApps(), (err) => {
        assert.equal(err.code, "EXCHANGE_FAILED");
        return true;
    });
});

test("uses a raw token as before, with no exchange", async () => {
    const calls = stubFetch(() => ok([]));

    await new Refold({ token: "raw-jwt" }).getApps();

    assert.equal(calls.length, 1);
    assert.equal(calls[0].init.headers.authorization, "Bearer raw-jwt");
});

test("prefers an explicit token over a code", async () => {
    const calls = stubFetch(() => ok([]));

    await new Refold({ token: "raw-jwt", code: "code-10" }).getApps();

    assert.equal(calls.filter(c => c.url.includes("/connect-code/exchange")).length, 0);
    assert.equal(calls[0].init.headers.authorization, "Bearer raw-jwt");
});

test("honours a token assigned after construction", async () => {
    const calls = stubFetch(() => ok([]));

    const refold = new Refold();
    refold.token = "late-jwt";
    await refold.getApps();

    assert.equal(calls[0].init.headers.authorization, "Bearer late-jwt");
});

test("surfaces the server's error when the code is spent or expired", async () => {
    stubFetch(() => ({ status: 400, json: async () => ({ error: "INVALID_TOKEN" }) }));

    await assert.rejects(
        new Refold({ code: "spent" }).getApps(),
        (err) => err.error === "INVALID_TOKEN",
    );
});

test("does not cache a failed exchange, so a network blip is retryable", async () => {
    let attempt = 0;
    const calls = stubFetch((url) => {
        if (!url.includes("/connect-code/exchange")) return ok([]);
        if (attempt++ === 0) throw new Error("network down");
        return ok({ token: "session-jwt" });
    });

    const refold = new Refold({ code: "code-13" });
    await assert.rejects(refold.getApps(), /network down/);
    await refold.getApps();

    assert.equal(calls.filter(c => c.url.includes("/connect-code/exchange")).length, 2);
    assert.equal(refold.token, "session-jwt");
});

/** A getToken callback that hands out tokens from a list and counts its calls. */
function tokenSource(...tokens) {
    const getToken = async () => {
        getToken.calls++;
        return tokens.shift();
    };
    getToken.calls = 0;
    return getToken;
}

const unauthorized = () => ({ status: 401, json: async () => ({ message: "Token Expired" }) });

test("getToken: fetches up front and shares that call with the first requests", async () => {
    const calls = stubFetch(() => ok([]));
    const getToken = tokenSource({ access_token: "rfat_1", expires_in: 900 });

    const refold = new Refold({ getToken });
    await Promise.all([ refold.getApps(), refold.getApps() ]);

    assert.equal(getToken.calls, 1);
    for (const call of calls) assert.equal(call.init.headers.authorization, "Bearer rfat_1");
});

test("getToken: an expired token is replaced before the request goes out", async (t) => {
    let now = 1_000_000;
    t.mock.method(Date, "now", () => now);
    const calls = stubFetch(() => ok([]));
    const getToken = tokenSource({ access_token: "rfat_1", expires_in: 900 }, { access_token: "rfat_2", expires_in: 900 });

    const refold = new Refold({ getToken });
    await refold.getApps();
    now += 900e3;
    await refold.getApps();

    assert.equal(getToken.calls, 2);
    assert.equal(calls[1].init.headers.authorization, "Bearer rfat_2");
});

test("getToken: near expiry, the request keeps the current token while the next one is fetched", async (t) => {
    // Awaiting the refresh would put a round-trip between the click and connect()'s popup.
    let now = 1_000_000;
    t.mock.method(Date, "now", () => now);
    const calls = stubFetch(() => ok([]));
    const getToken = tokenSource({ access_token: "rfat_1", expires_in: 900 }, { access_token: "rfat_2", expires_in: 900 });

    const refold = new Refold({ getToken });
    await refold.getApps();
    now += 870e3;
    await refold.getApps();
    await refold.getApps();

    assert.equal(getToken.calls, 2);
    assert.equal(calls[1].init.headers.authorization, "Bearer rfat_1");
    assert.equal(calls[2].init.headers.authorization, "Bearer rfat_2");
});

/** Lets a timer's refresh, and the getToken promise it starts, settle. */
const settle = () => new Promise(setImmediate);

test("getToken: an idle page has a fresh token ready, so connect() waits on no getToken call", async (t) => {
    t.mock.timers.enable({ apis: [ "setTimeout", "Date" ] });
    const calls = stubFetch(() => ok([]));
    const getToken = tokenSource({ access_token: "rfat_1", expires_in: 900 }, { access_token: "rfat_2", expires_in: 900 });

    const refold = new Refold({ getToken });
    await refold.getApps();
    t.mock.timers.tick(840e3);
    await settle();
    assert.equal(getToken.calls, 2);

    t.mock.timers.tick(360e3);
    await refold.getApps();

    assert.equal(getToken.calls, 2);
    assert.equal(calls[1].init.headers.authorization, "Bearer rfat_2");
});

test("getToken: an instance the app drops stops refreshing", async (t) => {
    setFlagsFromString("--expose-gc");
    const gc = runInNewContext("gc");
    t.mock.timers.enable({ apis: [ "setTimeout" ] });
    stubFetch(() => ok([]));
    const getToken = tokenSource({ access_token: "rfat_1", expires_in: 900 }, { access_token: "rfat_2", expires_in: 900 });

    await new Refold({ getToken }).getApps();
    await settle();
    gc();
    t.mock.timers.tick(840e3);
    await settle();

    assert.equal(getToken.calls, 1);
});

test("getToken: a token outliving the longest timer delay isn't refreshed in a loop", async () => {
    stubFetch(() => ok([]));
    const getToken = tokenSource(...Array(20).fill({ access_token: "rfat_1", expires_in: 30 * 86400 }));

    await new Refold({ getToken }).getApps();
    await new Promise((resolve) => setTimeout(resolve, 50));

    assert.equal(getToken.calls, 1);
});

test("getToken: a 401 gets a new token and one retry, never a loop", async () => {
    const calls = stubFetch(() => unauthorized());
    const getToken = tokenSource({ access_token: "rfat_1" }, { access_token: "rfat_2" }, { access_token: "rfat_3" });

    await assert.rejects(new Refold({ getToken }).getApps(), (err) => err.message === "Token Expired");

    assert.equal(getToken.calls, 2);
    assert.deepEqual(calls.map(c => c.init.headers.authorization), [ "Bearer rfat_1", "Bearer rfat_2" ]);
});

test("getToken: the retry succeeds with the new token and resends the same request", async () => {
    const calls = stubFetch((_url, init) =>
        init.headers.authorization === "Bearer revoked" ? unauthorized() : ok({ config_id: "c1" }));
    const getToken = tokenSource({ access_token: "rfat_2", expires_in: 900 });

    // A token passed alongside getToken is used first; getToken only replaces it.
    const refold = new Refold({ token: "revoked", getToken });
    const config = await refold.updateConfig({ slug: "hubspot", config_id: "c1", fields: {}, workflows: [] });

    assert.deepEqual(config, { config_id: "c1" });
    assert.equal(getToken.calls, 1);
    assert.equal(calls[1].init.method, calls[0].init.method);
    assert.equal(calls[1].init.body, calls[0].init.body);
});

test("getToken: requests rejected together share one new token", async () => {
    const calls = stubFetch((_url, init) => init.headers.authorization === "Bearer rfat_1" ? unauthorized() : ok([]));
    const getToken = tokenSource({ access_token: "rfat_1" }, { access_token: "rfat_2" }, { access_token: "rfat_3" });

    const refold = new Refold({ getToken });
    await Promise.all([ refold.getApps(), refold.getApps(), refold.getApps() ]);

    assert.equal(getToken.calls, 2);
    assert.equal(calls.filter(c => c.init.headers.authorization === "Bearer rfat_2").length, 3);
});

test("getToken: a 401 landing after another request's refresh retries with that token", async () => {
    let releaseFirst;
    const firstHeld = new Promise((resolve) => { releaseFirst = resolve; });
    let rejected = 0;
    const calls = stubFetch(async (_url, init) => {
        if (init.headers.authorization !== "Bearer rfat_1") return ok([]);
        // The first request's 401 is held until the second has refreshed and finished.
        if (rejected++ === 0) await firstHeld;
        return unauthorized();
    });
    const getToken = tokenSource({ access_token: "rfat_1" }, { access_token: "rfat_2" }, { access_token: "rfat_3" });

    const refold = new Refold({ getToken });
    const first = refold.getApps();
    await refold.getApps();
    releaseFirst();
    await first;

    assert.equal(getToken.calls, 2);
    assert.equal(calls.filter(c => c.init.headers.authorization === "Bearer rfat_2").length, 2);
});

test("getToken: a failed call is not kept, so the next request asks again", async () => {
    stubFetch(() => ok([]));
    let attempt = 0;
    const getToken = async () => {
        if (attempt++ === 0) throw new Error("backend down");
        return { access_token: "rfat_1" };
    };

    const refold = new Refold({ getToken });
    await assert.rejects(refold.getApps(), /backend down/);
    await refold.getApps();

    assert.equal(refold.token, "rfat_1");
});

test("getToken: a response without access_token is an error, not an empty bearer", async () => {
    const calls = stubFetch(() => ok([]));

    await assert.rejects(new Refold({ getToken: async () => ({}) }).getApps(), (err) => err.code === "GET_TOKEN_FAILED");
    assert.equal(calls.length, 0);
});

test("getToken: supersedes a code, which is never spent", async () => {
    const calls = stubFetch(() => ok([]));

    await new Refold({ code: "code-14", getToken: tokenSource({ access_token: "rfat_1" }) }).getApps();

    assert.equal(calls.filter(c => c.url.includes("/connect-code/exchange")).length, 0);
    assert.equal(calls[0].init.headers.authorization, "Bearer rfat_1");
});

test("without getToken, a 401 is thrown as before, with no retry", async () => {
    const calls = stubFetch(() => unauthorized());

    await assert.rejects(new Refold({ token: "raw-jwt" }).getApps(), (err) => err.message === "Token Expired");
    assert.equal(calls.length, 1);
});
