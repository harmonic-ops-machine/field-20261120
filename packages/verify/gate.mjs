export const CLASSES = [
  "no_public_action",
  "source_confirmed_action",
  "unsupported_assertion",
  "delegation_without_record",
  "pending",
];

export const SECTORS = [
  "administrators",
  "legislators",
  "media",
  "insurers",
  "management",
  "directors",
];

export function gateProposal(proposal, fetchedText, primaryText, allowlist) {
  if (!proposal || typeof proposal !== "object") {
    return { ok: false, reason: "proposal is not an object" };
  }
  if (!CLASSES.includes(proposal.class)) {
    return { ok: false, reason: "class is not in the protocol" };
  }
  if (proposal.sectorId != null && !SECTORS.includes(proposal.sectorId)) {
    return { ok: false, reason: "sectorId is not in the protocol" };
  }
  const url = String(proposal.sourceUrl || "");
  if (proposal.class !== "no_public_action" && !allowlist.includes(url)) {
    return { ok: false, reason: "sourceUrl is not on the allowlist" };
  }
  if (proposal.class === "no_public_action") {
    return { ok: true, reason: "watched sources unchanged" };
  }
  const quote = String(proposal.quote || "");
  if (!quote || !fetchedText.includes(quote)) {
    return { ok: false, reason: "quote is not a verbatim span of the fetched text" };
  }
  if (proposal.class === "unsupported_assertion") {
    const contradicts = String(proposal.contradicts || "");
    if (!contradicts || !primaryText.includes(contradicts)) {
      return { ok: false, reason: "contradicts is not a verbatim span of the primary record" };
    }
  }
  return { ok: true, reason: "quote, allowlist, and class checked" };
}
