# Refold Javascript SDK
Refold frontend SDK.

## Install

#### npm
```bash
npm install @refoldai/refold-js
```

#### yarn
```bash
yarn add @refoldai/refold-js
```

## Usage

### Include

#### Browser
```html
<!-- use this if you get an error saying `exports` is not defined. -->
<script>var exports = {};</script>
<!-- use a specific version -->
<script src="https://cdn.jsdelivr.net/npm/@refoldai/refold-js@10.0.0"></script>
<!-- use a version range instead of a specific version -->
<script src="https://cdn.jsdelivr.net/npm/@refoldai/refold-js@10"></script>
<script src="https://cdn.jsdelivr.net/npm/@refoldai/refold-js@10.0"></script>
<!-- omit the version completely to use the latest one -->
<!-- you should NOT use this in production -->
<script src="https://cdn.jsdelivr.net/npm/@refoldai/refold-js"></script>
```

#### Node
```js
import { Refold } from "@refoldai/refold-js";
// or, if you're using CommonJS
const { Refold } = require("@refoldai/refold-js");
```

### Initialize
```js
// initialize with the single-use code from the connect URL (recommended)
const refold = new Refold({
    // the code in the /connect/<code> URL you generated on your backend
    code: "REFOLD_CONNECT_CODE",
    // OPTIONAL: set custom base url for all API requests. only useful if you are hosting Refold on premise.
    baseUrl: "https://refold.example.com/backend",
});

// initialize with a session token
const refold = new Refold({
    // the token you generate for linked accounts using the Refold backend SDK
    token: "REFOLD_SESSION_TOKEN",
});

// Or, initialize without either
const refold = new Refold();
// and you can set the token later.
refold.token = "REFOLD_SESSION_TOKEN";
```

Prefer `code`. It is spent the first time the SDK uses it, so a connect URL that
reaches the wrong person is already worthless — a session token in the same place
stays usable until it expires. The SDK trades the code for a token on its first
request and holds that token in memory only.

# Documentation

- You can read the [SDK documentation here](https://gocobalt.github.io/refold-js).

- [`llms.txt`](https://gocobalt.github.io/refold-js/llms.txt)

  This documentation is also available in [llms.txt](https://llmstxt.org) format, which is a simple markdown standard that LLMs can consume easily.
