+++
title = "FAQ"
description = "Answers to frequently asked questions."
date = 2021-05-01T19:30:00+00:00
updated = 2021-05-01T19:30:00+00:00
draft = false
weight = 30
sort_by = "weight"
template = "docs/page.html"

[extra]
lead = "Answers to frequently asked questions."
toc = true
top = false
+++

## What is Eclipse Biscuit?

Eclipse Biscuit is a platform made of three parts:

- a token format;
- a logic language for describing data and authorization policies;
- libraries providing support for creating and parsing tokens as well as evaluating authorization policies in the context of a given token.

## What are the concrete benefits of offline attenuation?

Offline attenuation is a powerful tool when it comes to applying the principle of least power: each action should be carried out with credentials that grant the least amount of access. Ideally, credentials should be only usable for the action they are tied to, nothing else.

This property is easily achievable in an authorization protocol where credentials carry a request signature. This makes them unusable for anything else. The issue is that issuing these credentials requires either having access to a secret key, or talking to a service which has access to this secret key. It is generally impossible to actually do this in a microservices architecture with several chained service-to-service calls. Indeed, it is bad practice for secrets to be carried around everywhere, and having every call depending on a central issuing service makes the system brittle.

Offline attenuation particularly shines when it comes to evolving an existing authorization system. In a greenfield authorization system, it is easy to bake all the desired properties in the system itself during its design. However, once the system is deployed, it is way harder to do so. Offline attenuation gives you just that: the power to strengthen calls made in an existing system. This way, you do not need to change the authorization protocol itself, or apply changes to the system architecture by introducing calls to a central token delivery service.

## It's more of a comment than a question; I have found a flaw in biscuit's crypto, the private key is carried in the token.

Offline attenuation in biscuit relies on chaining signed blocks together. To this effect, single-use keypairs are used to validate that the blocks are correctly chained. In this scheme, only the authority block is signed with a well-known, multi-use private key, which is never carried in a token. The same applies for external signatures on third-party blocks.

The cryptography of biscuit tokens has been informally checked out by experimented cryptographers and no flaws have been found in the current scheme.

The documentation carries a more detailed [explanation of the cryptography](https://doc.biscuitsec.org/reference/cryptography.html).

## Is this used in production? Has it been audited? Can I be fired for choosing biscuit?

Biscuit is currently used in production. We know it is used by [Clever Cloud](https://clever-cloud.com), [Space And Time](https://www.spaceandtime.io/), [nixbuild.net](https://nixbuild.net/), even though we are not aware of all its production use cases. Additionally, [Outscale](https://outscale.com/) is investing time and resources in biscuit in the context of its IAM offering.

Neither the biscuit specification nor the various implementations have been formally audited. The specification itself (more specifically the cryptographic scheme) has been informally audited by experienced cryptographers and the current specification raised no alarms.

Of course biscuit is a recent piece of tech, which makes it harder to justify than more standard choices like JWT. That being said, biscuit and the patterns it allows have been instrumental in the success of several projects, so it is worth trying it out.

Consider unionizing to protect yourself from being unduly fired.

## How can biscuit be integrated with OAuth and OIDC?

Biscuit is focused on the authorization and delegation side of API access, so it can be used as an OAuth access token. OAuth does not mandate a specific format for the access token.
Refresh tokens work better when they are meant for a single use. In that case, a random string stored in the Authorization Server (in OAuth terms) database will fit the task.
OIDC specifies that identity information is transmitted using JWTs, so Biscuit will not be usable in their place. See a more in depth [explanation of the different protocols](/blog/oauth-oidc/).

## Why Datalog?

Biscuit needed a language that could be serialized in a compact format, and executed in the same way across different implementations in different languages. It also had to be fast to execute and have a limited impact on memory use. Finally, it had to be general enough, so it would not prescribe a specific authorization model.
There is a long history of applying logic languages and in particular Datalog, to authorization policies, because of its well-understood semantics and its expressiveness in manipulating relational data.
We designed a custom Datalog instead of reusing an existing one so we could specify its behaviour and execution and reduce the attack surface of the authorization core.

## Isn't JWT enough?

JWT fits a specific use case: transmitting identity and authorization information from one central service to multiple less trusted services without having it tampered with. This works well for simple architectures like monoliths, but will soon force some tradeoffs in complexity or safety when used in today's microservices or federated architectures.
It was also specified with a number of pitfalls that created a number of security incidents over the years. Projects like [PASETO](https://paseto.io/) address these issues within the same scope as JWT.

Biscuit builds upon the experience earned developing authorization systems with JWT and other tools, takes steps to address their risks, and clearly target the larger systems we are now building.


## What is your favorite Biscuit recipe?

If you read French and tolerate the metric system (it's a big ask, we know), have a look at this recipe: <https://www.gourmandiseries.fr/palets-bretons/>.
