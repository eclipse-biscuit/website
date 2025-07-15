+++
title = "Biscuit 2.0 release"
description = "Introducing Biscuit 2.0"
date = 2022-01-24T09:00:00+01:00
updated = 2022-01-24T09:00:00+01:00
draft = false
template = "blog/page.html"

[taxonomies]
authors = ["geal", "clementd"]

[extra]
lead = "We are delighted to announce the release of Biscuit at version 2.0!"
+++

Biscuit is a specification
for a cryptographically verified authorization token supporting offline delegation, and a
language for authorization policies based on Datalog. It has been in development for 3 years
and is already deployed in production systems.

Biscuit was designed to address new challenges in building authorization in distributed systems:
- a query going through microservices must be verifiable decentrally without giving its full
authorization level to every node
- API authorization increasingly has to fit a user's authorization landscape (teams, roles,
delegation) while guaranteeing multitenant isolation

As an example, [Clever Cloud](https://www.clever-cloud.com)'s Pulsar service is accessible
with Biscuit tokens: each customer is given a token with full access to their namespace,
and from there new tokens can be created that are limited to producing or subscribing to
specific topics, exactly according to application needs, without adding specific code on
the server's side.

To support those use cases, Biscuit specifies a token with public key signatures (like JWT)
and offline attenuation (like Macaroons): any service that knows the public key can verify
the token. And any token holder can derive a new token with more restrictions. For the
microservices use case, that means a node can take the token it received, and create a new one
with fewer privileges before sending it to the next node.

To guarantee that authorization policies execute the same way everywhere, Biscuit provides
an authorization language based on Datalog, that all implementations must support.
This logic language comes with benefits about execution (guaranteed to terminate) and
serialization (small enough to be carried in the token), and can encode complex policies
in a concise and readable way.

You can test it right there, in your browser:

{% datalog() %}
// we receive a request to read "admin.txt"
// The request contains a token with the following content
user(1234);

// the token restricts the kind of operation to "read"
check if operation("read");

// The authorizer loads facts representing the request
resource("admin.txt");
operation("read");

// The authorizer loads the user's rights
right(1234, "admin.txt", "read");
right(1234, "admin.txt", "write");

// Finally, the authorizer tests policies
// by looking for a set of facts matching them
allow if
  user($user_id),
  resource($res),
  operation($op),
  right($user_id, $res, $op);
{% end %}

While Biscuit has great ambitions for your systems, it can be integrated right
now without replacing the entire authorization stack: you can use it to carry
user ids and API keys, and benefit from attenuation on the client side. Users
could take their token, that contains their session ID, and attenuate it for
use on a specific server, by adding checks for a specific source IP address,
and a short expiration. Or give a full access, but only for a specific project.

And with this 2.0 release, we made it easier to integrate, simplified the
authorization language and improved performance.

## What changed in 2.0?

### Governance changes

While biscuit was started at [Clever Cloud](https://clever-cloud.com), biscuit v2 marks
the transition to a community ownership, with new contributions coming from people
not employed by Clever Cloud. The github repositories now live under the
[biscuit-auth](https://github.com/eclipse-biscuit) organization.

### New cryptographic signatures

The first big improvement of Biscuit 2.0 is the new cryptographic scheme. It has
evolved over the course of the project, from pairing based cryptography to
verifiable random functions in initial development, gamma signatures in 1.0,
and now a much simpler PKI system based on Ed25519 signatures. It keeps the main
property as previous designs: a new token can be created from an existing one
by adding a new block of data, and signatures will be valid.

That new scheme is simpler to write and audit, and can be implemented in almost
every language (in most cases, FFI to libsodium will be enough). It is also a lot
faster to sign and verify.

### Scoped rules

The second change is about Datalog execution. In a token, the first block contains
the initial rights as facts, created by the root of trust. In 1.0, to avoid confusion
with facts from the next blocks, they were tagged with the `#authority` symbol, and
facts provided by the authorizer from request data had the `#ambient` tag.

In 2.0, Datalog execution is better isolated, it makes sure that there will be no
interference from later blocks, without requiring `#authority` or `#ambient`.
This simplifies writing policies significantly.

### Removing the Symbol type

We also removed entirely the Symbol type (marked with the `#`). Symbols were interned
strings, separated from normal strings. They were used to reduce the token's size: if
a symbol appeared multiple times, the token would only carry the string once, and refer
to it by a number. It also improved performance of Datalog execution, because symbols
could be matched by comparing numbers instead of string equality. It came with a
tradeoff: symbols did not support string operations like prefix matching.
Now all strings are interned, supporting all operations, so the symbols are not needed
anymore, and execution gets a performance boost.

### New implementations

In addition to spec changes, there are new implementations and tooling available:

- a [command line application](https://github.com/eclipse-biscuit/biscuit-cli) to create, inspect, authorize and attenuate tokens
- a [haskell implementation](https://hackage.haskell.org/package/biscuit-haskell) covers all the v2 spec and comes with [bindings for protecting servant endpoints](https://hackage.haskell.org/package/biscuit-servant)
- the [wasm implementation](https://www.npmjs.com/package/@biscuit-auth/biscuit-wasm) makes the library usable from NodeJS and browsers, with both CommonJS an ES6 modules, as well as typescript definitions
- [web components](https://www.npmjs.com/package/@biscuit-auth/web-components) provide a simple way to interact with biscuits client-side (see for instance the datalog playground and the token inspector used on the website)

## Come help us!

While Rust, JS and Haskell implementations fully support v2.0 biscuits, there is still work to be done:

[biscuit-go](https://github.com/eclipse-biscuit/biscuit-go), [biscuit-java](https://github.com/clevercloud/biscuit-java), [biscuit-dotnet](https://github.com/fbredy/biscuit-dotnet) and [biscuit-swift](https://github.com/RemiBardon/biscuit-swift) don't support V2 yet and we welcome help getting them there.
We would also like to improve documentation and examples, so if you want to discuss use cases, or find the existing material unclear, please reach out so we can improve it! Come [chat with us](https://matrix.to/#/#biscuit-auth:matrix.org).

Finally, the big breaking changes (serialization, cryptographic schemes) have been shipped in V2, but there are still open questions about new features, namely providing PKI primitives within datalog, finding a way to encode something similar to macaroon's third-party caveats in biscuit, and extending biscuit to support specific ecdsa profiles, in order to make hardware tokens support easier.

While biscuit v1 was the consolidation of the initial ideas, biscuit v2 is the result of production experience and external feedback. We are super happy to see biscuit become more mature and excited for it to find new use cases.
