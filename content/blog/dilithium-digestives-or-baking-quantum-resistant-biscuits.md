+++
title = "Dilithium digestives; or baking quantum-resistant biscuits"
description = "A summary of where biscuits stand in the PQC landscape"
date = 2026-05-20T00:09:00+02:00
draft = false
template = "blog/page.html"

[taxonomies]
authors = ["clementd"]

[extra]
lead = "Recent publications raise the urgency of rolling out quantum-resistant cryptography"
+++

The breaking of conventional asymmetric crypto by Cryptographically Relevant Quantum Computers (CRQCs) has been looming for a while. [Recent][google-quant-ph] [publications][oratomic-quant-ph] have indicated that this might be closer than previously thought and the consensus seems to be converging towards a faster timeline.

Filippo Valsorda’s post, [A Cryptography Engineer’s Perspective on Quantum Computing Timelines][cq-timelines] neatly summarises the current state of things, but let me summarise it even more: [the deadline for deploying quantum-resistant crypto is 2029][google-2029-deadline].

This is already an issue for long-lived keys (keys that will still be in use in 3 years). Not _yet_ for short-lived keys, but 3 years is a short period of time.

## What it means for biscuit

[The biscuit cryptographic model][biscuit-crypto] relies exclusively on elliptic curve cryptography (initially only `ed25519`, then specific ECDSA profiles). Making biscuit tokens quantum-resistant implies switching to a quantum-resistant quantum cryptographic signature scheme.

### What about using PQC signature schemes in biscuit?

The biscuit spec has supported cryptographic agility since version 2.0, so adding new protocols is relatively easy.

The initial choice of `ed25519` in biscuit is due, in no small part, to its compactness. Each biscuit token is composed of one or more blocks, and each block contains at least one signature and one public key. For `ed25519`, a signature is *64 bytes*, a public key *32 bytes*, and a secret key *32 bytes* as well. For a biscuit token containing *n blocks*, the overhead for crypto material is _32+96*n bytes_. This (as well as careful work for payload encoding) makes it possible to use biscuit tokens in various places (HTTP headers, HTTP query parameters, etc).

If we were to add support for `ed25519`’s most standard PQC counterpart, `ML-DSA-44` (Dilithium), a biscuit token would have to carry *1312 bytes* public keys, *2420 bytes* signatures, a *2528 bytes* private key, for a combined overhead of _2528+3736*n bytes_. While an `ed25519` biscuit reaching 1kb is relatively rare, dilithium biscuits would start with a 6kb overhead. Good luck shoving that in a query param.

Dilithium is not the only credible replacement for ECC signatures. Another promising one is Mayo (a conspicuously eggless improvement over the Oil-and-Vinegar scheme; I must concede that "salad dressing" is not as catchy), which boasts significantly smaller signatures (as low as *454 bytes*), at the expense of public key sizes (*1420 bytes*). This is better, but still huge compared to `ed25519`.

Using quantum-resistant signature schemes in biscuit is technically feasible, but essentially nullifies a core property of biscuit tokens: their compactness.

### What’s the actual threat model?

Given the estimated timeline, it means that we should expect forged ECC signatures in 3 years.

In the context of biscuit, the threat is a malicious actor forging a biscuit token signature:

1. either removing or altering an attenuation block; or
2. forging an authority block.

`1.` is an issue while the autority block is valid (the authority key that signed it is active, *and* the authority block itself has not reached the end of its TTL).  
`2.` is an issue while the authority key is active.

In any case, the threat is active only during the validity period of the authority key. The good thing is that this validity period should already be kept in check because of non quantum-related threats.

### Continue aggressively rotating biscuit authority keys

So the best thing you can do for now is making sure you rotate authority (and third-party) keys consistently and regularly. This protects you against regular key leaks, helps you keep revocation lists small, and now gives you extra time to draft your post-quantum security stance.

## Next steps

Given that we recommend regular authority key rotations for conventional threats, the current timeline is not an issue. Biscuit tokens don’t contain any encrypted data, so _harvest now, decrypt later_ does not apply. For ECC signatures, the risk is that biscuit tokens can be forged _while the corresponding authority key is active_. Given usual rotation parameters, this means about one to three months.

We’re nowhere near this kind of timeframe _yet_, so there is no rush in jumping to another signature scheme. We are closely following advances in the PQC signatures space, with Mayo being the most promising candidate so far. If you’re interested in trying out new PQC signature schemes in the context of biscuit, don’t hesitate to reach out, we’re interested in how it would play out.

Biscuit’s built-in cryptographic agility gives us a credible path for signature scheme migration, so for now the best thing to do is to make sure you are properly rotating your authority keys (which you need to do for less fancy reasons anyway).


[cq-timelines]: https://words.filippo.io/crqc-timeline/
[google-quant-ph]: https://arxiv.org/abs/2603.28846
[oratomic-quant-ph]: https://arxiv.org/abs/2603.28627
[google-2029-deadline]: https://blog.google/innovation-and-ai/technology/safety-security/cryptography-migration-timeline/
[biscuit-crypto]: https://doc.biscuitsec.org/reference/cryptography.html
