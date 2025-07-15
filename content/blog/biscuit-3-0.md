+++
title = "Biscuit 3.0"
description = "Version 3.0.0 of the biscuit reference implementation has been released"
date = 2023-03-29T00:09:00+02:00
draft = false
template = "blog/page.html"

[taxonomies]
authors = ["clementd"]

[extra]
lead = "The Biscuit reference implementation in Rust has been released, with full support for the latest spec additions"
+++

Biscuit is a specification for a cryptographically verified authorization token
supporting offline attenuation, and a language for authorization policies based on Datalog.
It is used to build decentralized authorization systems, such as microservices architectures,
or advanced delegation patterns with user facing systems.
After 5 years of development, Biscuit is now at its third major version, opening up
new patterns of authorization.

## The biscuit specification and the library ecosystem

Biscuit is published as specification, along with several implementations.
Amongst them, [`biscuit-rust`][biscuit-rust] is the reference implementation. It
is used when programming in rust, but it also powers [`biscuit-wasm`][biscuit-wasm]
which provides support for javascript applications (both client-side and
server-side), and [`biscuit-web-components`][biscuit-web-components] which provides
in-browser interactive tooling.

## Biscuit v3

Motivated by [third-party blocks][third-party-blocks], a new specification
version was released. In addition to third-party blocks, a few other changes
have been included in the new version.

- support for `check all`
- support for bitwise operators
- support for `!=`
- support for authorizer snapshots

### A word on biscuit versions

The currently supported biscuit versions are `v2` and `v3`. Those two versions
are compatible and `v3` is opt-in: if you don't use any new feature from
biscuit v3, the generated tokens will work with implementations only supporting
`v2` biscuits. Of course, `v2` biscuits continue being supported by new
implementations. It is even possible to attenuate a `v2` biscuit with `v3`
features.

## biscuit-rust v3.0.0

The last stable release of `biscuit-rust` was `v2.2.0`, published ten months
ago. While support for third-party blocks and other `v3` features make for
the bulk of the changes, the library itself has been improved. The biggest
improvement would be the datalog macros (introduced in `v2.2.0`) which are now
covering all use-cases in a performant fashion.

### Third-party blocks

Third-party blocks allow cross-domain authorization with fine-grained access
rules. This is an exciting development, since it makes distributed auth
patterns possible with no out-of-band synchronisation required: all required
information can be carried in a single biscuit token.

See more on [the post introducing third-party blocks][third-party-blocks].

```biscuit-datalog
// authority block, emitted by the login service.
// it only allows read access to the `file1` resource
user("clementd");
right("file1", "read");
// the fact `member("pink-floyd-fans")`; has to come from a block
// signed by the social network: this is enforced via the public key check
// so the token is effectively inert as long as it is not augmented by the
// social network service.
check if member("pink-floyd-fans") trusting ed25519/398ad724c0da3756bb8709a85179a3ff9c34f8ec08317c3d8f79d75db7eab014;

// block provided by the social network
// it provides the proof that the holder is part of the pink-floyd-fans group, but adds
// a check: the proof is valid only for a limited amount of time
// this block carries a signature that can be verified with the following
// public key: 398ad724c0da3756bb8709a85179a3ff9c34f8ec08317c3d8f79d75db7eab014
member("pink-floyd-fans");
check if time($time), $time < 2022-08-01T00:00;

// verifier policy.
allow if right("file1", "read");
```

### Datalog macros

Biscuit comes with a powerful DSL for authorization rules. A common pain
point with using DSLs is using dynamic values within an embedded program.
Concatenating strings opens the door to nasty security issues. SQL injections
are the infamous example of this kind of problem. Another frustrating issue
(at least for rust developers) is that when an embedded program is defined in
a regular string, it becomes opaque up until it is parsed at runtime. So we get
runtime errors on static elements, doubled with performance issues.

`biscuit-rust` provides a solution to both these issues:

- a parameter injection syntax allows splicing dynamic values with no risk
  of injections;
- a series of macros move datalog parsing to compile-time, providing both static
  guarantees and performant code.

```rust
let user_id = "1234";
let expiration = SystemTime::now() + Duration::from_secs(86400);
let mut authority = biscuit!(r#"
  user({user_id});
  check if time($time), $time < {expiration};
  "#
);

let rights = ["read", "write"];
for right in rights {
  biscuit_merge!(&mut authority, r#"
    right({right});
  "#);
}
```

Do note that the parameter injection syntax is also available for runtime
parsing:

```rust
let user_id = "1234";
let expiration = SystemTime::now() + Duration::from_secs(86400);
let mut params = HashMap::new();
params.insert("user_id".to_string(), user_id.into());
params.insert("expiration".to_string(), expiration.into());

let mut authority = BiscuitBuilder::new();
authority.add_code_with_params(
    r#" user({user_id}); check if time($time), $time < {expiration}; "#,
    params,
    HashMap::new(),
)?;

let rights = ["read", "write"];
for right in rights {
    let mut fact: Fact = r#"right({right})"#.try_into()?;
    fact.set("right", right)?;
    authority.add_fact(fact)?;
}
```

This feature is what makes possible to provide safe interpolation in `biscuit-
wasm`.

### Authorizer snapshots

Another addition to the biscuit spec is *authorizer snapshots*. It is possible
to save the current state of an authorizer to a file, and then to load it back.

This allows authorizer evaluation: create an authorizer, pre-evaluate rules,
store it somewhere, and then resume execution once you have more context. This
can be useful in systems that enforce a strict authentication/authorization
separation.

Another use-case is *post-hoc inspection*. After performing authorization, you
can dump the full context to a file, and inspect it with the CLI afterwards. If
you have ever tried to debug authorization issues after the fact, then you might
find this useful.

```
> biscuit inspect-snapshot snapshot-file
time(2023-03-30T09:39:39Z);
user("1234");
right("file1", "read");
time(2023-03-30T09:39:39Z);

check if time($time), $time < 2023-03-31T00:00:00Z;

allow if right("file2", "read");
```

## biscuit-wasm v0.4.0

In addition to the [`biscuit-rust`][biscuit-rust] release, a release of
[`biscuit-wasm`][biscuit-wasm] is planned for the upcoming days.
`biscuit-wasm-0.4.0` will bundle all of the improvements from
`biscuit-rust-3.0.0` and will also pack JS-specific improvements. The most
important one is the JS counterpart to datalog macros in rust: tagged templates.

This is javascript, so there is no way to move datalog parsing to compile-time,
but at least parameter injection is handled nicely.

```javascript
let user_id = "1234";
let expiration = new Date(new Date().getTime() + 86400000);
let authority =
  biscuit`user(${user_id});
          check if time($time), $time < ${expiration}`;

for (let right of ["read", "write"]) {
   authority.add_fact(fact`right(${right})`);  
}

let token = authority.build(secretKey);
let auth = authorizer`time(${new Date()}); allow if user($u);`;
auth.authorize();
let facts = auth.query(rule`u($id) <- user($id)`);
```

## Other ongoing projects

While biscuit-rust and biscuit-wasm are where most of the work happens, there
are a few areas where things have happened.

- [biscuit-cli][biscuit-cli] allows manipulating and inspecting biscuits on the
  command line;
- [biscuit-dotnet][biscuit-dotnet] has been released recently, providing biscuit
  support to the dotnet platform;
- [biscuit-web-components][biscuit-web-components] provide an embeddable editor
  and token inspector.

### Syntax highlighting with tree-sitter

[Tree-sitter](https://tree-sitter.github.io) allows to provide syntax
highlighting and more advanced features (AST-based navigation) in a cross-editor
way. There are plugins for emacs and neovim, and modern editors like helix
support it out of the box. Not only this makes editing biscuit-datalog files
more convenient, but when paired with language injection, it also means that
editing a datalog snippet inside your programming language benefits from syntax
highlighting.

<figure>

![A code editor with a datalog program in it](/img/biscuit-3-editor-2.png)

<figcaption>Typing the contents of a biscuit token from within a code editor</figcaption>

</figure>

<figure>

![A datalog block within a markdown document](/img/biscuit-3-editor-3.png)

<figcaption>Datalog syntax highlighting within a markdown code fence</figcaption>

</figure>

<figure>

![A datalog snippet inside a javascript typed template string](/img/biscuit-3-editor-1.png)

<figcaption>Datalog syntax highlighting within javascript tagged template string</figcaption>

</figure>

In addition to the editor-agnostic grammar, editor-specific queries are needed
for highlighting and AST manipulation. As of now, those queries are only written
for the [helix](https://helix-editor.com) editor, but it is a fun project to add
support for other editors. Reach out to `clementd` on [matrix][matrix] if you
want to try!

## A word on [Outscale][outscale]

I ([Clément Delafargue](https://clementd.wtf)) have joined [Outscale][outscale]
last week, and working on biscuit is now a part of my job, since Outscale is
investing in biscuit. That's great news since it allows me to dedicate way more
time to biscuit. Some of my coworkers will also contribute to biscuit, so we
are planning to carry out improvements in several areas, including tutorials
and documentation.

[Outscale][outscale] is a French IaaS cloud provider, a brand
of Dassault Systèmes, providing services to customers with strong data security
and sovereignity constraints.

## Let's have a chat!

Please come have a chat on [our matrix room][matrix] if you have questions about
biscuit. There is a lot to discover!

[biscuit-rust]: https://github.com/eclipse-biscuit/biscuit-rust
[biscuit-wasm]: https://github.com/eclipse-biscuit/biscuit-wasm
[biscuit-cli]: https://github.com/eclipse-biscuit/biscuit-cli
[biscuit-dotnet]: https://github.com/dmunch/biscuit-net
[biscuit-web-components]: https://github.com/eclipse-biscuit/biscuit-web-components
[third-party-blocks]: ../third-party-blocks-why-how-when-who/
[matrix]: https://matrix.to/#/!MXwhyfCFLLCfHSYJxg:matrix.org
[outscale]: https://outscale.com
