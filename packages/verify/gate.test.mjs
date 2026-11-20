import assert from "node:assert/strict";
import test from "node:test";
import { gateProposal } from "./gate.mjs";

const allow = ["https://example.test/a"];
const fetched = "The branch will refer this to another office.";
const primary = "STATUS ACTIVE";

test("accepts a verbatim delegation quote", () => {
  const result = gateProposal(
    {
      class: "delegation_without_record",
      sectorId: "administrators",
      quote: "refer this to another office",
      sourceUrl: "https://example.test/a",
      contradicts: "",
      note: "",
    },
    fetched,
    primary,
    allow,
  );
  assert.equal(result.ok, true);
});

test("rejects a quote that was not fetched", () => {
  const result = gateProposal(
    {
      class: "unsupported_assertion",
      sectorId: "administrators",
      quote: "permits are current",
      sourceUrl: "https://example.test/a",
      contradicts: "STATUS ACTIVE",
      note: "",
    },
    fetched,
    primary,
    allow,
  );
  assert.equal(result.ok, false);
});

test("rejects an off-list URL", () => {
  const result = gateProposal(
    {
      class: "source_confirmed_action",
      sectorId: null,
      quote: "refer this to another office",
      sourceUrl: "https://elsewhere.test/",
      contradicts: "",
      note: "",
    },
    fetched,
    primary,
    allow,
  );
  assert.equal(result.ok, false);
});
