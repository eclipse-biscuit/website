# PHP

PHP bindings for Biscuit are available on [GitHub](https://github.com/ptondereau/biscuit-php)
and on [Packagist](https://packagist.org/packages/ptondereau/biscuit-php). They wrap the
[Biscuit Rust library](https://github.com/eclipse-biscuit/biscuit-rust) through a native PHP extension
built with [ext-php-rs](https://github.com/extphprs/ext-php-rs).

> **Warning:** This library is currently in beta. The API may change in future releases.

**Requirements:** PHP >= 8.1

All classes live under the `Biscuit\Auth` namespace.

## Install

The recommended way to install the extension is via [PIE](https://github.com/php/pie)
(the PHP Installer for Extensions), which handles building and installing the extension for you:

```sh
pie install ptondereau/biscuit-php
```

Prebuilt binaries are also available on the [GitHub releases page](https://github.com/ptondereau/biscuit-php/releases),
and you can compile the extension from source. See the
[project README](https://github.com/ptondereau/biscuit-php#installation) for details.

In `composer.json`:

```json
{
    "require": {
        "ext-biscuit_php": "*"
    }
}
```

### Symfony

Symfony users can integrate Biscuit through the dedicated bundle:
[ptondereau/biscuit-sf-bundle](https://github.com/ptondereau/biscuit-sf-bundle).
It wires the extension into the Symfony container and provides ready-to-use services.

> **Warning:** The Symfony bundle is not stable yet. Expect breaking changes before the first stable release.

## Create a root key

```php
use Biscuit\Auth\KeyPair;
use Biscuit\Auth\Algorithm;

// Ed25519 (default)
$root = new KeyPair();

// or explicitly choose an algorithm
$root = new KeyPair(Algorithm::Secp256r1);
```

Keys can also be loaded from existing material:

```php
use Biscuit\Auth\PrivateKey;
use Biscuit\Auth\PublicKey;

$privateKey = new PrivateKey("<hex string>");
$privateKey = PrivateKey::fromPem($pem);

$publicKey = new PublicKey("<hex string>");
$publicKey = PublicKey::fromPem($pem);
```

## Create a token

```php
use Biscuit\Auth\BiscuitBuilder;

$userId = "1234";
$builder = new BiscuitBuilder('user({id})', ['id' => $userId]);
$builder->addCode('check if resource("file1")');
$builder->addCode('right({right})', ['right' => 'read']);

$token = $builder->build($root->getPrivateKey());
echo $token->toBase64();
```

Facts, rules and checks can also be added through dedicated types:

```php
use Biscuit\Auth\Fact;
use Biscuit\Auth\Rule;
use Biscuit\Auth\Check;

$builder = new BiscuitBuilder();
$builder->addFact(new Fact('user({id})', ['id' => $userId]));
$builder->addRule(new Rule('can_access($u) <- user($u)'));
$builder->addCheck(new Check('check if user($u)'));

$token = $builder->build($root->getPrivateKey());
```

## Authorize a token

```php
use Biscuit\Auth\Biscuit;
use Biscuit\Auth\AuthorizerBuilder;
use Biscuit\Auth\Policy;

$publicKey = $root->getPublicKey();
$token = Biscuit::fromBase64("<base64 string>", $publicKey);

$authBuilder = new AuthorizerBuilder();
$authBuilder->addCode('resource("file1")');
$authBuilder->addCode('operation("read")');
$authBuilder->addPolicy(new Policy('allow if user({id}), right("read")', ['id' => '1234']));
$authBuilder->setTime(); // adds the current timestamp

$authorizer = $authBuilder->build($token);

// returns the index of the matched policy (0 here),
// throws AuthorizerError if denied
$acceptedPolicy = $authorizer->authorize();
```

## Attenuate a token

```php
use Biscuit\Auth\BlockBuilder;

$token = Biscuit::fromBase64("<base64 string>", $publicKey);

// restrict to read only
$block = new BlockBuilder();
$block->addCode('check if operation("read")');
$attenuatedToken = $token->append($block);
echo $attenuatedToken->toBase64();
```

### Third-party blocks

```php
use Biscuit\Auth\KeyPair;
use Biscuit\Auth\BlockBuilder;

$thirdPartyKp = new KeyPair();

// the token holder creates a request
$request = $token->thirdPartyRequest();

// the third party creates and signs a block
$externalBlock = new BlockBuilder();
$externalBlock->addCode('external_fact("verified")');
$signedBlock = $request->createBlock($thirdPartyKp->getPrivateKey(), $externalBlock);

// the token holder appends the signed block
$attested = $token->appendThirdParty($thirdPartyKp->getPublicKey(), $signedBlock);
```

## Reject revoked tokens

```php
$token = Biscuit::fromBase64("<base64 string>", $publicKey);

// revocationIds is a list of hex-encoded revocation identifiers,
// one per block
$revocationIds = $token->revocationIds();

if (containsRevokedIds($revocationIds)) {
    // reject the token
}
```

## Query data from the authorizer

```php
use Biscuit\Auth\Rule;

$authBuilder = new AuthorizerBuilder();
$authBuilder->addCode('resource("file1")');
$authBuilder->addCode('operation("read")');
$authBuilder->addCode('allow if user($id), right("read")');

$authorizer = $authBuilder->build($token);
$authorizer->authorize();

$results = $authorizer->query(new Rule('u($id) <- user($id)'));
foreach ($results as $fact) {
    echo $fact . "\n";
}
```

## Authorizer snapshots

Authorizer state can be serialized for inspection or persistence:

```php
// save
$snapshot = $authorizer->base64Snapshot();

// restore
$restored = \Biscuit\Auth\Authorizer::fromBase64Snapshot($snapshot);
```
