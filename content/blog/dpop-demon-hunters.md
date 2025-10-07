+++
title = "DPoP demon hunters"
description = "Embedding DPoP into biscuit tokens with third-party blocks"
date = 2025-09-20T00:09:00+02:00
draft = false
template = "blog/page.html"

[taxonomies]
authors = ["clementd"]

[extra]
lead = "Embedding DPoP into biscuit tokens with third-party blocks"
+++

_It is recommended (but not mandatory) to watch [KPop Demon Hunters](https://en.wikipedia.org/wiki/KPop_Demon_Hunters) before reading this post._


<iframe width="560" height="315" src="https://www.youtube.com/embed/AzCAwdp1uIQ" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

Bearer tokens’ biggest strength is also their bigger weakness. They’re bearer tokens. So if (when?) it is stolen, that’s game over.

In the OAuth ecosystem, one solution is DPoP (short for "Demonstrating Proof of Possession") defined in [RFC9449](https://datatracker.ietf.org/doc/html/rfc9449).

> Demonstrating Proof of Possession (DPoP) is an _application-level_ mechanism for sender-constraining OAuth access and refresh tokens. It enables a client to prove the possession of a public/private key pair _by including a DPoP header in an HTTP request_.

## [Are you ready for the takedown?](https://www.youtube.com/watch?v=l8Dr7vzMSVE)

In practice, the JWT is bound to a key pair, and it’s up to the client to provide another JWT containing the proof, in a specific HTTP header. It is then _up to the application_ to verify this proof. As with many JWT mechanisms, it _fails open_. The token emitter has no way to enforce this check. 

Failing safe and having the token emitter actually enforce checks are core tenets of the biscuit philosophy, so let’s see how we can improve on that with biscuits.

Quoting RFC9449 again,

> Roughly speaking, a DPoP proof is a signature over:
> - some data of the HTTP request to which it is attached,
> - a timestamp,
> - a unique identifier,
> - an optional server-provided nonce, and
> - a hash of the associated access token when an access token is present within the request.

The core idea is having an extra payload signed with a specific key pair, proving the possession of the corresponding private key, and bound to the specific context of the request.

## [Gonna be golden](https://www.youtube.com/watch?v=yebNIHKAC4A)

The good news is that it fits perfectly with [third-party blocks](https://www.biscuitsec.org/blog/third-party-blocks-why-how-when-who/). A third-party block is a biscuit block, signed by a specific key pair. Other blocks in the token can then refer to facts defined is this block, by specifying the corresponding public key.

These two features allow to improve on JWT-based DPoP:

- there is no need for an extra JWT in a specific header, the access token block and the proof of possession can be two blocks (the authority block and a third-party block) in a single biscuit token,
- the token emitter can mandate the presence of the proof of possession by carrying a check;

Let’s do this!

## [How it’s done (dun dun)](https://www.youtube.com/watch?v=QGsevnbItdU)

Assuming that the client has the following keypair:

```
Private key: ed25519-private/965773f3aa3d3600d6c293a37b5fa7b4bf3db2f6e9fb57034eb0caacaec7f45d
Public key: ed25519/a58cafdb2d787a6d9385308218fba2431d498a0193ce9e3d2e3149917a371f03
```

Here’s an access token:

```biscuit
// any other facts relevant to the access token
user("clementd");

// require the presence of a block signed with the expected keypair, containing
// specific facts. Facts prefixed by `dpop:` are coming from the signed block,
// while unprefixed facts come from the authorizer
check all
  dpop:expiration($dpop:expiration), time($time), $time < $dpop:expiration,
  dpop:htm($dpop:htm), htm($htm), $dpop:htm == $htm,
  dpop:htu($dpop:htu), htu($htu), $dpop:htu == $htu
  trusting ed25519/a58cafdb2d787a6d9385308218fba2431d498a0193ce9e3d2e3149917a371f03
```

Here’s the third-party block carrying the actual proof of possession:

```biscuit
dpop:expiration(2025-09-11T00:00:00Z);
dpop:htm("POST");
dpop:htu("https://example.org/honmoon");
```

Note that the signed block only carries information, but no actual check. This allows the emitter to enforce the check, without relying on the code that adds the DPoP block. So this fails safe in the case where the client signer lacks something (the client signer can still make the authorizer bypass checks, but that’s a slightly different matter).

Finally, here’s the expected authorizer:

```biscuit
// this is the only part required from the resource server
htm("POST");
htu("https://example.org/honmoon");
time(2025-09-15T14:09:24Z);

// regular authorizer logic
allow if …;
```

Let’s review the guarantees that this gives us, compared to RFC9449:

- the access token is bound to a specific key pair, specified by its public key
- the DPoP block is tied to the token it is added to and cannot be used on another token (third-party block signatures cover the signature of the previous block)
- the DPoP block specifies an expiration date as well as the expected HTTP method and URI

This is not exactly equivalent to RFC9449:

- DPoP JWTs require an `iat` claim (issuance timestamp), not an `exp` one (expiration timestamp), it’s up to the resource server to determine whether the issuance time is within an acceptable window
- DPoP JWTs require a `jti` claim (a unique identifier used for replay detection and revocation), third-party blocks have an equivalent, but this part is not signed by the third-party key pair (it is signed however by the previous blocks’ keypair)

There are workarounds for both differences (in the first case, it even allows the issuer to determine the acceptable time window, not the resource server), but they are a bit more cumbersome (the first one requires a FFI call to compute timestamp shifting with durations, the second one requires the client signer to add a `dpop:id()` fact and the server to extract it for inspection).

## The honmoon is not completely sealed yet

There’s still an issue with the code above, due to a limitation in biscuit datalog’s `trusting` annotations.

`trusting` annotations cover the whole check body, and cannot (for now) be tied to specific predicates. So in `check if dpop:expiration($dpop:expiration), $time($time), $time < $dpop:expiration`, `time()` can come from either the authority block (that’s what we want), or the DPoP block (we don’t want that).  This is somehow mitigated by using `check all`, because it will make sure that the conditions hold for all matching predicates. So as long as the authorizer defines `time()` , `htm()` and `htu()`, the client-signing party cannot bypass these checks.

Future biscuit datalog evolutions will improve granularity of `trusting` annotations and will remove this issue for good.

## [You’re my so DPoP](https://www.youtube.com/watch?v=983bBbJx0Mk)

This small example showcases how third-party tokens provide a unified way to carry multiple signatures in a single token, eliminating the need for extra communication channels, and allowing systems to evolve easily by letting a single token carry all the context needed for authorization. It also shows how letting a token carry checks defined in an authorization language allows a system to fail safe in the case of a discrepancy between emitter an receiver.
