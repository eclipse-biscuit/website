+++
title = "Releasing Swift Biscuits library 1.0"
description = "The Swift implementation of Biscuit authorization has been released."
date = 2025-09-11T00:00:00+02:00
draft = false
template = "blog/page.html"

[taxonomies]
authors = ["saoirse-a"]

[extra]
lead = "The Swift implementation of Biscuit authorization has been released."
+++

We are excited to announce the release of [biscuit-swift][repo], a new implementation of the
[Biscuit][biscuit] authorization token format written in the [Swift][swift] programming language.
Biscuit tokens support decentralised verification using public key cryptography, offline token
attenuation, and a Datalog-based language for expressing authorization policy. This library
implements the most recent version of the Biscuit specification, [version 3.3][version].

Swift is a general purpose programming language that can be used for a variety of applications,
including mobile and desktop apps and cloud services. This new library will enable programmers to
integrate biscuit tokens in any application written in Swift. The library is supported both on Apple
platforms like iOS and macOS and on Linux.

## API Highlights

The Swift Biscuits library uses Swift 6 and is compatible with Swift concurrency, including strict
concurrency checks. It uses [swift-crypto][swift-crypto] for cryptographic primitives, and on Apple
platforms it supports using [SecureEnclave][secure-enclave] protected keys as root and third party
signing keys.

To create, attenuate, and authorize tokens, policies are expressed in Biscuit's Datalog-based policy
language. The library supports parsing Datalog from Strings, but also supports a robust domain
specific language based on resultBuilder which is more type-safe and prevents user errors.

For example, a Swift cloud service might issue a token for a specific user like so:

```swift
import Biscuits
import Crypto

let issuerPrivateKey = Curve25519.Signing.PrivateKey()

let userToken = try Biscuit(rootKey: issuerPrivateKey) {
    // Equivalent to: "check if user(userID);"
    Check.checkIf { Predicate("user", userID) }
    // Equivalent to: "check if time($time), $time <= expirationDate;"
    Check.tokenExpires(at: expirationDate)
}
```

The user application that received this token could also attenuate it to produce a read-only token
with access only to a specific directory to share this limited permission token with a third party:

```swift
let readOnlyToken = try userToken.attenuated() {
    // check if operation("read");
    Check.checkIf { Predicate("operation", "read") }
    // check if resource($path), $path.starts_with("/foo");
    Check.checkIf { Predicate("resource", Term(variable: "path")) Term(variable:
    "path").startsWith("/foo") }
}
```

When attempting to authorize a request presenting that read only token, a service with access to the
issuer’s public key could use an authorization policy containing facts like these:

```swift
try readOnlyToken.authorize() {
    // user(userID);
    Fact("user", userID)
    // operation("read");
    Fact("operation", "read")
    // resource("/foo/bar.html");
    Fact("resource", "/foo/bar.html")
    // time(Date.now);
    Fact("time", Date.now)
    // allow if true;
    Policy.alwaysAllow
}
```

Because this was a request to read the resource at “/foo/bar.html” on behalf of this user, the token
would authorize successfully.

## Learn more

The entire documentation for the Swift Biscuits library is located at [swift.biscuitsec.org][docs].
If you want to learn more or get involved in the biscuits project, you can reach out on
[GitHub][repo] or [Matrix][matrix].

[repo]: https://github.com/eclipse-biscuit/biscuit-swift
[biscuit]: https://www.biscuitsec.org/
[swift]: https://www.swift.org/
[version]: https://www.biscuitsec.org/blog/biscuit-3-3/
[swift-crypto]: https://github.com/apple/swift-crypto
[secure-enclave]: https://developer.apple.com/documentation/CryptoKit/SecureEnclave
[docs]: https://swift.biscuitsec.org/documentation/biscuits/
[matrix]: https://matrix.to/#/#biscuit-auth:matrix.org
