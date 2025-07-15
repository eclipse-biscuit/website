+++
title = "Datalog"
description = "Datalog reference"
date = 2021-05-01T08:00:00+00:00
updated = 2021-05-01T08:00:00+00:00
draft = false
weight = 10
sort_by = "weight"
template = "docs/page.html"

[extra]
lead = "Eclipse Biscuit uses a dialect of Datalog for its authorization policies."
toc = true
top = false
+++

## Facts

In Datalog, data is represented by facts. They come in the format `fact_name(42, "string")`. The fact has a name that indicates the "type", and between parenthesis, a tuple of data. Facts could be seen as rows in a relational database.

All of the tasks around Datalog consists in selecting data from facts, and generating new ones.

### Namespacing

Fact names can contain colons (`:`). While they don’t mean anything particular to the datalog engine, they are meant as a namespace
separator: when your rules start to grow, or if you want to provide reusable rules that don’t clash with others, you can _namespace_
your datalog facts and rules:

```
service_a:fact_name(42);
```

## Data types

A fact contains data of the following types:

* integer: 64 bits signed integers `12`
* string: UTF-8 strings `"string"`
* byte array: represented as hexadecimal in the text format `hex:01A2`
* date: in [RFC 3339 format](https://datatracker.ietf.org/doc/html/rfc3339): `1985-04-12T23:20:50.52Z`
* boolean: `true` or `false`
* set: a deduplicated list of values of any type (except set)`[ "a", "b", "c"]`

## Rules

Rules are used to generate new facts from existing ones. They specify a pattern to select facts and extract data from them.
When we execute the rule `right($resource, "write") <- user($user_id), owner($user_id, $resource)`, we will look at all the `user` facts, and for each one, look at the `owner` facts with a matching `$user_id` value, select the second element from the fact with the `$resource` variable, and create a new fact from it.

With the following facts:

```
user(1);
owner(1, "file1.txt");
owner(1, "file2.txt");
owner(2, "file3.txt");
```

It will generate the facts:

```
right("file1.txt", "write");
right("file2.txt", "write");
```

A rule contains data of the following types:

* variable: `$variable`
* integer: 64 bits signed integers `12`
* string: UTF-8 strings `"string"`
* byte array: represented as hexadecimal in the text format `hex:01A2`
* date: in [RFC 3339 format](https://datatracker.ietf.org/doc/html/rfc3339): `1985-04-12T23:20:50.52Z`
* boolean: `true` or `false`
* set: a deduplicated list of values of any type (except set or variable)`[ "a", "b", "c"]`

### Expressions

Rules filter data by matching between facts, but also by putting constraints on the variables. We could add a path prefix constraint to our previous rule like this: `right($resource, "write") <- user($user_id), owner($user_id, $resource), $resource.starts_with("/folder1/")`

Expressions return a boolean. If all the expressions in a rule return true for a selection of facts, it will produce a new fact.

Expressions can use the following operations:

#### Unary operations

Here are the currently defined unary operations:

* parens: returns its argument without modification : `1 + ( 2 + 3 )`
* negate: boolean negation `!( 1 < 2 )`
* length: defined on strings, byte arrays and sets, returns an int `"hello".length()`

#### Binary operations

Here are the currently defined binary operations:

* less than, defined on integers and dates, returns a boolean `<`
* greater than, defined on integers and dates, returns a boolean `>`
* less or equal, defined on integers and dates, returns a boolean `<=`
* greater or equal, defined on integers and dates, returns a boolean `>=`
* equal, defined on integers, strings, byte arrays, dates, set, returns a boolean `==`
* contains takes either:
  * a set and another value as argument, returns a boolean. Between two sets, indicates if the first set is a superset of the second one `$set.contains(1)`
  * two strings, and returns a boolean, indicating if the second string is a substring of the first `"a long string".contains("long")`
* prefix, defined on strings, returns a boolean `$str.starts_with("hello")`
* suffix, defined on strings, returns a boolean `$str.ends_with("world")`
* regex, defined on strings, returns a boolean `$str.matches("ab?c")`
* add, defined:
  * on integers, returns an integer `+`
  * on strings, concatenates two strings `"a long" + " string"`
* sub, defined on integers, returns an integer `-`
* mul, defined on integers, returns an integer `*`
* div, defined on integers, returns an integer `/`
* and, defined on booleans, returns a boolean `&&`
* or, defined on booleans, returns a boolean `||`
* intersection, defined on sets, return a set that is the intersection of both arguments `$set.intersection([1, 2])`
* union, defined on sets, return a set that is the union of both arguments `$set.union([1, 2])`

### Checks and allow/deny policies

Datalog authorization is enforced by checks and allow/deny policies. All the checks will be evaluated, and if one of them does not validate, the request will be rejected. Policies are evaluated one by one, in the order specified by the authorizer, stopping at the first that triggers. If it was a deny policy, the request will be rejected. If it was an allow policy, and all checks passed, the request will be accepted.
If no policy matched, the request is rejected.

They have a format similar to rules:

```
// check
check if right("file1.txt", "read");

// allow policy
allow if user("admin");

// deny policy
deny if true;
```
