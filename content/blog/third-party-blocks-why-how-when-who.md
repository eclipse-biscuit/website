+++
title = "Third-party blocks: why, how, when, who?"
description = "Introducing third-party blocks"
date = 2022-08-15T09:00:00+02:00
updated = 2022-08-15T09:00:00+02:00
draft = false
template = "blog/page.html"

[taxonomies]
authors = ["clementd"]

[extra]
lead = "After a period of relative stability and UX polishing, we are happy to announce an upcoming feature that will unlock a lot of potential in decentralized architectures: third-party blocks. Third-party blocks allow to distribute the verification of a biscuit’s checks across several parties, without requiring direct communication between them: everything is carried by the biscuit token itself. If you are familiar with macaroons, think <i>third-party caveats… on steroids (and actually usable)</i>."
+++

## The biscuit platform

Biscuit provides both a policy language and a token format, allowing decentralized authorization and offline attenuation.

A token can carry information trusted via public key signature verification, as well as checks allowing to embed restrictions in tokens themselves. This way, policies can be enforced in tokens, in services, or both, all in a unified policy language that’s designed for easy auditing.

## Cross-domain authorization

With first-party blocks, there is a single domain, scoped by the root signing key. The authority has complete control over the facts embedded in the token. The verifying party then trusts the token by verifying signatures with a well-known public key.

The trouble starts when we try to bridge multiple domains together. Here, domains might be companies, or products, or maybe different networks. One common solution is to bring everything under a single domain. The domain authority is then responsible for centralizing information from all domains, and enforcing domain-specific policies before minting tokens. This nullifies the benefits of separating concerns into independent domains and increases the blast radius of security issues.

Another solution is to build ad-hoc bridges between security domains. That works but requires a lot of work, with quadratic growth over the number of domains.

Third-party blocks provide a principled way to handle cross-domain authorization, by building tokens containing blocks signed by multiple domain authorities, with proper scoping over authorization policies: policies can specify trusted scopes for each constraint. In practice, this allows expressing policies spanning over multiple security domains, without requiring ahead-of-time consolidation, nor ad-hoc bridges between domains. No direct communication is required between domains, the biscuit token can carry everything while keeping track of scopes. This fits nicely into the offline attenuation pattern: each domain can append authoritative information to a token.

### A motivating example

Assuming a login service, a file repository and an external social network service, the login service can mint a biscuit token granting access to the file repository, only if the holder is part of a specific group in the social network service.

Here, it is the responsibility of the holder to append a block signed by the group service before verification; the verifying party does not need to contact the group service at all.

```
// authority block, emitted by the login service.
// It is only usable if the holder is part of the `viewers` group.
user("clementd");
right("file1", "read");
// the fact `member("pink-floyd-fans")`; has to come from a block
// signed by the social network: this is enforced via the public key check
check if member("pink-floyd-fans") trusting ed25519/398ad724c0da3756bb8709a85179a3ff9c34f8ec08317c3d8f79d75db7eab014;

// block provided by the social network
// it provides the proof that the holder is part of the admin group, but adds
// a check: the proof is valid only for a limited amount of time
// this block carries a signature that can be verified with the following
// public key: 398ad724c0da3756bb8709a85179a3ff9c34f8ec08317c3d8f79d75db7eab014
member("pink-floyd-fans");
check if time($time), $time < 2022-08-01T00:00;

// verifier policy.
allow if right("file1", "read");
```

<figure>
<figcaption>Cross-service authorization carried over a single biscuit token</figcaption>
<img alt="Cross-service authorization carried over a single biscuit token" src="/img/third-party-example.svg" width="100%">
</figure>

## How it works

Third-party blocks rely on two important mechanisms:

- the ability to attach external signatures to biscuit blocks;
- the ability to use these signatures as scope selectors within the policy language.

### External signatures

What makes a third-party block a third-party block is an external signature: in addition to the regular biscuit signature that guarantees the whole token validity, an extra signature proves that the block contents come from a trusted party. These signatures are verified during parsing, just like the regular signatures chain.

### Policy scopes

The policy language (based on datalog) has been extended to provide a way to scope facts based on their origin. By default, only facts coming from the authority block or the authorizer are trusted: that’s the basic biscuit behavior where extra blocks can only attenuate a token, not extend it.

With third party blocks, this scoping can be made explicit in rules, checks, and policies:

```
// default behaviour: only trust facts coming from the current block, the verifier and the
// authority
f($1) <- g($1) trusting authority;

// trust facts coming from the current block, the verifier, the authority, or from
// blocks with an external signature generated by the keypair of the provided
// public key. The generated fact will have a composite scope
f($1) <- g($1) trusting authority, ed25519/398ad724c0da3756bb8709a85179a3ff9c34f8ec08317c3d8f79d75db7eab014;

// ensure the fact `f("a")` is defined either in the current block, the verifier or in any block
// signed by the provided keypair. Such a check can be part of any block
// in a biscuit, or of the authorizer
check if f("a") trusting ed25519/398ad724c0da3756bb8709a85179a3ff9c34f8ec08317c3d8f79d75db7eab014;

// authorize the biscuit if `f("a")` is defined either in the verifier,
// or from blocks signed by the provided keypair.
allow if f("a") trusting ed25519/398ad724c0da3756bb8709a85179a3ff9c34f8ec08317c3d8f79d75db7eab014;
```

<bc-token-printer showAuthorizer="true" biscuit="EuMBCnkKCGNsZW1lbnRkCgVmaWxlMQoPcGluay1mbG95ZC1mYW5zGAQiCQoHCAoSAxiACCINCgsIBBIDGIEIEgIYADITChEKAggbEgcIEBIDGIIIIgIQAEIkCAASIGmd6WCCP2xIZPD5r2WK3bf_ypupWzEd657cc9KSFHRLEiQIABIg-wPpPj-KTZgiTwAfeE1nib0oRRFcGTr8QYaVU9P28WAaQBYNe2scMyflWXCsWN3ZVDvi8PN2anilv6Rx2TIXEeAf_Lo6Cx2nX7VSMDbp8hl_Dvw_YJKsqIWaBd6OCG34-QQamgIKRgoPcGluay1mbG95ZC1mYW5zGAQiCQoHCBASAxiACDImCiQKAggbEgYIBRICCAUaFgoECgIIBQoICgYggIewxAYKBBoCCAASJAgAEiCtC-C79vgrzCraYvQZnm4-e1kfGsiJGWVX1-X6MB9anRpA6_foa4an2pXoKebDqEhhGc5efl7kJ9QIzkWh5zGOIhC4vdEL8ZYEXjoILhkv0Mtk5Um6-jPj50tCqPPVF7Z6AiJoCkCdH--48bRfMAHgXoZoRh6gKvgYoffY1y0ACdgX4R2XyEeyVPtyhcJI7yRiEOeyBTx7IsVojlKKH-8f6dOIsKcPEiQIABIgaZ3pYII_bEhk8PmvZYrdt__Km6lbMR3rntxz0pIUdEsiIgogH0WDeP1WrZqLrTngxTdUsQHPz3dP9JKdCgUcKAAnXCU=" rootPublicKey="ed25519/a325f5df2dee5fd8b15f36751ae1b59470dbd7540b1197d28d05d0b8c18da063">
  <code class="authorizer">
time(2022-08-18T00:00:00Z);
allow if right("file1", "read");
  </code>
</bc-token-printer>

## Testing things out with the CLI

You can play with third-party blocks with the latest main of [biscuit-cli](https://github.com/eclipse-biscuit/biscuit-cli).

```bash
# the login service generates its keypair and shares the public key
echo "275fbc41dd8628ca8a2de9a4a9ff39a7d01f0cca31188f47eb0c66f6ae85f518" > login-service-private-key
echo "a325f5df2dee5fd8b15f36751ae1b59470dbd7540b1197d28d05d0b8c18da063" > login-service-public-key

# the social network generates its keypair and shares the public key
echo "c7d1cf355522f814b29c8fde6d419ad3004ddb334d5b65cb76f42858ddcda4e1" > social-network-private-key
echo "699de960823f6c4864f0f9af658addb7ffca9ba95b311deb9edc73d29214744b" > social-network-public-key

# the login service creates a token for user clementd, and makes it only
# valid if the holder is a true fan of Pink Floyd
cat << EOF > authority-block
  user("clementd");
  right("file1", "read");
  check if member("pink-floyd-fans") trusting {social_network_pubkey};
EOF
biscuit generate --private-key-file ./login-service-private-key \
  ./authority-block \
  --param "social_network_pubkey=$(< ./social-network-public-key)::pubkey" \
  > login-service-token
 
# the user generates a request from the login-service token and asks the
# social network for a membership proof
biscuit generate-request ./login-service-token > ./biscuit-request

# the social networks generates a membership proof with an expiration date
cat << 'EOF' > membership-proof
  member("pink-floyd-fans");
  check if time($time), $time < 2025-08-01T00:00:00Z;
EOF
biscuit generate-third-party-block biscuit-request \
  --private-key-file ./social-network-private-key \
  --block-file membership-proof \
  > third-party-block

# the user appends the provided proof to the token
biscuit append-third-party-block \
  --block-contents-file ./third-party-block \
  ./login-service-token \
  > complete-token

# the file server can then authorize the request
biscuit inspect ./complete-token \
  --public-key-file ./login-service-public-key \
  --verify-with 'allow if right("file1", "read");' \
  --include-time
```

<details>

<summary>Inspect output</summary>

```
Authority block:
== Datalog ==
user("clementd");
right("file1", "read");
check if member("pink-floyd-fans") trusting ed25519/699de960823f6c4864f0f9af658addb7ffca9ba95b311deb9edc73d29214744b;

== Revocation id ==
93a021b6d5512eb8750b491bd75e1809e1b404a5d45e31684cea9777c9453b8f9182104203557f2986aecf21fbebd76756540f106648a50abf3efa67667be800

==========

Block n°1, (third party, signed by 699de960823f6c4864f0f9af658addb7ffca9ba95b311deb9edc73d29214744b):
== Datalog ==
member("pink-floyd-fans");
check if time($time), $time < 2025-08-01T00:00:00Z;

== Revocation id ==
b6c0c42293d7e1c3eb65daf04ddd516604eebe7a4bfc550a5b48a31d0df69439da6bfa501fd8c3107b13688222da3a7a10ae232267ffe632e1f24d1acd79a00f

==========

✅ Public key check succeeded 🔑
✅ Authorizer check succeeded 🛡️
Matched allow policy: allow if right("file1", "read")
```

</details>

## Third-party blocks when?

Third-party blocks have been implemented in biscuit-rust and biscuit-haskell, and are available in alpha releases (with follow-up releases for wasm-based implementations, notably biscuit-wasm for javascript). We welcome help for support in other languages.

## Discovering new patterns

Biscuits gave access to a host of new auth patterns, by allowing to mix token-carried policies and verifier-carried policies. Third-party tokens expand the landscape on a new axis by allowing to distribute verification across multiple parties in a consistent and interoperable ways. We are working on several promising uses cases such as inert tokens that require an extra signature right before being sent over the wire, or API federation where an auth gateway can gather multiple APIs with different authorization policies in a single place, with no coupling between the exposed APIs.

Please come have a chat on [our matrix room](https://matrix.to/#/!MXwhyfCFLLCfHSYJxg:matrix.org) if you want to help us explore this space further. There is a lot to discover!
