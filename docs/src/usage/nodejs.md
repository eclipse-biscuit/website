# NodeJS

The NodeJS version of Biscuit can be found on [Github](https://github.com/eclipse-biscuit/biscuit-wasm),
and on [NPM](https://www.npmjs.com/package/@biscuit-auth/biscuit-wasm). It wraps the
[Biscuit Rust library](https://github.com/eclipse-biscuit/biscuit-rust) in WebAssembly, and it
provides both CommonJS and EcmaScript module interfaces.

⚠️ support for WebAssembly modules in NodeJS is disabled by default and needs to be explicitly enabled with a command-line flag: `node --experimental-wasm-modules index.js`.


The methods that can fail (like `Authorizer.authorize()`) will throw an exception, containing a
copy of the [Rust library error](https://docs.rs/biscuit-auth/latest/biscuit_auth/error/enum.Token.html)
deserialized from JSON.

## Install

In `package.json`:

```json
{
    "dependencies": {
        "@biscuit-auth/biscuit-wasm": "0.4.0"
    }
}
```

⚠️ Due to some WASM-side dependencies, NodeJS versions before v19 require the following:

```js
import { webcrypto } from 'node:crypto';
globalThis.crypto = webcrypto;
```

## Create a root key

```javascript
const { KeyPair } = require('@biscuit-auth/biscuit-wasm');

const root = new KeyPair();
```

## Create a token

```javascript
const { biscuit, PrivateKey } = require('@biscuit-auth/biscuit-wasm');

const userId = "1234";
// a token can be created from a datalog snippet
const builder = biscuit`
  user(${userId});
  check if resource("file1");
`;

// facts, checks and rules can be added one by one on an existing builder.
for (let right of ["read", "write"]) {
    builder.addFact(fact`right(${right})`);
}

const privateKey = PrivateKey.fromString("<private key>");
const token = builder.build(privateKey);
console.log(token.toBase64());
```

## Authorize a token

```javascript
const { authorizer, Biscuit, PublicKey } = require('@biscuit-auth/biscuit-wasm');

const publicKey = PublicKey.fromString("<public key>");
const token = Biscuit.fromBase64("<base64 string>", publicKey);

const userId = "1234";
const auth = authorizer`
  resource("file1");
  operation("read");
  allow if user(${userId}), right("read");
`;
auth.addToken(token);

// returns the index of the matched policy. Here there is only one policy,
// so the value will be `0`
const acceptedPolicy = authorizer.authorize();

// the authorization process is restricted to protect from DoS attacks. The restrictions can be configured
const acceptedPolicyCustomLimits = authorizer.authorizeWithLimits({
  max_facts: 100, // default: 1000
  max_iterations: 10, // default: 100
  max_time_micro: 100000 // default: 1000 (1ms)
});
```

## Attenuate a token

```javascript
const { block, Biscuit, PublicKey } = require('@biscuit-auth/biscuit-wasm');

const publicKey = PublicKey.fromString("<public key>");
const token = Biscuit.fromBase64("<base64 string>", publicKey);

// restrict to read only
const attenuatedToken = token.append(block`check if operation("read")`);
console.log(attenuatedToken.toBase64());
```

## Seal a token

A sealed token cannot be attenuated further.

```javascript
const { Biscuit, PublicKey } = require('@biscuit-auth/biscuit-wasm');

const publicKey = PublicKey.fromString("<public key>");
const token = Biscuit.fromBase64("<base64 string>", publicKey);

const sealedToken = token.sealToken();
```

## Reject revoked tokens


```javascript
const { Biscuit, PublicKey } = require('@biscuit-auth/biscuit-wasm');

const publicKey = PublicKey.fromString("<public key>");
const token = Biscuit.fromBase64("<base64 string>", publicKey);

// revocationIds is a list of hex-encoded revocation identifiers,
// one per block
const revocationIds = token.getRevocationIdentifiers();

if (containsRevokedIds(revocationIds)) {
    // trigger an error
}

```

## Query data from the authorizer

```javascript
const { authorizer, rule, Biscuit, PublicKey } = require('@biscuit-auth/biscuit-wasm');

const publicKey = PublicKey.fromString("<public key>");
const token = Biscuit.fromBase64("<base64 string>", publicKey);

const userId = "1234";
const auth = authorizer`
  resource("file1");
  operation("read");
  allow if user(${userId}), right("read");
`;
auth.addToken(token);

// returns the index of the matched policy. Here there is only one policy,
// so the value will be `0`
const acceptedPolicy = auth.authorize();

const results = auth.query(rule`u($id) <- user($id)`);
console.log(results.map(fact => fact.toString()));
```

## Using biscuit with [express](https://expressjs.com)

[Express](https://expressjs.com) is a popular web framework for NodeJS. `biscuit-wasm` provides support for express through a dedicated [middleware](https://expressjs.com/en/guide/using-middleware.html).

Here is a minimal example of an application exposing a single `/protected/:dog` endpoint, and requiring a token with a corresponding `right()` fact.

Calling `middleware` with an options object provides a middleware builder, which takes either an authorizer or a function building an authorizer from a request, and returns an actual middleware. This middleware generates an authorizer from the options and the builder, runs the authorization process and either aborts the request if authorization fails or passes control over to the endpoint handler if authorization succeeds.

```javascript
const express = require('express');
const { authorizer, middleware, Biscuit, PublicKey } = require('@biscuit-auth/biscuit-wasm');

const app = express();
const port = 3000;

const p = middleware({
  publicKey: PublicKey.fromString("<public key>"),
  fallbackAuthorizer: req => authorizer`time(${new Date()});`
});

app.get(
  "/protected/:dog",
  p((req) => authorizer`resource(${req.params.dog});
                        action("read");
                        allow if right(${req.params.dog}, "read");`),
  (req, res) => {
    // results of the authorization process are added to the `req` object
    const {token, authorizer, result} = req.biscuit;
    res.send("Hello!");
  }
)
```

### Middleware configuration

The middleware takes an options object. All its fields are optional except `publicKey`:

- `publicKey`: the public key used to verify token signatures;
- `priorityAuthorizer`: either an authorizer or a function building an authorizer from a request. Policies from the priority authorizer are matched before the endpoint policies and the fallback authorizer policies;
- `fallbackAuthorizer`: either an authorizer or a function building an authorizer from a request. Policies from the fallback authorizer are matched after the priority authorizer policies and the endpoint policies;
- `tokenExtractor`: a function extracting the token string from a request. The default extractor expects the request to carry an authorization header with the `Bearer` auth scheme (ie an `Authorization:` header starting with `Bearer ` and then the biscuit token);
- `tokenParser`: a function parsing and verifying the token. By default it parses the token from a URL-safe base64 string.
- `onError`: an error handler. By default, it prints the error to stderr and returns an HTTP error (401 if the token is missing, 403 if it cannot be parsed, verified or authorized)
