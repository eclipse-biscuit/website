# Web components

In addition to providing libraries for several languages, biscuit comes equipped
with a series of web components. With these components, you can generate, 
inspect and attenuate tokens within a web page, or input and evaluate datalog.
This can come in handy when documenting your use of biscuits.

Those components can be used directly on [the tooling page of biscuitsec.org](https://www.biscuitsec.org/docs/tooling/).

## Installation

The web components are distributed through npm and can be bundled along with your frontend code.

⚠️  The components rely on web assembly resources that need to be served under `/assets`.

Here is an example of a [rollup]() configuration that will generate a bundle under the `dist` folder.


<details>
<summary><code>package.json</code></summary>

```json
{
  "name": "wc",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "build": "rollup -c"
  },
  "author": "",
  "license": "ISC",
  "dependencies": {
    "@biscuit-auth/web-components": "0.6.0"
  },
  "devDependencies": {
    "@rollup/plugin-commonjs": "^21.0.1",
    "@rollup/plugin-node-resolve": "^13.0.6",
    "@web/rollup-plugin-import-meta-assets": "^1.0.7",
    "rollup": "^2.60.0",
    "rollup-plugin-copy": "^3.4.0"
  }
}
```
</details>

<details>
<summary><code>rollup.config.js</code></summary>

```javascript
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import copy from 'rollup-plugin-copy';
import { importMetaAssets } from '@web/rollup-plugin-import-meta-assets';

const sourceDir = 'src';
const outputDir = 'dist';

export default {
  input: 'index.js',
  output: {
    dir: 'dist/',
    format: 'esm'
  },
  plugins: [
    nodeResolve({ browser: true }),
    commonjs({
      include: 'node_modules/**'
    }),
    copy({
      targets: [
        { src: "node_modules/@biscuit-auth/web-components/dist/assets/*", dest: "dist/assets" }
      ],
    }),
    importMetaAssets()
  ]
};
  
```

</details>

<details>
<summary><code>index.html</code></summary>

```html
…
<head>
…
<script type="module" src="/index.js"></script>
…
</head>
…
```
</details>

## Usage

### Token printer

This components allows you to interact with serialized tokens:

- inspection
- verification and authorization
- attenuation

When used without any attributes, it will provide an empty text input, where you can paste a base64-encoded token to inspect its contents.

```html
<bc-token-printer></bc-token-printer>
```

<bc-token-printer></bc-token-printer>

The following (optional) attributes are available:

- `biscuit`: a base64-encoded biscuit that will be displayed as if it was pasted
  in the textarea;
- `rootPublicKey`: a hex-encoded public key used to verify the biscuit signature;
- `readonly`: when set to `"true"`, will prevent changing the input values.
  It is meant to be used along with the `biscuit` attribute;
- `showAuthorizer`: when set to `"true"`, will display a text input for 
  datalog code, used to authorize the token (along with an input for a
  public key, to verify the token signatures);
- `showAttenuation`: when set to `"true"`, will display inputs for appending
  blocks to the token.

Additionally, authorizer code can be provided through a child element carrying
the `authorizer` class.

```html
<bc-token-printer>
<pre><code class="authorizer">
allow if true;
</code></pre>
</bc-token-printer>
```

<bc-token-printer showAuthorizer="true">
<pre><code class="authorizer">
allow if true;
</code></pre>
</bc-token-printer>

### Token generator

This component allows you to generate a token from datalog code and a root
private key.

When used without any attributes, it will provide an empty text input, where you can type in datalog code, and a private key input used to sign the token.

The private key input lets you paste an existing key or generate a random one.
It will also display the corresponding public key.

```html
<bc-token-generator></bc-token-generator>
```

<bc-token-generator></bc-token-generator>

The following (optional) attributes are available:

- `privateKey`: a private key (hex-formatted) used to sign the token. Only use this
  for examples and never put an actual private key here.

Additionally, token blocks can be provided through children elements carrying
the `block` class. Attenuation blocks can carry an optional `privateKey`
attribute, which will be used to sign the block.

```html
<bc-token-generator>
<pre><code class="block">
// authority block
user("1234");
</code></pre>
<pre><code class="block" privateKey="ed25519-private/ca54b85182980232415914f508e743ee13da8024ebb12512bb517d151f4a5029">
// attenuation block
check if time($time), $time < 2023-05-04T00:00:00Z;
</code></pre>
</bc-token-generator>
```

<bc-token-generator>
<pre><code class="block">
// authority block
user("1234");
</code></pre>
<pre><code class="block" privateKey="ed25519-private/ca54b85182980232415914f508e743ee13da8024ebb12512bb517d151f4a5029">
// attenuation block
check if time($time), $time < 2023-05-04T00:00:00Z;
</code></pre>
</bc-token-generator>

### Snapshot printer

This component allows you to inspect the contents of a snapshot, optionally adding extra authorization code or queries.

```html
<bc-snapshot-printer snapshot="CgkI6AcQZBjAhD0Q72YaZAgEEgVmaWxlMSINEAMaCQoHCAQSAxiACCoQEAMaDAoKCAUSBiCo492qBjIRCg0KAggbEgcIBBIDGIAIEAA6EgoCCgASDAoKCAUSBiCo492qBjoPCgIQABIJCgcIBBIDGIAIQAA=" showAuthorizer="true" showQuery="true">
</bc-snapshot-printer>
```

<bc-snapshot-printer snapshot="CgkI6AcQZBjAhD0Q72YaZAgEEgVmaWxlMSINEAMaCQoHCAQSAxiACCoQEAMaDAoKCAUSBiCo492qBjIRCg0KAggbEgcIBBIDGIAIEAA6EgoCCgASDAoKCAUSBiCo492qBjoPCgIQABIJCgcIBBIDGIAIQAA=" showAuthorizer="true" showQuery="true">
</bc-snapshot-printer>

### Datalog playground

The datalog playground allows you to type in and evaluate datalog code without
providing a token. It displays the evaluation results, as well as all the facts
generated during evaluation.

When used without any attributes, it displays a single text input, for
authorizer policies.

```html
<bc-datalog-playground></bc-datalog-playground>
```

<bc-datalog-playground></bc-datalog-playground>

The following (optional) attributes are available:

- `showBlocks`: when set to `"true"`, allows to add inputs for token blocks.

Additionally, authorizer code and token blocks can be provided through children
elements carrying the `authorizer` or `block` class. Attenuation blocks can
carry an optional `privateKey` attribute, which will be used to sign the block.

```html
<bc-datalog-playground showBlocks="true">
<pre><code class="block">
// authority block
user("1234");
</code></pre>
<pre><code class="block" privateKey="ed25519-private/ca54b85182980232415914f508e743ee13da8024ebb12512bb517d151f4a5029">
// attenuation block
check if time($time), $time < 2023-05-04T00:00:00Z;
thirdParty(true);
</code></pre>
<pre><code class="authorizer">
// authorizer policies 
time(2023-05-03T00:00:00Z);
allow if user($u);
check if thirdParty(true) trusting ed25519/1f76d2bdd5e8dc2c1dc1142d85d626b19caf8c793f4aae3ff8d0fd6bf9c038b7;
</code></pre>
</bc-datalog-playground>
```

<bc-datalog-playground showBlocks="true">
<pre><code class="block">
// authority block
user("1234");
</code></pre>
<pre><code class="block" privateKey="ed25519-private/ca54b85182980232415914f508e743ee13da8024ebb12512bb517d151f4a5029">
// attenuation block
check if time($time), $time < 2023-05-04T00:00:00Z;
thirdParty(true);
</code></pre>
<pre><code class="authorizer">
// authorizer policies 
time(2023-05-03T00:00:00Z);
allow if user($u);
check if thirdParty(true) trusting ed25519/1f76d2bdd5e8dc2c1dc1142d85d626b19caf8c793f4aae3ff8d0fd6bf9c038b7;
</code></pre>
</bc-datalog-playground>
