# Java


The Java version of Biscuit can be found on [Github](https://github.com/eclipse-biscuit/biscuit-java),
and [maven](https://search.maven.org/artifact/org.biscuitsec/biscuit).

## Install

In `pom.xml`:

```toml
<dependency>
    <groupId>org.biscuitsec</groupId>
    <artifactId>biscuit</artifactId>
    <version>2.3.1</version>
    <type>jar</type>
</dependency>
```

## Create a root key

```java
public KeyPair root() {
    return new KeyPair();
}
```

## Create a token

```java
public Biscuit createToken(KeyPair root) throws Error {
    return Biscuit.builder(root)
            .add_authority_fact("user(\"1234\")")
            .add_authority_check("check if operation(\"read\")")
            .build();
}
```

## Create an authorizer

```java
public Tuple2<Long, WorldAuthorized> authorize(KeyPair root, byte[] serializedToken) throws NoSuchAlgorithmException, SignatureException, InvalidKeyException, Error {
    return Biscuit.from_bytes(serializedToken, root.public_key()).authorizer()
            .add_fact("resource(\"/folder1/file1\")")
            .add_fact("operation(\"read\")")
            .allow()
            .authorize();
}
```

## Attenuate a token

```java
public Biscuit attenuate(KeyPair root, byte[] serializedToken) throws NoSuchAlgorithmException, SignatureException, InvalidKeyException, Error {
    Biscuit token = Biscuit.from_bytes(serializedToken, root.public_key());
    Block block = token.create_block().add_check("check if operation(\"read\")");
    return token.attenuate(block);
}
```

## Seal a token

```java
Either<Error, byte[]> sealed_token = token.seal();
```

## Reject revoked tokens

The `revocation_identifiers` method returns the list of revocation identifiers as byte arrays.

```java
List<RevocationIdentifier> revocation_ids = token.revocation_identifiers();
```

## Query data from the authorizer

The `query` method takes a rule as argument and extract the data from generated facts as tuples.

```java
public Set<Fact> query(Authorizer authorizer) throws Error.Timeout, Error.TooManyFacts, Error.TooManyIterations, Error.Parser {
    return authorizer.queryAll("data($name, $id) <- user($name, $id)");
}
```
