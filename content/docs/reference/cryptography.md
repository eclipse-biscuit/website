+++
title = "Cryptography"
description = "Cryptographic design"
date = 2021-05-01T08:00:00+00:00
updated = 2021-05-01T08:00:00+00:00
draft = false
weight = 10
sort_by = "weight"
template = "docs/page.html"

[extra]
lead = "How Eclipse Biscuit uses cryptography for attenuation."
toc = true
top = false
+++

Eclipse Biscuit uses public key cryptography to build its tokens: the private key is
required to create a token, and must be kept safe. The public key can be
distributed, and is needed to verify a token.

Specifically, it uses either the [Ed25519 algorithm](https://en.wikipedia.org/wiki/EdDSA) or [ECDSA](https://en.wikipedia.org/wiki/Elliptic_Curve_Digital_Signature_Algorithm) with the [P256-curve](https://neuromancer.sk/std/secg/secp256r1)

A public key signature proves that the signed data has not been modified.
So how does Eclipse Biscuit implement attenuation, where a new valid token can be
created from an existing one?

The token uses a scheme inspired from public key infrastructure, like TLS certificates.
It is made of a list of blocks, each of them containing data, a signature
and a public key. When creating the token, we generate a random key pair.
The root private key is used to sign the data and the new public key.

The token then contains one block, and a final proof:

- first block:
  - data
  - new public key
  - signature
- proof:
  - new private key

<img src="/img/authority.svg" style="width: 100%" />

To verify that token, we need to know the root public key. With that key,
we check the signature of the first block. Then we take the public key
from the first block, and verify that it matches the private key from
the proof. Any attempt at tampering with the first block would invalidate
the signature. Changing the private key in the proof does not affect signed
data, and would be detected during verification anyway.

That first block is called the *authority block*: it is the only one signed by the
root private key, it is trusted by the authorizer side to define the token's basic
rights. Any following block added during attenuation could have been created by
anyone, so they can only restrict rights, by using checks written in Datalog.

## Attenuation

If we have a valid token, to create a new one, we copy all the blocks,
get the private key from the proof, generate a new random key pair, sign
the data and the new public key using the private key from the previous token.

The token now contains:

- all the blocks from the previous token except the last one
- new block:
  - data
  - new public key
  - signature
- proof:
  - new private key

<img src="/img/block1.svg" style="width: 100%" />

To verify that token, we proceed as previously, using the root public key to
check the signature of the first block, then the public key from the first
block to check the signature of the second block, up until the last block.
And then we verify that the private key from the proof matches the public
key from the last block.

If any block was modified, it would be detected by signature verification,
as it would not match the data. If any block was removed, it would be detected
by signature verification too, as the public key would not match the signature.

## Sealed tokens

It is possible to seal a token, making sure that it cannot be attenuated
anymore. In that scheme, we create a new token, again by copying the blocks
from the existing one, and using the private key from the proof, generate
a new proof containing a signature of the last data block (including the
signature). This proves that we had access to the last private key.
