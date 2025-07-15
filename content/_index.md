+++
title = "Eclipse Biscuit"


# The homepage contents
[extra]
lead = '<b>Eclipse Biscuit</b> is an authorization token with decentralized verification, offline attenuation and strong security policy enforcement based on a logic language'
url = "/docs/getting-started/introduction/index.html"
url_button = "Get started"
repo_version = "Specification"
repo_license = "Open-source Apache-2.0 License."
repo_url = "https://github.com/eclipse-biscuit/biscuit"
token = "En0KEwoEMTIzNBgDIgkKBwgKEgMYgAgSJAgAEiAs2CFWr5WyHHWEiMhTXxVNw4gP7PlADPaGfr_AQk9WohpA6LZTjFfFhcFQrMsp2O7bOI9BOzP-jIE5PGhha62HDfX4t5FLQivX5rUhH5iTv2c-rd0kDSazrww4cD1UCeytDSIiCiCfMgpVPOuqq371l1wHVhCXoIscKW-wrwiKN80vR_Rfzg=="

[[extra.list]]
title = "Decentralized verification"
content = 'Biscuit tokens are signed with public key cryptography: any application knowing the public key can verify the token'

[[extra.list]]
title = "Offline attenuation"
content = 'If you hold a valid token, you can generate a new one with less rights, like restricting write access or adding an expiration date'

[[extra.list]]
title = "Datalog policies"
content = 'Authorization policies are written in a logic language. They can be provided by the application, or transported by the token (attenuation)'

# use cases

[[extra.list]]
title = "Capabilities or Access control lists"
content = 'Eclipse Biscuit is naturally suited for capabilities based authorization, by carrying a token customized for the request. But you can also provide verification side ACLs as Datalog'

[[extra.list]]
title = "Revocation"
content = 'All tokens come with unique revocation identifiers, that can be used to reject that token and all the tokens attenuated from it'

[[extra.list]]
title = "Portable"
content = 'Eclipse Biscuit is available in Rust, Haskell, Go, Java, JS (node & browser), WebAssembly, C, Python, C#… All you need for a new implementation is a Protobuf generator and Ed25519 signing. The specification comes with a list of predefined test cases'

+++

<h2>See it live</h2>
<p>Test authorization policies in Datalog:</p>
<div class="text-left">
{% datalog() %}
// we receive a request to read "admin.doc"
// The request contains a token with the following content
user(1234);

// this restricts the kind of operation to "read"
check if operation("read");

// The authorizer loads facts representing the request
resource("admin.doc");
operation("read");

// The authorizer loads the user's rights
right(1234, "admin.doc", "read");
right(1234, "admin.doc", "write");

// Finally, the authorizer tests policies
// by looking for a set of facts matching them
allow if
  user($user_id),
  resource($res),
  operation($op),
  right($user_id, $res, $op);

{% end %}
</div>

<div class="container">
  <img src="/img/thumbnail.png" style="height:0" />
  <div class="row justify-content-center text-center">
      <h2>Meet the team</h2>
      <p>Eclipse Biscuit is the result of the help of dozens of contributors over the years, patiently refining the specification and implementations. The project is maintained and led by:</p>
      <div class="col-lg-5">
        <h2 class="h4">Geoffroy Couprie</h2>
        <img src="/img/geoffroy.jpg" style="width: 50%; margin-bottom: 10px" />
        <p>Geoffroy has worked on distributed systems security for over a decade, and is now a Senior Staff Engineer at Apollo GraphQL. You will often find him deep in discussions on protocols and cryptography.</p>
      </div>
      <div class="col-lg-5">
        <h2 class="h4">Clément Delafargue</h2>
        <img src="/img/clement.jpg" style="width: 50%; margin-bottom: 10px" />
        <p>Clément is a functional programmer working at Outscale. He loves discussing about FP, distributed systems, cloud architecture, and dogs obviously.</p>
      </div>
  </div>
</div>
