+++
title = "OAuth 2.0, OIDC and Biscuit"
description = "How Biscuit can fit in existing systems"
date = 2023-06-17T00:09:00+02:00
draft = false
template = "blog/page.html"

[taxonomies]
authors = ["geal"]

[extra]
lead = "How OAuth 2.0 and OIDC work, and how to integrate Biscuit with them"
+++

## OAuth 2

[OAuth 2.0](https://oauth.net/2/) is a series of specifications describing authorization and delegation flows between services. It looks at service access through a list of roles:
* *resource owner*: an agent that can give access to a resource. That can be a human, but also a service
* *resource server*: service holding the resources (data, specific actions to launch, etc), requiring authorization from the resource owner to give access to a client
* *client*: an application that accesses the resources on the resource server, on behalf on the resource owner. It could be anything, anywhere, like a mobile client in your phone that accesses data when you want to consult it, or a remote service that will periodically access your data to back it up
* *authorization server*: a service that issues access tokens used by the client to tell the resource server that they represent the resource owner
* *access token*: this can be anything, like a random string, or a cryptographic token like Biscuit, as long as the resource server can use it to recognize a specific resource owner

Depending on the system, some of those roles can be mixed: the resource server could also be the authorization server if they are in the same monolithic service, and the resource server and client could be the same web application.
Based on those roles, OAuth 2.0 defines a list of authorization flows, and they all follow a general pattern:
* the resource owner wants the client to access their resources
* the client contacts the authorization server to start the flow
* the authorization server requests that the resource owner explicitly accepts it, generally by redirecting the resource owner to a page on the authorization server, which might ask the user to reauthenticate via username, password, etc
* the authorization server delivers an access token to the client
* the client uses the access token to issue a request to the resource server

The different authorization flows target different use cases, like mobile applications, single page web applications, smart TVs…

## OIDC

[OpenID Connect](https://openid.net/connect/) builds upon OAuth 2.0 to provide an authentication layer. Why use OIDC instead of OAuth directly though? After all, getting an access token from the authorization server should be enough of a proof that the user is authenticated?

Let's consider this scenario:
* the user is connected to service A, a resource server and authorization server
* services B and C use OAuth access to service A for authentication: they redirect the user to service A to get an access token, then test the access token can actually access the resources
* the user connects to B and C using service A, so B and C received access token for the user's resources on A
* now, the malicious admin of service C wants to access service B. They start the OAuth authoization to service B, but at the point where they are redirected to A, and must return the new access token, they instead provide the token they already have for the user
* B checks that the token is valid, and lets them in

<details>
For people who like to understand a bit more, this is one of the reasons the OAuth implicit flow is deprecated, that scenario wouldn't work under the authorization code flow
</details>
This is the fundamental misunderstanding here: a well behaving OAuth client will keep the access token safe, because it needs it to access resources. But there is no guarantee that it was delivered specifically for this client, nor that the user actually gave consent during this process. A misbehaving application could just use it as an authentication proof anywhere else. And we're not even getting into the issue of applications using your Github or Twitter accounts supposedly only for authentication, but requiring write access to everything.

That is why the OIDC protocol was designed: providing a safer delegate authentication mechanism. Essentially, when a service requests that a user authenticates with an OIDC service, it will perform an OAuth authorization flow where the response contains an ID token. The ID token is a [JSON Web Token](https://datatracker.ietf.org/doc/html/rfc7519), which contains [a specific set of claims](https://openid.net/specs/openid-connect-core-1_0.html#IDToken) used to identify the user. Some of those claims are required and carry the security of the system, like `aud` indicating for which service this token was created, `auth_time` for the exact time when the authentication was performed, or the `nonce` claim containing a value provided in the authentication request (if it's not the same as what was requested, the token is considered invalid).
The application can even request more information in the ID token, like the user's email address or profile picture, if supported by the authentication server.

## Using OAuth with OIDC

Now a picture is forming of what happens in this process:
* service A is an OIDC server
* service B is an OAuth resource server and authorization server, and uses OIDC for authentication
* the user wants to connect their client to to B
* the client starts the OAuth authorization flow to B's authorization server
* the authorization server starts the authentication process with A
* the user authenticates to A (login, password, 2FA, etc)
* A returns an ID token to the authorization server
* the authorization server verifies the token, checks that they are the intended audience, and matches the subject identifier to the user they have in their database
* the authorization server delivers an access token for B to the client
* the client accesses resources on B

Now we may be tempted to use the ID token directly as an access token in B. But that would be making the same mistake as before: the ID token's intended audience is B, and that tells nothing about the relation between the client and B.

## Refresh tokens

In general, the OAuth authorization server delivers both an access token and a refresh token to the client. What's the difference?
* the access token is used to query the resource server, it is typically short lived and at high risk (travels regularly over the network)
* the refresh token is used to request a new access token from the authorization server. It is long lived, only the authorization server will ever see it, and according to current best practices, should be single use (the AS will deliver a new refresh token along with the new access token)

<details>
Making the refresh token single use gives a neat property: you can detect if it was stolen. If the attacker steals the refresh token and uses it to get a new access token, at some point the user will try to use it too to get a new access token. So if it is used twice, you know one of these uses is malicious, and that's when you raise an alert and <a href="https://www.biscuitsec.org/docs/guides/revocation/"> revoke all the tokens for this user</a>.
</details>

This is a way to reduce risks by having a short expiration for the access token, and a reduced attack surface for the authorization server if it is separated from the main application.

## Where do I use biscuits?

Now, how do we fit Biscuit tokens in that architecture?
- the ID token is, by specification, a JWT
- the refresh token is single use, to access only one server, so a random string stored in database is a much better fit there
- the OAuth specification [does not mandate a specific format for access tokens](https://datatracker.ietf.org/doc/html/rfc6749#section-1.4)

So OIDC and OAuth are used to first establish trust between the client and the server. After that, by using Biscuit in access tokens, that trust is carried forward with each request. The token can bear the exact set of rights that the user possesses. Those rights can then be attenuated per client/server request or between microservices, or even augmented at the gateway level with third-party blocks.
