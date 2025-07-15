+++
title = "Biscuit snapshots"
description = "A key feature for auditing & debugging"
date = 2023-11-20T00:09:00+02:00
draft = false
template = "blog/page.html"

[taxonomies]
authors = ["clementd"]

[extra]
lead = "What are biscuit snapshots, how do they work and how can they be useful"
+++

One of the defining features in biscuit is the common language for authorization policies. Along with the cryptographic constructs used in tokens, it is what allows offline attuenation.

A common language for policies means that we can have a standardized serialization format, which in turn means it can be embedded in a token, which gives us offline attenuation. Neat!

It turns out that being able to serialize authorization policies gives us another benefit: it is possible to take a snapshot of an authorization process and save it for later. That's what we'll talk about today.

## Authorizer snapshots

In [`biscuit-rust`][biscuit-rust] and most biscuit libraries, the authorization process is carried out through an [`Authorizer`][authorizer] value.

An [`Authorizer`][authorizer] is created from a biscuit token, along with facts, rules, checks, and policies added by the authorizing party.

Once all this has been provided, the [`Authorizer`][authorizer] runs datalog evaluation (it repeatedly generates new datalog facts from rules unless no new facts can be generated). Once this is done, checks and policies are evaluated and are used to compute the authorization result (all checks have to pass, and the first policy to match must be an `allow` policy). The [`Authorizer`][authorizer] makes sure these two steps are carried out in a timely fashion by aborting after a specified timeout, if too many facts are generated, or after a specific amount of iterations. This is crucial to make sure authorization does not become a DoS target.

The good news is that an [`Authorizer`][authorizer] only contains serializable data, and as such can be stored, logged, or displayed.

Here is an example of creating a snapshot with [`biscuit-rust`][biscuit-rust].

```rust
let mut authorizer = authorizer!(
  r#"time({now});
  resource("/file1.txt");
  operation("read");
  check if user($user);
  allow if right("/file1.txt", "read");
  "#,
  now = SystemTime::now(),
);
authorizer.add_token(biscuit);
let result = authorizer.authorize();
println!("{}", authorizer.to_base64_snapshot());
```

This will give you something like:

```
 CgkI6AcQZBjAhD0Q2YkBGvMBCAQSCi9maWxlMS50eHQSBDEyMzQiRBADGgkKBwgKEgMYgQgaDQoLCAQSAxiACBICGAAqJgokCgIIGxIGCAUSAggFGhYKBAoCCAUKCAoGIIDEpKsGCgQaAggAKjUQAxoJCgcIAhIDGIAIGggKBggDEgIYABoMCgoIBRIGILCX3aoGKg4KDAoCCBsSBggKEgIICjIVChEKAggbEgsIBBIDGIAIEgIYABAAOicKAgoAEggKBggDEgIYABIJCgcIAhIDGIAIEgwKCggFEgYgsJfdqgY6HgoCEAASDQoLCAQSAxiACBICGAASCQoHCAoSAxiBCEAA 
```

Once you have that, you can inspect it with the CLI:

```
$ echo "CgkI6AcQZBjAhD0Q2YkBGvMBCAQSCi9maWxlMS50eHQSBDEyMzQiRBADGgkKBwgKEgMYgQgaDQoLCAQSAxiACBICGAAqJgokCgIIGxIGCAUSAggFGhYKBAoCCAUKCAoGIIDEpKsGCgQaAggAKjUQAxoJCgcIAhIDGIAIGggKBggDEgIYABoMCgoIBRIGILCX3aoGKg4KDAoCCBsSBggKEgIICjIVChEKAggbEgsIBBIDGIAIEgIYABAAOicKAgoAEggKBggDEgIYABIJCgcIAhIDGIAIEgwKCggFEgYgsJfdqgY6HgoCEAASDQoLCAQSAxiACBICGAASCQoHCAoSAxiBCEAA" \
  | biscuit inspect-snapshot -

// Facts:
// origin: 0
right("/file1.txt", "read");
user("1234");
// origin: authorizer
operation("read");
resource("/file1.txt");
time(2023-11-17T11:17:04Z);

// Checks:
// origin: authorizer
check if user($user);
// origin: 0
check if time($time), $time < 2023-12-01T00:00:00Z;

// Policies:
allow if right("/file1.txt", "read");

⏱️ Execution time: 17μs (0 iterations)
🙈 Datalog check skipped 🛡️
```

Or directly with the [web-based snapshot inspector](/docs/tooling/snapshot-inspector/):

<bc-snapshot-printer snapshot="CgkI6AcQZBjAhD0Q2YkBGvMBCAQSCi9maWxlMS50eHQSBDEyMzQiRBADGgkKBwgKEgMYgQgaDQoLCAQSAxiACBICGAAqJgokCgIIGxIGCAUSAggFGhYKBAoCCAUKCAoGIIDEpKsGCgQaAggAKjUQAxoJCgcIAhIDGIAIGggKBggDEgIYABoMCgoIBRIGILCX3aoGKg4KDAoCCBsSBggKEgIICjIVChEKAggbEgsIBBIDGIAIEgIYABAAOicKAgoAEggKBggDEgIYABIJCgcIAhIDGIAIEgwKCggFEgYgsJfdqgY6HgoCEAASDQoLCAQSAxiACBICGAASCQoHCAoSAxiBCEAA"></bc-snapshot-printer>

Here you can see the whole authorization context, as well as interesting metadata such as the time taken by the authorization process (17μs, not too bad) and the number of iterations needed by fact generation (here, 0 as there are no rules).

## Snapshots use cases

### Auditing & debugging

Being able to inspect the full authorization context after the fact feels a bit like a superpower. You can confidently say why a request was granted or denied after the fact. This can save you hours of work when trying to debug a gnarly authorization issues, instead of trying to modify your access policies until something works.

I have found snapshots to be immensely valuable when working on complex authorization logic. Instead of using a debugger or putting `println!()` calls everywhere, I just printed an authorizer snapshot and inspected it interactively with `biscuit-cli`. For instance, `biscuit-cli` lets me run queries on snapshots, which helped me easily detect typos or test predicates.

A similar use-case is auditing access. For highly sensitive operations, you might want to keep track of who is accessing resources, and why they are allowed to. Snapshots are a perfect use-case for that.

### Resumable execution

Snapshots allow separating the authorization process in several steps: first you create an authorizer from a biscuit token, and then pass the authorizer around (serialized through a snapshot), to finally resume authorization somewhere else. While doing it in one step is better in most cases, some software stacks can be overly restrictive and force a separate authentication step (verify biscuit signatures) before authorization (evaluate datalog policies).

## Tooling support

Saving and loading snapshots is available in [`biscuit-rust`][biscuit-rust] and [`biscuit-python`][biscuit-python].

[`biscuit-cli`][biscuit-cli] also lets you save a snapshot (`biscuit inspect --dump-snapshot-to`) and inspect a snapshot (`biscuit inspect-snapshot`), with optional authorizer code and queries. [`biscuit-web-components`][biscuit-web-components] provides a `<bc-snapshot-printer>` component, which allows inspecting and querying snapshot.

[biscuit-rust]: https://crates.io/crates/biscuit-auth
[biscuit-cli]: https://github.com/eclipse-biscuit/biscuit-cli
[biscuit-web-components]: https://doc.biscuitsec.org/usage/web-components
[biscuit-python]: https://pypi.org/project/biscuit-python/
[authorizer]: https://docs.rs/biscuit-auth/4.0.0/biscuit_auth/struct.Authorizer.html
