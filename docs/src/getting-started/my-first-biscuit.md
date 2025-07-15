# My first biscuit

## Creating a biscuit

Creating a biscuit requires two things:

- a private key that will allow receiving parties to trust the biscuit contents
- an authority block carrying information (and possibly restrictions)

### Creating a private key

The private key can be generated with the biscuit CLI:

```
❯ biscuit keypair
Generating a new random keypair
Private key: 473b5189232f3f597b5c2f3f9b0d5e28b1ee4e7cce67ec6b7fbf5984157a6b97
Public key: 41e77e842e5c952a29233992dc8ebbedd2d83291a89bb0eec34457e723a69526
```

The private key is used to generate biscuits, while the public key can be distributed to all services who will use biscuits to authorize requests.

### Creating a biscuit token

The most important part of a biscuit is its _authority block_. It contains data that is signed with the private key, and that can be trusted by receiving parties. The authority block is declared in
_datalog_. Datalog is a declarative logic language that is a subset of Prolog.
A Datalog program contains "facts", which represent data, and "rules", which can generate new facts from existing ones.

In our example, we will create a token that identifies its carrier as a _user_ whose user id is `"1234"`.
To do so, we will create a file named `authority.biscuit-datalog`, with the following contents:

_authority.biscuit-datalog_

<bc-datalog-editor>
<pre><code>
user("1234");
</code></pre>
</bc-datalog-editor> 

This is a datalog _fact_: the fact name is `user`, and it has a single attribute (`"1234"`). Facts can have several attributes, of various types (ints, strings, booleans, byte arrays, dates, sets).

Now we have a private key and an authority block, we can go ahead and generate a biscuit:

```
❯ biscuit generate --private-key 473b5189232f3f597b5c2f3f9b0d5e28b1ee4e7cce67ec6b7fbf5984157a6b97 authority.biscuit-datalog
En0KEwoEMTIzNBgDIgkKBwgKEgMYgAgSJAgAEiBw-OHV3egI0IVjiC1vdB7WZ__t0FCvB2s-81PexdwuqxpAolMr9XDP7T44qgdXxtumc2P3O93pCHaGSuBUs3_f8nsQJ7NU6PdkujZIMStzEJ36CDnxawSZjUAKoTO-a1cCDSIiCiBPsG53WHcpxeydjSpFYNYnvPAeM1tVBvOEG9SQgMrzbw==
```

You can inspect the generated biscuit with `biscuit inspect`:

```
❯ biscuit inspect -
Please input a base64-encoded biscuit, followed by <enter> and ^D
En0KEwoEMTIzNBgDIgkKBwgKEgMYgAgSJAgAEiBw-OHV3egI0IVjiC1vdB7WZ__t0FCvB2s-81PexdwuqxpAolMr9XDP7T44qgdXxtumc2P3O93pCHaGSuBUs3_f8nsQJ7NU6PdkujZIMStzEJ36CDnxawSZjUAKoTO-a1cCDSIiCiBPsG53WHcpxeydjSpFYNYnvPAeM1tVBvOEG9SQgMrzbw==
Authority block:
== Datalog ==
user("1234");

== Revocation id ==
a2532bf570cfed3e38aa0757c6dba67363f73bdde90876864ae054b37fdff27b1027b354e8f764ba3648312b73109dfa0839f16b04998d400aa133be6b57020d

==========

🙈 Public key check skipped 🔑
🙈 Datalog check skipped 🛡️

```

Biscuit also provides web components that let you inspect biscuits in the browser:

<bc-token-printer biscuit="En0KEwoEMTIzNBgDIgkKBwgKEgMYgAgSJAgAEiBw-OHV3egI0IVjiC1vdB7WZ__t0FCvB2s-81PexdwuqxpAolMr9XDP7T44qgdXxtumc2P3O93pCHaGSuBUs3_f8nsQJ7NU6PdkujZIMStzEJ36CDnxawSZjUAKoTO-a1cCDSIiCiBPsG53WHcpxeydjSpFYNYnvPAeM1tVBvOEG9SQgMrzbw==" readonly="true"></bc-token-printer>

## Authorizing a biscuit

Now that we have a biscuit, let's have a look at how a service can _authorize_ a request based on a biscuit.

To do so, the service provides an authorizer, built with:

- _facts_ about the request (current time, resource being accessed, type of the operation)
- _facts_ or _rules_ about access control (ACLs, access matrix)
- _checks_ to apply some restrictions (every check has to pass for the authorization to succeed)
- _policies_, which are tried in order, the first one to match decides if the authorization passes or fails

In our case, we'll assume the token is used for a `write` operation on the `resource1` resource.

_authorizer.biscuit-datalog_

<bc-datalog-editor>
<pre><code>
// request-specific data
operation("write");
resource("resource1");
time(2021-12-21T20:00:00Z);
// server-side ACLs
right("1234", "resource1", "read");
right("1234", "resource1", "write");
right("1234", "resource2", "read");
is_allowed($user, $res, $op) <-
  user($user),
  resource($res),
  operation($op),
  right($user, $res, $op);
// the request can go through if the current user
// is allowed to perform the current operation
// on the current resource
allow if is_allowed($user, $resource, $op);
</code></pre>
</bc-datalog-editor> 

There's a bit more happening here: the first three facts give info about the request. Then we have ACLs (they can be declared statically for a small, static user base, or fetched from DB based on the token user).

`is_allowed` is more interesting: it's a _rule_. If, given a user, a resource and an operation, there's a `right` fact that puts them all together, then we know the request can go through.

With all that done, we can go ahead and check our biscuit:

```
❯ biscuit inspect - --verify-with-file authorizer.datalog --public-key 41e77e842e5c952a29233992dc8ebbedd2d83291a89bb0eec34457e723a69526
Please input a base64-encoded biscuit, followed by <enter> and ^D
En0KEwoEMTIzNBgDIgkKBwgKEgMYgAgSJAgAEiBw-OHV3egI0IVjiC1vdB7WZ__t0FCvB2s-81PexdwuqxpAolMr9XDP7T44qgdXxtumc2P3O93pCHaGSuBUs3_f8nsQJ7NU6PdkujZIMStzEJ36CDnxawSZjUAKoTO-a1cCDSIiCiBPsG53WHcpxeydjSpFYNYnvPAeM1tVBvOEG9SQgMrzbw==
Authority block:
== Datalog ==
user("1234");

== Revocation id ==
a2532bf570cfed3e38aa0757c6dba67363f73bdde90876864ae054b37fdff27b1027b354e8f764ba3648312b73109dfa0839f16b04998d400aa133be6b57020d

==========

✅ Public key check succeeded 🔑
✅ Authorizer check succeeded 🛡️
Matched allow policy: allow if is_allowed($user, $resource, $op)
```

<bc-token-printer biscuit="En0KEwoEMTIzNBgDIgkKBwgKEgMYgAgSJAgAEiBw-OHV3egI0IVjiC1vdB7WZ__t0FCvB2s-81PexdwuqxpAolMr9XDP7T44qgdXxtumc2P3O93pCHaGSuBUs3_f8nsQJ7NU6PdkujZIMStzEJ36CDnxawSZjUAKoTO-a1cCDSIiCiBPsG53WHcpxeydjSpFYNYnvPAeM1tVBvOEG9SQgMrzbw==" readonly="true" rootPublicKey="ed25519/41e77e842e5c952a29233992dc8ebbedd2d83291a89bb0eec34457e723a69526" showAuthorizer="true">
  <code class="authorizer">
// request-specific data
operation("write");
resource("resource1");
time(2021-12-21T20:00:00Z);
// server-side ACLs
right("1234", "resource1", "read");
right("1234", "resource1", "write");
right("1234", "resource2", "read");
is_allowed($user, $res, $op) <-
  user($user),
  resource($res),
  operation($op),
  right($user, $res, $op);
// the request can go through if the current user
// is allowed to perform the current operation
// on the current resource
allow if is_allowed($user, $resource, $op);
  </code>
</bc-token-printer>

The CLI checks the biscuit signatures, and then the datalog engine will try to match policies. Here,
it succeeded, and the CLI shows you the policy that matched.

## Attenuating a biscuit

One of biscuit's strengths is the ability to attenuate tokens, restricting their use.
Attenuating a biscuit token is done by appending a block containing a _check_.
Let's attenuate our first token by adding a TTL (Time To Live) check: this way the new
token will only be usable for a given period of time. In the authorizer above, we provided
a `time` fact, that was not used in a policy or a check. We can add a block that will make
sure the token is not used after a certain date.

_block1.biscuit-datalog_

<bc-datalog-editor>
<pre><code>
check if time($time), $time <= 2021-12-20T00:00:00Z;
</code></pre>
</bc-datalog-editor> 

The check requires two things to suceed: first, the current time must be declared through the `time()` fact, and the current time must be smaller than `2021-12-20T00:00:00Z`.

We can create a new token by appending this block to our existing token:

```
❯ biscuit attenuate - --block-file 'block1.biscuit-datalog'
Please input a base64-encoded biscuit, followed by <enter> and ^D
En0KEwoEMTIzNBgDIgkKBwgKEgMYgAgSJAgAEiBw-OHV3egI0IVjiC1vdB7WZ__t0FCvB2s-81PexdwuqxpAolMr9XDP7T44qgdXxtumc2P3O93pCHaGSuBUs3_f8nsQJ7NU6PdkujZIMStzEJ36CDnxawSZjUAKoTO-a1cCDSIiCiBPsG53WHcpxeydjSpFYNYnvPAeM1tVBvOEG9SQgMrzbw==
En0KEwoEMTIzNBgDIgkKBwgKEgMYgAgSJAgAEiBw-OHV3egI0IVjiC1vdB7WZ__t0FCvB2s-81PexdwuqxpAolMr9XDP7T44qgdXxtumc2P3O93pCHaGSuBUs3_f8nsQJ7NU6PdkujZIMStzEJ36CDnxawSZjUAKoTO-a1cCDRqUAQoqGAMyJgokCgIIGxIGCAUSAggFGhYKBAoCCAUKCAoGIICP_40GCgQaAggCEiQIABIgkzpUMZubXcd8K7mWNchjb0D2QXeYoWtlZw2KMryKubUaQOFlx4iPKUqKeJrEH4MKO7tjM3H9z1rYbOj-gKGTtYJ4bac0kIoWl9v_7q7qN7fQJJgj0IU4jx4_QhxIk9SeigMiIgogqvHkuXrYkoMRvKgT9zNV4BEKC5W2K8L7NcGiX44ASwE=
```

Now, let's try to check it again (pay special attention to the `time` fact we added in the authorizer):

<bc-token-printer biscuit="En0KEwoEMTIzNBgDIgkKBwgKEgMYgAgSJAgAEiBw-OHV3egI0IVjiC1vdB7WZ__t0FCvB2s-81PexdwuqxpAolMr9XDP7T44qgdXxtumc2P3O93pCHaGSuBUs3_f8nsQJ7NU6PdkujZIMStzEJ36CDnxawSZjUAKoTO-a1cCDRqUAQoqGAMyJgokCgIIGxIGCAUSAggFGhYKBAoCCAUKCAoGIICP_40GCgQaAggCEiQIABIgkzpUMZubXcd8K7mWNchjb0D2QXeYoWtlZw2KMryKubUaQOFlx4iPKUqKeJrEH4MKO7tjM3H9z1rYbOj-gKGTtYJ4bac0kIoWl9v_7q7qN7fQJJgj0IU4jx4_QhxIk9SeigMiIgogqvHkuXrYkoMRvKgT9zNV4BEKC5W2K8L7NcGiX44ASwE=" readonly="true" rootPublicKey="ed25519/41e77e842e5c952a29233992dc8ebbedd2d83291a89bb0eec34457e723a69526" showAuthorizer="true">
  <code class="authorizer">
// request-specific data
operation("write");
resource("resource1");
time(2021-12-21T20:00:00Z);
// server-side ACLs
right("1234", "resource1", "read");
right("1234", "resource1", "write");
right("1234", "resource2", "read");
is_allowed($user, $res, $op) <-
  user($user),
  resource($res),
  operation($op),
  right($user, $res, $op);
// the request can go through if the current user
// is allowed to perform the current operation
// on the current resource
allow if is_allowed($user, $resource, $op);
  </code>
</bc-token-printer>

```
❯ biscuit inspect - --verify-with-file authorizer.biscuit-datalog --public-key 41e77e842e5c952a29233992dc8ebbedd2d83291a89bb0eec34457e723a69526
Please input a base64-encoded biscuit, followed by <enter> and ^D
En0KEwoEMTIzNBgDIgkKBwgKEgMYgAgSJAgAEiBw-OHV3egI0IVjiC1vdB7WZ__t0FCvB2s-81PexdwuqxpAolMr9XDP7T44qgdXxtumc2P3O93pCHaGSuBUs3_f8nsQJ7NU6PdkujZIMStzEJ36CDnxawSZjUAKoTO-a1cCDRqUAQoqGAMyJgokCgIIGxIGCAUSAggFGhYKBAoCCAUKCAoGIICP_40GCgQaAggCEiQIABIgkzpUMZubXcd8K7mWNchjb0D2QXeYoWtlZw2KMryKubUaQOFlx4iPKUqKeJrEH4MKO7tjM3H9z1rYbOj-gKGTtYJ4bac0kIoWl9v_7q7qN7fQJJgj0IU4jx4_QhxIk9SeigMiIgogqvHkuXrYkoMRvKgT9zNV4BEKC5W2K8L7NcGiX44ASwE=
Authority block:
== Datalog ==
user("1234");

== Revocation id ==
a2532bf570cfed3e38aa0757c6dba67363f73bdde90876864ae054b37fdff27b1027b354e8f764ba3648312b73109dfa0839f16b04998d400aa133be6b57020d

==========

Block n°1:
== Datalog ==
check if time($time), $time <= 2021-12-20T00:00:00Z;

== Revocation id ==
e165c7888f294a8a789ac41f830a3bbb633371fdcf5ad86ce8fe80a193b582786da734908a1697dbffeeaeea37b7d0249823d085388f1e3f421c4893d49e8a03

==========

✅ Public key check succeeded 🔑
❌ Authorizer check failed 🛡️
An allow policy matched: allow if is_allowed($user, $resource, $op)
The following checks failed:
  Block 1 check: check if time($time), $time <= 2021-12-20T00:00:00Z
```

Here it failed because the date provided in the authorizer (`time(2021-12-21T20:00:00Z)`) is greater
than the expiration date specified in the check (`check if time($time), $time <= 2021-12-20T00:00:00+00:00`).

## Going further

You can learn more about datalog by reading [the datalog reference](../reference/datalog.md).
