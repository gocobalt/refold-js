// Node's built-in runner — this package ships zero dependencies and keeps it that way.
// Run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

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

test("exchanges a code for a session token before the first request", async () => {
    const calls = stubFetch((url) =>
        url.includes("/connect-code/exchange") ? ok({ token: "session-jwt" }) : ok([]));

    const refold = new Refold({ code: "the-code" });
    await refold.getApps();

    assert.equal(calls.length, 2);
    assert.match(calls[0].url, /\/api\/v2\/public\/connect-code\/exchange$/);
    assert.equal(calls[0].init.method, "POST");
    const body = JSON.parse(calls[0].init.body);
    assert.equal(body.code, "the-code");
    // Proves the retry is ours and only ours: a different browser presents a different id.
    assert.match(body.claim_id, /^[0-9a-f-]{32,36}$/);
    assert.equal(calls[1].init.headers.authorization, "Bearer session-jwt");
    assert.equal(refold.token, "session-jwt");
});

test("sends no credential of its own when claiming the code", async () => {
    const calls = stubFetch((url) =>
        url.includes("/connect-code/exchange") ? ok({ token: "session-jwt" }) : ok([]));

    await new Refold({ code: "the-code" }).getApps();

    // Possession of the code is the credential; an API key must never reach the browser.
    assert.equal(calls[0].init.headers.authorization, undefined);
});

test("spends the code once even when several calls race", async () => {
    const calls = stubFetch((url) =>
        url.includes("/connect-code/exchange") ? ok({ token: "session-jwt" }) : ok([]));

    const refold = new Refold({ code: "the-code" });
    await Promise.all([ refold.getApps(), refold.getApps(), refold.getApps() ]);

    const exchanges = calls.filter(c => c.url.includes("/connect-code/exchange"));
    assert.equal(exchanges.length, 1);
});

test("keeps the session token in memory, never in browser storage", async () => {
    stubFetch((url) => url.includes("/connect-code/exchange") ? ok({ token: "session-jwt" }) : ok([]));
    const written = [];
    const store = { setItem: (k, v) => written.push([ k, v ]), getItem: () => null, removeItem: () => {} };
    globalThis.localStorage = store;
    globalThis.sessionStorage = store;

    try {
        await new Refold({ code: "the-code" }).getApps();
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

    new Refold({ code: "the-code" });
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

    const refold = new Refold({ code: "the-code" });
    await assert.rejects(refold.getApps(), /network down/);
    await refold.getApps();

    const exchanges = calls.filter(c => c.url.includes("/connect-code/exchange"));
    assert.equal(JSON.parse(exchanges[1].init.body).claim_id, JSON.parse(exchanges[0].init.body).claim_id);
});

test("reports the status when the exchange is misrouted and returns HTML", async () => {
    // A gateway missing the connect-code rule serves an HTML 404. Parsing that as JSON would
    // surface "Unexpected token <" and send the integrator hunting the wrong problem.
    stubFetch(() => ({ status: 404, json: async () => { throw new SyntaxError("Unexpected token <"); } }));

    await assert.rejects(new Refold({ code: "x" }).getApps(), (err) => {
        assert.equal(err.code, "EXCHANGE_FAILED");
        assert.equal(err.status, 404);
        assert.match(err.message, /HTTP 404/);
        return true;
    });
});

test("rejects a 200 that carries no session token", async () => {
    stubFetch((url) => url.includes("/connect-code/exchange") ? ok({}) : ok([]));

    await assert.rejects(new Refold({ code: "x" }).getApps(), (err) => {
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

    await new Refold({ token: "raw-jwt", code: "the-code" }).getApps();

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

    const refold = new Refold({ code: "the-code" });
    await assert.rejects(refold.getApps(), /network down/);
    await refold.getApps();

    assert.equal(calls.filter(c => c.url.includes("/connect-code/exchange")).length, 2);
    assert.equal(refold.token, "session-jwt");
});
