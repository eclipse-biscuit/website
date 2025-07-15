# C

The Rust version of Biscuit can be found on [Github](https://github.com/eclipse-biscuit/biscuit-rust),
[crates.io](https://crates.io/crates/biscuit-auth) and on [docs.rs](https://docs.rs/biscuit-auth).

## Install

You can download pre-built packages and source code releases on the [Github releases page](https://github.com/eclipse-biscuit/biscuit-rust/releases) of the Biscuit Rust project.

If there is no release available for your platform, you can build one as follows:
- install [Rust](https://rustup.rs/)
- install [cargo-c](https://crates.io/crates/cargo-c)
- build the project: `cargo cinstall --release --prefix=/usr --destdir=./build`

This will create the following files in the `build/` directory:

```
.
└── usr
    ├── include
    │   └── biscuit_auth
    │       └── biscuit_auth.h
    └── lib
        ├── libbiscuit_auth.a
        ├── libbiscuit_auth.so -> libbiscuit_auth.so.2.0.0
        ├── libbiscuit_auth.so.2 -> libbiscuit_auth.so.2.0.0
        ├── libbiscuit_auth.so.2.0.0
        └── pkgconfig
            └── biscuit_auth.pc
```

## Create a root key

```C
uint8_t *seed = <generated this from a CSPRNG>;

KeyPair * root_kp = key_pair_new(seed, seed_len);
printf("key_pair creation error? %s\n", error_message());
PublicKey* root = key_pair_public(root_kp);
```

## Create a token

```C
BiscuitBuilder* b = biscuit_builder(root_kp);
biscuit_builder_add_authority_fact(b, "right(\"file1\", \"read\")");
Biscuit * biscuit = biscuit_builder_build(b, (const uint8_t * ) seed, seed_len);
```

## Create an authorizer

```C
Authorizer * authorizer = biscuit_authorizer(b2);
authorizer_add_check(authorizer, "check if right(\"efgh\")");

if(!authorizer_authorize(authorizer)) {
    printf("authorizer error(code = %d): %s\n", error_kind(), error_message());

    if(error_kind() == LogicFailedChecks) {
        uint64_t error_count = error_check_count();
        printf("failed checks (%ld):\n", error_count);

        for(uint64_t i = 0; i < error_count; i++) {
            if(error_check_is_authorizer(i)) {
                uint64_t check_id = error_check_id(i);
                const char* rule = error_check_rule(i);

                printf("  Authorizer check %ld: %s\n", check_id, rule);
            } else {
                uint64_t check_id = error_check_id(i);
                uint64_t block_id = error_check_block_id(i);
                const char* rule = error_check_rule(i);
                printf("  Block %ld, check %ld: %s\n", block_id, check_id, rule);
            }

        }
    }
} else {
    printf("authorizer succeeded\n");
}
```

## Attenuate a token

```C
BlockBuilder* bb = biscuit_create_block(biscuit);
block_builder_add_check(bb, "check if operation(\"read\")");
block_builder_add_fact(bb, "hello(\"world\")");

char *seed2 = "ijklmnopijklmnopijklmnopijklmnop";

KeyPair * kp2 = key_pair_new((const uint8_t *) seed, seed_len);

Biscuit* b2 = biscuit_append_block(biscuit, bb, kp2);
```

## Seal a token

```C
uint64_t size = biscuit_serialized_size(biscuit);
printf("serialized size: %ld\n", size);
uint8_t * buffer = malloc(size);
uint64_t written = biscuit_serialize(biscuit, buffer);
```

## Reject revoked tokens

TODO

## Query data from the authorizer

TODO