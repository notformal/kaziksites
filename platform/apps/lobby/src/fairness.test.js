import { describe, expect, it } from "vitest";
import { createHash, createHmac, webcrypto } from "node:crypto";
import { verifyRoundProof } from "./fairness";

describe("round proof verifier", () => {
  it("recomputes the commitment and deterministic digest", async () => {
    const serverSeed = "server-seed", clientSeed = "client-seed", nonce = 7, gameId = "plinko";
    const result = await verifyRoundProof({
      serverSeed, clientSeed, nonce, gameId,
      serverSeedHash: createHash("sha256").update(serverSeed).digest("hex"),
    }, webcrypto);
    expect(result).toEqual({
      verified: true,
      digest: createHmac("sha256", serverSeed).update(`${clientSeed}:${nonce}:${gameId}`).digest("hex"),
    });
  });

  it("rejects a mismatched commitment and does not verify unrevealed rounds", async () => {
    expect((await verifyRoundProof({ serverSeed:"a",clientSeed:"b",nonce:1,gameId:"keno",serverSeedHash:"bad" }, webcrypto)).verified).toBe(false);
    expect((await verifyRoundProof({ status:"open" }, webcrypto)).reason).toMatch(/after settlement/i);
  });
});
