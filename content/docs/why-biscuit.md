+++
title = "Why biscuit"
description = "Learn more"
date = 2023-04-20T19:30:00+00:00
updated = 2023-04-20T19:30:00+00:00
draft = false
weight = 30
sort_by = "weight"
template = "docs/page.html"

[extra]
toc = true
top = false
+++

Eclipse Biscuit has been created in the context of distributed systems where centralized authorization is not possible. As such, it is particulary suited for microservices architecture, even though it could also be used in more centralized systems.

## Goals

Eclipse Biscuit is an authorization token with the following properties:

- distributed authorization: any node is able validate a token only with public information;
- offline attenuation: a new, valid token can be created from another one by attenuating its rights, by its holder, without communicating with anyone;
- capabilities based: the token itself can carry rights information, instead of being tied to an identity that provides it;
- flexible rights managements: the token uses a logic language to specify attenuation and to add bounds on ambient data, it can model from small rules like expiration dates, to more flexible architectures like hierarchical roles and user delegation;
- small enough to fit anywhere (cookies, etc).

## Non goals

### Authentication

This is not a new authentication protocol. Biscuit tokens can be used as opaque tokens delivered by other systems such as OAuth. Authentication data can be carried within a token, but biscuit does not specify anything related to authentication.

### Revocation

Biscuit generates unique revocation identifiers for each token, and can provide expiration dates as well, but revocation requires external state management (revocation lists, databases, etc) that is out of the scope of the biscuit specification.

Revocation systems and strategies are covered on this website: [revocation recipes](/docs/guides/revocation/).
