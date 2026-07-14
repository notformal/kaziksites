const hex = (buffer) =>
  [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");

export async function verifyRoundProof(round, cryptoApi = globalThis.crypto) {
  if (!round?.serverSeed || !round?.serverSeedHash || !round?.clientSeed) {
    return { verified: false, reason: "Proof is revealed after settlement." };
  }
  if (!cryptoApi?.subtle) return { verified: false, reason: "Web Crypto is unavailable." };
  const encoder = new TextEncoder();
  const commitment = hex(await cryptoApi.subtle.digest("SHA-256", encoder.encode(round.serverSeed)));
  const key = await cryptoApi.subtle.importKey(
    "raw",
    encoder.encode(round.serverSeed),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = hex(
    await cryptoApi.subtle.sign(
      "HMAC",
      key,
      encoder.encode(`${round.clientSeed}:${round.nonce}:${round.gameId}`),
    ),
  );
  return commitment === round.serverSeedHash
    ? { verified: true, digest }
    : { verified: false, digest, reason: "Commitment does not match the revealed seed." };
}
