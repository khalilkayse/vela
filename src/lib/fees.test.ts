import { test } from "node:test";
import assert from "node:assert/strict";
import { computeFee, isVerifiedFailed, isVerifiedPaid } from "./fees.ts";

test("computeFee: percent + fixed", () => {
  assert.deepEqual(computeFee(20, 9, 0.3), { fee: 2.1, net: 17.9 });
});

test("computeFee: free item is 0/0", () => {
  assert.deepEqual(computeFee(0, 9, 0.3), { fee: 0, net: 0 });
  assert.deepEqual(computeFee(-5, 9, 0.3), { fee: 0, net: 0 });
});

test("computeFee: caps the fee at the price", () => {
  assert.deepEqual(computeFee(1, 50, 5), { fee: 1, net: 0 });
});

test("computeFee: zero percent and fixed", () => {
  assert.deepEqual(computeFee(40, 0, 0), { fee: 0, net: 40 });
});

test("isVerifiedPaid: accepts success + 601 with matching amount", () => {
  assert.equal(
    isVerifiedPaid({ status: "success", code: 601, amount: "20.00" }, { amount: 20, currency: "USD" }),
    true,
  );
});

test("isVerifiedPaid: rejects a mismatched amount (replay protection)", () => {
  assert.equal(
    isVerifiedPaid({ status: "success", code: 601, amount: "1.00" }, { amount: 20, currency: "USD" }),
    false,
  );
});

test("isVerifiedPaid: rejects pending (603)", () => {
  assert.equal(
    isVerifiedPaid({ status: "pending", code: 603, amount: "20.00" }, { amount: 20, currency: "USD" }),
    false,
  );
});

test("isVerifiedPaid: rejects success without code 601", () => {
  assert.equal(
    isVerifiedPaid({ status: "success", code: 600, amount: "20.00" }, { amount: 20, currency: "USD" }),
    false,
  );
});

test("isVerifiedPaid: rejects code 601 without status success", () => {
  assert.equal(
    isVerifiedPaid({ status: "paid", code: 601, amount: "20.00" }, { amount: 20, currency: "USD" }),
    false,
  );
});

test("isVerifiedFailed: only the literal 'failed' string", () => {
  assert.equal(isVerifiedFailed({ status: "failed", code: 600 }), true);
  assert.equal(isVerifiedFailed({ status: "failure", code: 600 }), false);
  assert.equal(isVerifiedFailed({ status: "pending", code: 603 }), false);
});
