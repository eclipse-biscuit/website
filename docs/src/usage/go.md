# Go

The Go version of Biscuit can be found on [Github](https://github.com/eclipse-biscuit/biscuit-go).

## Install

With Go get:

```
	go get github.com/biscuit-auth/biscuit-go/v2@v2
```

In `go.mod`:

```
require(
    github.com/biscuit-auth/biscuit-go/v2 v2.2.0
)
```

## Create a root key

```go
func CreateKey() (ed25519.PublicKey, ed25519.PrivateKey) {
	rng := rand.Reader
	publicRoot, privateRoot, _ := ed25519.GenerateKey(rng)
	return publicRoot, privateRoot
}
```

## Create and serialize a token

```go
rng := rand.Reader
publicRoot, privateRoot, _ := ed25519.GenerateKey(rng)

authority, err := parser.FromStringBlockWithParams(`
	right("/a/file1.txt", {read});
	right("/a/file1.txt", {write});
	right("/a/file2.txt", {read});
	right("/a/file3.txt", {write});
`, map[string]biscuit.Term{"read": biscuit.String("read"), "write": biscuit.String("write")})

if err != nil {
	panic(fmt.Errorf("failed to parse authority block: %v", err))
}

builder := biscuit.NewBuilder(privateRoot)
builder.AddBlock(authority)

b, err := builder.Build()
if err != nil {
	panic(fmt.Errorf("failed to build biscuit: %v", err))
}

token, err := b.Serialize()
if err != nil {
	panic(fmt.Errorf("failed to serialize biscuit: %v", err))
}

// token is now a []byte, ready to be shared
// The biscuit spec mandates the use of URL-safe base64 encoding for textual representation:
fmt.Println(base64.URLEncoding.EncodeToString(token))
```

## Parse and authorize a token

```go
b, err := biscuit.Unmarshal(token)
if err != nil {
    panic(fmt.Errorf("failed to deserialize token: %v", err))
}

authorizer, err := b.Authorizer(publicRoot)
if err != nil {
    panic(fmt.Errorf("failed to verify token and create authorizer: %v", err))
}

authorizerContents, err := parser.FromStringAuthorizerWithParams(`
	resource({res});
	operation({op});
	allow if right({res}, {op});
	`, map[string]biscuit.Term{"res": biscuit.String("/a/file1.txt"), "op": biscuit.String("read")})
if err != nil {
	panic(fmt.Errorf("failed to parse authorizer: %v", err))
}
authorizer.AddAuthorizer(authorizerContents)

if err := authorizer.Authorize(); err != nil {
    fmt.Printf("failed authorizing token: %v\n", err)
} else {
    fmt.Println("success authorizing token")
}
```

## Attenuate a token

```go
b, err = biscuit.Unmarshal(token)
if err != nil {
    panic(fmt.Errorf("failed to deserialize biscuit: %v", err))
}

// Attenuate the biscuit by appending a new block to it
blockBuilder := b.CreateBlock()
block, err := parser.FromStringBlockWithParams(`
		check if resource($file), operation($permission), [{read}].contains($permission);`,
	map[string]biscuit.Term{"read": biscuit.String("read")})
if err != nil {
	panic(fmt.Errorf("failed to parse block: %v", err))
}
blockBuilder.AddBlock(block)

attenuatedBiscuit, err := b.Append(rng, blockBuilder.Build())
if err != nil {
    panic(fmt.Errorf("failed to append: %v", err))
}

// attenuatedToken is a []byte, representing an attenuated token
attenuatedToken, err := b.Serialize()
if err != nil {
    panic(fmt.Errorf("failed to serialize biscuit: %v", err))
}
```

## Reject revoked tokens

The `Biscuit::RevocationIds` method returns the list of revocation identifiers as byte arrays.

```go
identifiers := token.RevocationIds();
```

## Query data from the authorizer

The `Authorizer::Query` method takes a rule as argument and extract the data from generated facts as tuples.

```go
func Query(authorizer biscuit.Authorizer) (biscuit.FactSet, error) {
	rule, err := parser.FromStringRule(`data($name, $id) <- user($name, $id`)
	if err != nil {
		return nil, fmt.Errorf("failed to parse check: %v", err)
	}

	return authorizer.Query(rule)
}
```
