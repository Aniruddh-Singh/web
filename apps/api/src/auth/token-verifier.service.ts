import { Injectable, UnauthorizedException } from "@nestjs/common";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { env } from "../config/env.js";

/**
 * Verifies Supabase access tokens locally against the project's public signing keys (ES256 JWKS).
 * Keys are fetched once and cached by `jose`; no call to Supabase per request.
 */
@Injectable()
export class TokenVerifier {
  private jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
  private issuer = "";

  private keys() {
    if (!this.jwks) {
      const base = env().SUPABASE_URL;
      if (!base) throw new UnauthorizedException("Login is not configured on this server.");
      this.issuer = `${base.replace(/\/$/, "")}/auth/v1`;
      this.jwks = createRemoteJWKSet(new URL(`${this.issuer}/.well-known/jwks.json`), { cooldownDuration: 60_000 });
    }
    return this.jwks;
  }

  async verify(token: string): Promise<JWTPayload & { sub: string; email?: string; phone?: string }> {
    try {
      const { payload } = await jwtVerify(token, this.keys(), { issuer: this.issuer, audience: "authenticated" });
      if (!payload.sub) throw new Error("missing sub");
      return payload as JWTPayload & { sub: string; email?: string; phone?: string };
    } catch {
      throw new UnauthorizedException("Your session has expired. Log in again.");
    }
  }
}
