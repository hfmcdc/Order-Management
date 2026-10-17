import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "crypto";
import {
  extractMessages,
  isAllowedSender,
  parseAllowedNumbers,
  verifySignature,
  verifyToken,
} from "./cloud-api";

test("allow-list ignores formatting and rejects everyone when empty", () => {
  const allowed = parseAllowedNumbers("+91 98765 43210, 919000000001 ,");
  assert.equal(isAllowedSender("919876543210", allowed), true);
  assert.equal(isAllowedSender("+919000000001", allowed), true);
  assert.equal(isAllowedSender("919111111111", allowed), false);
  assert.equal(isAllowedSender("919876543210", parseAllowedNumbers(undefined)), false);
  assert.equal(isAllowedSender("919876543210", parseAllowedNumbers("")), false);
});

test("verify token", () => {
  assert.equal(verifyToken("abc", "abc"), true);
  assert.equal(verifyToken("abd", "abc"), false);
  assert.equal(verifyToken(null, "abc"), false);
  assert.equal(verifyToken("abc", undefined), false);
});

test("signature check accepts Meta's HMAC and rejects anything else", () => {
  const body = '{"object":"whatsapp_business_account"}';
  const good = "sha256=" + createHmac("sha256", "secret").update(body).digest("hex");
  assert.equal(verifySignature(body, good, "secret"), true);
  assert.equal(verifySignature(body + " ", good, "secret"), false);
  assert.equal(verifySignature(body, good, "other"), false);
  assert.equal(verifySignature(body, null, "secret"), false);
  assert.equal(verifySignature(body, "sha256=zz", "secret"), false);
});

test("extractMessages reads text messages and ignores delivery receipts", () => {
  const payload = {
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            value: {
              messages: [
                { id: "wamid.1", from: "919876543210", type: "text", text: { body: "delivered ORD0002" } },
                { id: "wamid.2", from: "919876543210", type: "image" },
              ],
            },
          },
          { value: { statuses: [{ id: "wamid.3", status: "delivered" }] } },
        ],
      },
    ],
  };
  assert.deepEqual(extractMessages(payload), [
    { id: "wamid.1", from: "919876543210", type: "text", text: "delivered ORD0002" },
    { id: "wamid.2", from: "919876543210", type: "image", text: undefined },
  ]);
  assert.deepEqual(extractMessages({ object: "page" }), []);
  assert.deepEqual(extractMessages(null), []);
});
