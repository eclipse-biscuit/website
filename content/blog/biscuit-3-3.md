+++
title = "Biscuit 3.3"
description = "Version 3.3.0 of the biscuit specification has been released"
date = 2024-11-28T00:09:00+02:00
draft = false
template = "blog/page.html"

[taxonomies]
authors = ["clementd"]

[extra]
lead = "A new version of the biscuit spec has been released"
+++

Biscuit is a specification for a cryptographically verified authorization token
supporting offline attenuation, and a language for authorization policies based on Datalog.
It is used to build decentralized authorization systems, such as microservices architectures,
or advanced delegation patterns with user facing systems.

Building on more than a year of use since the last feature release, the biscuit team is proud to announce [biscuit `v3.3`](https://github.com/eclipse-biscuit/biscuit/releases/tag/v3.3), with a lot of new features, stronger crypto and (hopefully) a clearer version scheme.

A sizeable chunk of the new datalog features has been financed by [3DS Outscale][outscale].

## New version scheme

Versions appear in several places in the biscuit ecosystem:

- the spec itself is versioned (with a semver version number);
- datalog blocks have a version number (encoded with a single unsigned integer);
- libraries have versions (with version numbers depending on the language ecosystem, semver in most cases).

All this made things somewhat confusing, especially since these version numbers are related but different, and expressed with various schemes.

Starting with this release, we will try to clarify things a bit:

### Spec version

The datalog spec is released as `v3.3.0` (major version 3, minor version three, patch number zero).

The major number is bumped when the token format changes completely, without any support for backward compatibility.

The minor number is bumped when new features are added in a backward-compatible way (ie as long as you’re not using new features, you are compatible with older versions). Critical security fixes can also trigger a minor version bump.

The patch number will be either for fixes in the spec or small changes that don’t affect the tokens themselves. As far as token compatibility is concerned, the patch number does not exist.

### Block version number

Datalog blocks carry an unsigned integer named `version`. This number is intended to declare the minimum version of the spec that is needed to correctly understand the block. For space efficiency reasons, it is encoded as a single unsigned integer, representing a `major.minor` spec version.

A block with version number `3` can only be understood by libraries with support for spec `v3.0` and higher, `4` requires `v3.1+`, `5` requires `v3.2+` and `6` requires `v3.3+`. This makes possible for libraries to reject tokens that rely on too recent features, instead of possibly mis-interpret a token.

Libraries are supposed to encode tokens with the smallest version number possible, in order to facilitate gradual migration.

### Signed block version number

Starting with biscuit `v3.3`, the spec also defines a version number for the block signatures. This will allow improving signatures in a more graceful way.

## tl;dr: partial breaking changes

Biscuit has a strong policy for making spec updates additive:

- tokens emitted with a library supporting biscuit 3.0 to 3.3 will be handled correctly by a library supporting biscuit 3.3;
- tokens emitted by a library supporting biscuit 3.3, but not using any features from biscuit 3.3 will be handled correctly by a library supporting the features they use.

However, biscuit 3.2 introduced a breaking change for third-party blocks, making third-party blocks emitted with a 3.0/3.1 library not accepted anymore. While we try to avoid this kind of breaking changes, it was necessary to fix a security issue. This breaking change only affected third-party blocks, which are not widely used.

Biscuit 3.3 also introduces a breaking change on third-party blocks. New third-party blocks will not be supported by biscuit 3.2 libs, and third-party blocks emitted with biscuit 3.2 will be rejected by default by 3.3 libs (this can be relaxed during a migration period). Same as for the previous breaking change, it is necessary to fix a security issue and affects a small percentage of use-cases.

### Datalog syntax changes

The spec guarantees that datalog updates are purely additive, when encoded in tokens.

The textual syntax for datalog has been updated in biscuit 3.3:

- sets are now delimited by `{}`
- strict equality tests are now denoted by `===` and `!==`

## Datalog improvements

### Arrays and maps / JSON support

Up until now biscuit datalog only had a single collection type: sets. Sets were quite restrictive (no nesting, homogeneous). This made impossible for a biscuit token to carry JSON for instance.

Biscuit 3.3 adds support for arrays, maps, and `null`, thus providing a way to embed arbitrary JSON values in a token.

```biscuit
payload({"key": ["value", true, null, {}]});
```

#### `null`

Arrays and map support `.get()`, so we needed a way to handle missing keys. Since biscuit datalog is untyped, `null` is an okay solution for this. `null` was also the last missing piece for JSON support.

```biscuit
check if [].get(0) == null;
```

#### Closures

With this new focus on collection types, we needed a way to express more things in the language. Datalog expressions follow a pure evaluation model, so mutability and loops were not available. Higher-order functions were thus the best way to work with collections.

Arrays, sets and maps support `.any()` and `.all()`, taking a predicate. Closures are not first-class (meaning they cannot be manipulated like regular values), but can however be nested (to work with nested data types). Variable shadowing was not possible until then (since all variables could only be bound in the same scope, with predicates). Variable shadowing is now possible syntactically, but explicitly forbidden by the spec and rejected by implementations.

```biscuit
check if ["a","b","c"].any($x -> $x.starts_with("a"));
check if [1,2,3,4].all($x -> $x < 10);
```

### `reject if`

`check if` (and `check all`) allow encoding rules that must match for authorization to success. Biscuit 3.3 adds `reject if`, a way to make authorization fail when a rule matches. This allows expressing something similar to `DENY` statements in AWS policies.

```biscuit
reject if user($user), denylist($denied), $denied.contains($user);
```

### Foreign Function Interface

Biscuit datalog is a small language, on purpose. The goal is to have it embedded in each biscuit implementation, with consistent semantics. In polyglot architectures, this allows to have consistent authorization rules across services. The drawback is that authorization logic is constrained to what datalog can express.

In some cases, it can be desirable to trade the cross-language consistency for flexibility and to have datalog delegate to the host language. This is exactly what the datalog Foreign Function Interface allows.

Assuming this user-defined implementation provided to the biscuit runtime:

```rust
HashMap::from_iter([(
    "in_range".to_owned(),
    ExternFunc::new(Arc::new(|ip, range| match (ip, range) {
        (Term::Str(ip), Some(Term::Str(range))) => {
            let ip: Ipv4Addr = ip
                .parse()
                .map_err(|e| format!("Invalid IPv4 address: {e}"))?;
            let range: Ipv4Net = range
                .parse()
                .map_err(|e| format!("Invalid IPv4 range: {e}"))?;
            Ok(Term::Bool(range.contains(&ip)))
        }
        _ => Err("ip_in_range expects two strings".to_owned()),
    })),
)])
```

The function named `in_range` becomes available in datalog expressions.

```biscuit
check if source_ip($source_ip), $source_id.extern::in_range("192.168.0.0/16");
```

### Other datalog improvements

- heterogeneous equality: `1 == "a"` returns `false`, without raising an error, while `1 === "a"` will make evaluation fail;
- `.type()`: `1.type() =="integer"`


## Crypto layer improvements

In addition to new datalog features, biscuit’s crypto layer has been improved as well.

### ECDSA support

Biscuit now supports ECDSA with the `secp256r1` curve. This allows using biscuit in environments where ed25519 is still not supported.

### Hardened signature algorithm

Biscuit’s signature algorithm has been hardened, to make signature evolutions easier, as well as preventing block re-use, especially for third-party blocks.

## Next steps

[biscuit-rust][biscuit-rust] will soon be released with full support for biscuit-3.3, along with [biscuit-cli][biscuit-cli] and [biscuit-web-components][biscuit-web-components]. Libraries based on biscuit-rust ([biscuit-python][biscuit-python] and [biscuit-wasm][biscuit-wasm]) will follow soon.

## Let's have a chat!

Please come have a chat on [our matrix room][matrix] if you have questions about
biscuit. There is a lot to discover!

[matrix]: https://matrix.to/#/!MXwhyfCFLLCfHSYJxg:matrix.org
[outscale]: https://outscale.com
[biscuit-rust]: https://github.com/eclipse-biscuit/biscuit-rust
[biscuit-cli]: https://github.com/eclipse-biscuit/biscuit-cli
[biscuit-web-components]: https://github.com/eclipse-biscuit/biscuit-web-components
[biscuit-python]: https://github.com/eclipse-biscuit/biscuit-python
[biscuit-wasm]: https://github.com/eclipse-biscuit/biscuit-wasm
