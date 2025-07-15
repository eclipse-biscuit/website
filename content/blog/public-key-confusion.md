+++
title = "Security advisory: public key confusion in third-party blocks"
description = "A potential security issue has been detected and addressed"
date = 2024-07-31T18:00:00+02:00
draft = false
template = "blog/page.html"

[taxonomies]
authors = ["clementd"]

[extra]
lead = "A potential security issue has been detected and addressed"
+++

Today we have issued a [security advisory](https://github.com/eclipse-biscuit/biscuit/security/advisories/GHSA-rgqv-mwc3-c78m) and updates to third-party blocks covering the specification, biscuit-rust, biscuit-haskell, biscuit-java, biscuit-wasm and biscuit-python, as well as biscuit-web-components and biscuit-cli.

## tl;dr:

The serialization mechanism for public keys in third-party blocks allowed public key confusion when issuing third-party blocks. More information is available in the security advisory. We advise you to upgrade to the latest version as soon as possible, even though this issue affects only tokens satisfying both of these conditions:

- third-party blocks containing `trusting {public_key}` annotations;
- third-party blocks generated from a third-party block request provided by an untrusted agent.

We believe that these two conditions make it extremely unlikely that this issue affects realistic use-cases, but we still encourage you to update to:

- [`biscuit-rust 5.0.0`](https://crates.io/crates/biscuit-auth/5.0.0)
- [`biscuit-haskell 0.4.0.0`](https://hackage.haskell.org/package/biscuit-haskell-0.4.0.0) and [`biscuit-servant 0.4.0.0`](https://hackage.haskell.org/package/biscuit-servant-0.4.0.0)
- [`biscuit-java 4.0.0`](https://central.sonatype.com/artifact/org.biscuitsec/biscuit/4.0.0)
- [`biscuit-wasm 0.5.0`](https://www.npmjs.com/package/@biscuit-auth/biscuit-wasm/v/0.5.0)
- [`biscuit-python 0.3.0`](https://pypi.org/project/biscuit-python/0.3.0/)
- [`biscuit-web-components 0.6.1`](https://www.npmjs.com/package/@biscuit-auth/web-components/v/0.6.1)
- [`biscuit-cli 0.5.0`](https://crates.io/crates/biscuit-cli/0.5.0)

**This update is a breaking change for third-party blocks**, but is transparent for other use-cases. Third-party blocks emitted with old versions will not be accepted by new versions, and third-party blocks emitted with new versions will not be accepted by old versions. Tokens without third-party blocks are not affected by the change.

## Vulnerability explanation

To reduce the size of tokens, strings are not serialized directly. Instead they are stored in a dedicated table, and referred to by their index. This ensures that each string is serialized only once in the token.

Public keys, usable in a rule’s scopes to indicate which origin it trusts, have a similar mechanism.  

When a third party block request was generated, it contained the list of public keys already known to the token, so the block creator could reuse the existing index for some keys (third party blocks still have to restart from a blank symbol table though).
If a malicious token holder was creating a third party block request with a modified list of public keys, it could induce the block creator into using the wrong key in rule or check scopes, and point instead to a key they control.

As an example:

- Authority A emits the following token: `check if thirdparty("b") trusting ${pubkeyB}`
- The holder then attenuates the token with the following third party block `thirdparty("c")`, signed with a keypair pubkeyD, privkeyD) they generate
- The holder then generates a third-party block request based on this token, but alter the ThirdPartyBlockRequest publicKeys field and replace pubkeyD with pubkeyC
- Third-party B generates the following third-party block `thirdparty("b"); check if thirdparty("c") trusting ${pubkeyC}`
- Due to the altered symbol table, the actual meaning of the block is `thirdparty("b"); check if thirdparty("c") trusting ${pubkeyD}`

More details in the [biscuit spec security advisory](https://github.com/eclipse-biscuit/biscuit/security/advisories/GHSA-rgqv-mwc3-c78m)

## Spec changes

Changes are listed in a [dedicated commit](https://github.com/eclipse-biscuit/biscuit/commit/c87cbb5d778964d6574df3e9e6579567cad12fff).

The solution is to make the public key interning completely isolated for third-party blocks, same as what we do with strings. This has a small impact on token size, but makes the implementation simpler (this part of the specification was easy to get wrong).

Third-party blocks have now a minimal block version of `5`, which invalidates previously emitted third-party blocks.
