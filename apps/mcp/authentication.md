# Authentication — the MCP server is an OAuth resource server

An assistant connects **as a user**: the user signs in and approves the client, and the client calls
`/mcp` with an access token bound to this server. The MCP server verifies that token and never issues
one; issuing belongs to the authorization server, wherever the project's sign-in lives
([start-here.md → Where the parts live](./start-here.md#where-the-parts-live)).

> Part of the [MCP server](./start-here.md) subtree. The edge rules every server-side app follows
> ([identity-and-access.md → Authentication is an edge concern](../../packages/core/identity-and-access.md#authentication-is-an-edge-concern))
> apply; this doc adds what OAuth for MCP clients needs.

## The token check

- **It runs in front of the handler**, before any context is built: a missing, invalid, expired or
  wrong-audience token is a `401` with a `WWW-Authenticate` challenge, the edge's authentication
  failure ([transport-mapping.md](../transport-mapping.md#mapping-outcomes-to-a-response-http)). The
  protected-resource metadata the challenge points at (RFC 9728) is served, so a client discovers the
  authorization server on its own.
- **A token opens only this server.** It is accepted only when its audience is this server's URL
  (RFC 8707 resource indicators). The server never forwards a client's token to another API: a call
  it makes downstream uses the server's own credential.
- **The verified token becomes the actor** — `context.ts` resolves its subject to `ctx.actor` (and
  `ctx.tenant`), read-only, as any edge does
  ([identity-and-access.md → Identity lifecycle](../../packages/core/identity-and-access.md#identity-lifecycle--where-a-user-comes-from)).
  The domain's guards then apply exactly as they do to the web app, so an assistant can do what its
  user can do in the app and nothing more. Whether the actor also records that it came through an
  assistant (`via: 'assistant'`) is the project's identity model.
- **No bypass in a deployed environment.** A local-development switch that skips the token check is
  explicit, and refuses to start when the environment is not loopback.

## Connections and tokens

- **Clients register by Client ID Metadata Document (CIMD).** Dynamic client registration stays off:
  the spec deprecates it, and it lets anyone register a client unchecked. Turn it on only for a
  client the project targets that cannot use CIMD, and record it.
- **One scope** — "everything the user can do" — until a real need for a narrower grant appears; a
  request for another scope gets that one. Scopes added in anticipation are permissions nobody
  checks.
- **Consent is asked on every sign-in,** on a screen naming the client and the domain its metadata
  document is served from (the one part a client can't fake), and the signed-in account, with a way
  to switch account.
- **Token lifetime is a recorded choice.** The default, Better Auth's: short-lived signed (JWT) access
  tokens checked against the auth server's keys with no database read, and rotating refresh tokens;
  revoking access takes effect when the access token expires. When access must end on the next call
  (an instant "disconnect", a password change), use opaque tokens checked on every call instead.
- **When `@better-auth/mcp` can't run** (it needs an `https` resource URL off loopback), Better
  Auth's OAuth-provider and CIMD plugins with a protected-resource metadata route of your own meet the
  [criteria](#authorization-server-criteria) too.

## Authorization-server criteria

An authorization server other than the recommended one must support all of these. Each is what MCP
clients rely on to connect without help, or what keeps the server safe to expose:

1. OAuth 2.1 authorization code flow with PKCE (`S256`), and a consent screen naming the client that
   can't be framed by another site.
2. Authorization-server metadata (RFC 8414) at its well-known URL, advertising only endpoints it
   serves.
3. Resource indicators (RFC 8707): tokens bound to the MCP server's URL as their audience.
4. Client ID Metadata Documents, so a client registers by URL with no registration call; each
   document fetched safely — no private addresses, no redirects, rate-limited, since anyone can make
   the server fetch one.
5. The `iss` parameter on the authorization response (RFC 9207), which MCP clients check.
6. Refresh-token rotation, a reused refresh token ending the grant, and revocation the user can
   trigger.
7. Loopback redirect URIs matched on any port (RFC 8252 §7.3), for `localhost` as well as
   `127.0.0.1`: desktop and CLI clients call back on a random port, and some name `localhost`.
8. Error pages showing fixed messages, never text taken from the request.

---

**Verify:** when done, check [end-here.md](./end-here.md) → *Authentication*.
