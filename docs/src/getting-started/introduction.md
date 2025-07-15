# Introduction

![Biscuit banner](../images/banner.jpg)


Eclipse Biscuit is a set of building blocks for your authorization layer. By making a coherent experience from the authorization token up to the tools to write policies, it spares you the time spent binding together token scopes, authorization servers, and making sure authorization policies execute correctly in every service. You only need to focus on writing, debugging and deploying your rules.

## Biscuit is a bearer token

One of those building blocks is an authorization token that is signed with public key cryptography (like JWT), so that any service knowing the public key can verify the token. The Biscuit token can be transported along with a request, in a cookie, authorization header, or any other mean. It can be stored as binary data, or base64 encoded. It is designed to be small enough for use in most protocols, and fast to verify to keep a low overhead in authorization.

The Biscuit token holds cryptographically signed data indicating the holder's basic rights, and additional constraints on the request. As an example, the token could define its use for read-only operations, or from a specific IP address.

Here is what a biscuit looks like: the left-hand side shows you the encoded token, while the right-hand side shows its contents. The first block (called the _authority block_) gives us what the token grants access to. The other two blocks restrict how the token can be used. Only the authority block can be created by the token emitter, while the other blocks can be freely added by intermediate parties (_offline attenuation_).

<bc-token-printer biscuit="En0KEwoEMTIzNBgDIgkKBwgKEgMYgAgSJAgAEiAs2CFWr5WyHHWEiMhTXxVNw4gP7PlADPaGfr_AQk9WohpA6LZTjFfFhcFQrMsp2O7bOI9BOzP-jIE5PGhha62HDfX4t5FLQivX5rUhH5iTv2c-rd0kDSazrww4cD1UCeytDSIiCiCfMgpVPOuqq371l1wHVhCXoIscKW-wrwiKN80vR_Rfzg==">
</bc-token-printer>

Biscuit also supports offline attenuation (like Macaroons). Meaning that from a Biscuit token, you can create a new one with more restrictions, without communicating with the service that created the token. The token can only be restricted, it will never gain more rights.

With that, you could have a token carried along with a series of requests between microservices, with the token reducing its rights as it goes deeper in the system. Or you could get a token from a git repository hosting service and attenuate it to just the set of rights needed for usage in CI.
Offline attenuation unlocks powerful delegation patterns, without needing to support them directly in the origin service.

For examples of token attenuation, see:
- [Rust](../usage/rust.md#attenuate-a-token)
- [Haskell](../usage/haskell.md#attenuate-a-token)

## Biscuit is a policy language

Authorization policies are written in a logic language derived from [Datalog](https://en.wikipedia.org/wiki/Datalog). Logic languages are well suited for authorization, because they can represent complex relations between elements (like roles, groups, hierarchies) concisely, and efficiently explore and combine multiple rules.

Biscuit's authorization rules can be provided by the authorizer's side, but also by the token. While the token can carry data, it can also contain "checks", conditions that the request must fulfill to be accepted. This is the main mechanism for attenuation: take an existing token, add a check for the current date (expiration) or the operation (restrict to read only).

Those authorization policies can be hardcoded in your application or be dynamically generated based on context.

### Authorization policy example

<bc-datalog-playground>
<pre><code class="authorizer">
// We receive a request to read "admin.doc"
// The request contains a token with the following content
user("1234"); // the user is identified as "1234"
check if operation("read"); // the token is restricted to read-only operations
// The authorizer loads facts representing the request
resource("admin.doc");
operation("read");
// The authorizer loads the user's rights
right("1234", "admin.doc", "read");
right("1234", "admin.doc", "write");
// Finally, the authorizer tests policies
// by looking for a set of facts matching them
allow if
  user($user_id),
  resource($res),
  operation($op),
  right($user_id, $res, $op);
</code></pre>
</bc-datalog-playground> 

## Biscuit is so much more

Biscuit also comes with a command line application to create, attenuate, inspect and authorize tokens, an online playground for Datalog policies, and web assembly components to make frontend tools around policies development.

To sum up, Biscuit provides tools to build a complete, cross platform authorization system:

- an authorization token, verified by public key cryptography, that supports offline attenuation
- a logic language based on Datalog to write authorization policies
- a server side library, available for multiple languages, to write authorizers in your applications
- a command line application to create, attenuate, inspect and authorize tokens
- WebAssembly components to create, attenuate, inspect and authorize tokens, as well as to write and debug authorization policies

## Going further

*[My First Biscuit](./my-first-biscuit.md):* Create and verify your first biscuit in a step-by-step guide.

*[Datalog Reference](../reference/datalog.md):* Learn about the logic language who's powering biscuits.

*[Recipes](../recipes.md):* Have a look at different ways to use biscuits to implement your security policies.

*[How to Contribute](https://www.biscuitsec.org/docs/contributing/how-to-contribute/):* Find out how to contribute to Biscuit.
