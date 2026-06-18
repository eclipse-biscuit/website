+++
title = "Scopes based authorization"
description = "Reproducing JWT scopes with Biscuit"
date = 2023-02-21T08:00:00+00:00
updated = 2023-02-21T08:00:00+00:00
draft = false
weight = 10
sort_by = "weight"
template = "docs/page.html"

[extra]
lead = "Reproducing JWT scopes with Biscuit"
toc = true
top = false
+++

When coming to Biscuit from JWT based systems, it can be challenging to migrate tokens and authorization patterns at the same time. While most JWT claims like `aud` or `exp` are straightforward to reproduce as Biscuit policies, `scope` requires a bit more work. But this is where we get the quick wins with delegation!

In a JWT, scopes come as a space separated string, like this:

```json
{
  "scope": "read:article write:article read:comment write:comment"
}
```

In a Biscuit token, we can translate that as a fact containing a set of scopes:

{% display() %}
scope(["read:article", "write:article", "read:comment", "write:comment"]);
{% end %}

And when we get a request trying to write an article, we would check for the relevant scope like this:

{% display() %}
check if scope($scopes), $scopes.contains("write:article");
allow if true;
{% end %}

We can even check the presence of multiple scopes: `check if scope($scopes), $scopes.contains(["read:comment", "write:comment"])`.

While this is already useful for an initial migration, we can introduce attenuation with a small change. What if we could restrict the set of scopes by attenuating the token?

The `check all` syntax allows use to verify a condition on all the facts that are matched. So if we had the same token as above, then attenuated to one containing the same scopes, but without `write:article`, we would get this authorizer content:

{% datalog() %}
// scopes from the first block
scope(["read:article", "write:article", "read:comment", "write:comment"]);
// scopes from the second block
scope(["read:article", "read:comment", "write:comment"]);

// this succeeds because "read:article" is present in both blocks
check all scope($scopes), $scopes.contains("read:article");

// this fails because "write:article" is absent from the second blocks
check all scope($scopes), $scopes.contains("write:article");

allow if true;
{% end %}