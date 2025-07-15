# Command Line

## Install

### From pre-built packages

Pre-built packages are available: <https://github.com/eclipse-biscuit/biscuit-cli/releases/latest>

### With `cargo`

```
cargo install biscuit-cli
```

### From source

```
git clone https://github.com/eclipse-biscuit/biscuit-cli.git
cd biscuit-cli
cargo install --path .
```

## Create a key pair

```
$ # this will output the keypair, you can then copy/paste the components
$ biscuit keypair
> Generating a new random keypair
> Private key: 4aa4bae701c6eb05cfe0bdd68d5fab236fc0d0d3dcb2a9b582a0d87b23e04500
> Public key: 687b536c502f10f5978eee2d0c04f2869d15cf7858983dc50b6729b15e203809

$ # this will save the private key to a file so you can use it later
$ biscuit keypair --only-private-key > private-key-file
$ cat private-key-file
> e4d17ae4fd444ace42ab0a813c242643cf9b4ef96ca07c502e8e72142a3e8a2e
```

### Generate a public key from a private key

```
$ biscuit keypair --from-private-key-file private-key-file --only-public-key
> 51c20fb821f7d6a3939fba5c80f0915d80087799de6988a3259c6782bea93d7f

$ biscuit keypair --from-private-key-file private-key-file --only-public-key > public-key-file
```

## Create a token

```
$ # this will open your text editor and let you type in the authority block as datalog
$ biscuit generate --private-key-file private-key-file
> ChcIADgBQhEKDwgEEgIIABIHIgVmaWxlMRoglMviMbBdrIrlVsOaPNw9EhA62e1VAO2mCYxg5mcr-FgiRAogKAZh5JjRh6n3UTQIVlptzWsAhj92UaOjWZQOVYYqaTASIFG7bXx0Y35LjRWcJHs7N6CAEOBJOuuainDg4Rg_S8IG

$ cat << EOF > authority-block
  right("file1");
  EOF
$ # this will read the authority block from a file
$ biscuit generate --private-key-file private-key-file authority-block
> En4KFAoFZmlsZTEYAyIJCgcIBBIDGIAIEiQIABIgyOeDz8eTDEWRtx5NBlsL_ajPBg2CmhLj_xylsxpyaPQaQNXM41V4wk-NGskgvcV6ygh1xL7CqxE51urXKqC81DvEkBNxYlr-cgq2hr0M13pLFxc0pKontpWYQiESNXIa9AEiIgog5v8ptssVfc3ES9eDArruxmaOBRm0n95SitePxoMzFPk=

$ # this will read the authority block from standard input
$ echo 'right("file1");' | biscuit generate --private-key-file private-key-file -
> En4KFAoFZmlsZTEYAyIJCgcIBBIDGIAIEiQIABIgtuIug-thwbWXD8Kt8UqQJCiqe80n4527AiyOV7drwvgaQCpDRNl7dsjBwGzqJMh2qHz2Az6b15kczqkVhJjuKabvZ0q5h_dhVxjYdxMvTJNrL-AictItXU4aqngpIHyLsAciIgog1YhpZ9b8mLfZRW-Id2qLfwNFK2O5Nd4Xa9t9ffnQGeA=

$ # the biscuit can be generated as raw bytes, with no b64 encoding
$ echo 'right("file1");' | biscuit generate --raw --private-key-file private-key-file - > biscuit-file.bc
```

## Inspect a token

```
$ biscuit inspect --raw-input biscuit-file.bc --public-key-file public-key-file
> Open biscuit
> Authority block:
> == Datalog ==
> right("file1");
>
> == Revocation id ==
> a1675990f0b23015019a49b6b003c14fcfd2be134c9899b8146f4f702f8089486ca20766e188cd3388eb8ef653327a78e2dc0f6e42d31be8d97b1c5a8488eb0e

==========

✅ Public key check succeeded 🔑
🙈 Datalog check skipped 🛡️
```

## Authorize a token

```
$ biscuit inspect --raw-input biscuit-file.bc \
   --public-key-file public-key-file \
   --authorize-with 'allow if right("file1");' \
   --include-time
> Open biscuit
> Authority block:
> == Datalog ==
> right("file1");
>
> == Revocation id ==
> a1675990f0b23015019a49b6b003c14fcfd2be134c9899b8146f4f702f8089486ca20766e188cd3388eb8ef653327a78e2dc0f6e42d31be8d97b1c5a8488eb0e
>
> ==========
>
> ✅ Public key check succeeded 🔑
> ✅ Authorizer check succeeded 🛡️
> Matched allow policy: allow if right("file1")
```

## Generate a snapshot

Biscuit inspect can store the authorization context to a file, which can be inspected later. The file will contain both the token contents, and the authorizer contents.

```
$ biscuit inspect --raw-input biscuit-file.bc \
   --public-key-file public-key-file \
   --authorize-with 'allow if right("file1");' \
   --include-time \
   --dump-snapshot-to snapshot-file
> Open biscuit
> Authority block:
> == Datalog ==
> right("file1");
>
> == Revocation id ==
> a1675990f0b23015019a49b6b003c14fcfd2be134c9899b8146f4f702f8089486ca20766e188cd3388eb8ef653327a78e2dc0f6e42d31be8d97b1c5a8488eb0e
>
> ==========
>
> ✅ Public key check succeeded 🔑
> ✅ Authorizer check succeeded 🛡️
> Matched allow policy: allow if right("file1")
```

## Attenuate a token

```
# this will create a new biscuit token with the provided block appended
$ biscuit attenuate --raw-input biscuit-file.bc  --block 'check if operation("read")'
> En4KFAoFZmlsZTEYAyIJCgcIBBIDGIAIEiQIABIgX9V0q_5ZU5NpVUKRF_Z8BPbLKl_9TL1bFeiqBQ97LFoaQKFnWZDwsjAVAZpJtrADwU_P0r4TTJiZuBRvT3AvgIlIbKIHZuGIzTOI6472UzJ6eOLcD25C0xvo2XscWoSI6w4afAoSGAMyDgoMCgIIGxIGCAMSAhgAEiQIABIgCxzPZaKjKJ6_C9cy39I16dgCLu9I5EqPNHwGiOl_eOMaQFU00BW0iFfxxt1pMp4vO-R26mPxx9XMKEEyx80Fugf1OFAPmTdefYVm_vp6rV02GcODrCF3C0Ua3QGopor7uAsiIgogSfbsyId59q50CqdJhxmBYXhqMYcTMYsB1eVnDNw3MTY=

# this will add a TTL check to an existing biscuit token
$ biscuit attenuate --raw-input biscuit-file.bc  --add-ttl "1 day" --block ""
> En4KFAoFZmlsZTEYAyIJCgcIBBIDGIAIEiQIABIgX9V0q_5ZU5NpVUKRF_Z8BPbLKl_9TL1bFeiqBQ97LFoaQKFnWZDwsjAVAZpJtrADwU_P0r4TTJiZuBRvT3AvgIlIbKIHZuGIzTOI6472UzJ6eOLcD25C0xvo2XscWoSI6w4amQEKLwoBdBgDMigKJgoCCBsSBwgFEgMIgQgaFwoFCgMIgQgKCAoGIP7KrpMGCgQaAggAEiQIABIgU2t5XP1OA9VfujCZAZSVbBeE0WMBqMHViXwEhzoTkSAaQN1jHm8uqZVjhfO_J7URfL2NHK4_E7JJD45jvIFFgrgAmcksrhIc5qgyq1U7D0Jbo5tR7H4w3UvMN0sAEJzSjAoiIgogrolYRQ67V5SHiB7ii_YHPU5uwzDuHc1rL2WGKiAvH_c=
```

## Seal a token

```
# this will prevent a biscuit from being attenuated further
$ biscuit seal --raw-input biscuit-file.bc
```

## Inspect a snapshot

`inspect-snapshot` displays the contents of a snapshot (facts, rules, checks, policies), as well as how much time has been spent evaluating datalog.

The authorization process can be resumed with `--authorize-interactive`, `--authorize-with`, or `--authorize-with-file`.

The authorizer can be queried with `--query` or `--query-all`

```
$ biscuit inspect-snapshot snapshot-file \
    --authorize-with "" \
    --query 'data($file) <- right($file)'
// Facts:
// origin: 0
right("file1");
// origin: authorizer
time(2023-11-17T13:59:04Z);

// Policies:
allow if right("file1");

⏱️ Execution time: 13μs (0 iterations)
✅ Authorizer check succeeded 🛡️
Matched allow policy: allow if right("file1")

🔎 Running query: data($file) <- right($file)
data("file1")
```
