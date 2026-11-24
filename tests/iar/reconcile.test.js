"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { reconcileDaily } = require("../src/iar/reconcile.js");

const base = {
  date: "2026-11-24",
  selectedSources: ["iphone", "watch"],
  selectionConfirmed: true,
  records: []
};
const rec = (id, sourceId, startAt, endAt, steps, extra = {}) => ({
  id, sourceId, date: base.date, startAt, endAt, steps, granularity: "interval", qualityScore: 90, ...extra
});

test("does not add two devices reporting the exact same interval", () => {
  const result = reconcileDaily({ ...base, records: [
    rec("phone-1", "iphone", "2026-11-24T07:00:00Z", "2026-11-24T07:20:00Z", 1200),
    rec("watch-1", "watch", "2026-11-24T07:00:00Z", "2026-11-24T07:20:00Z", 1190)
  ], sourcePriority: ["iphone", "watch"] });
  assert.equal(result.countedSteps, 1200);
  assert.deepEqual(result.includedRecordIds, ["phone-1"]);
  assert.equal(result.rejected[0].reason, "SAME_INTERVAL_DUPLICATE");
});

test("keeps non-overlapping walks from selected devices additive", () => {
  const result = reconcileDaily({ ...base, records: [
    rec("phone-am", "iphone", "2026-11-24T07:00:00Z", "2026-11-24T07:20:00Z", 1200),
    rec("watch-pm", "watch", "2026-11-24T18:00:00Z", "2026-11-24T18:25:00Z", 1600)
  ] });
  assert.equal(result.countedSteps, 2800);
  assert.equal(result.status, "RECONCILED");
});

test("holds partial overlapping intervals for review instead of guessing", () => {
  const result = reconcileDaily({ ...base, records: [
    rec("phone-1", "iphone", "2026-11-24T07:00:00Z", "2026-11-24T07:20:00Z", 1200),
    rec("watch-1", "watch", "2026-11-24T07:10:00Z", "2026-11-24T07:30:00Z", 1250)
  ] });
  assert.equal(result.countedSteps, 0);
  assert.equal(result.status, "PROVISIONAL_REVIEW_REQUIRED");
  assert.equal(result.unresolved, true);
});

test("excludes devices the member did not select", () => {
  const result = reconcileDaily({ ...base, records: [
    rec("phone-1", "iphone", "2026-11-24T07:00:00Z", "2026-11-24T07:20:00Z", 1200),
    rec("ring-1", "ring", "2026-11-24T07:00:00Z", "2026-11-24T07:20:00Z", 3200)
  ] });
  assert.equal(result.countedSteps, 1200);
  assert.equal(result.excluded[0].sourceId, "ring");
});

test("does not combine daily totals from multiple devices", () => {
  const result = reconcileDaily({ ...base, records: [
    { id: "p-day", sourceId: "iphone", date: base.date, granularity: "daily_total", steps: 2600 },
    { id: "w-day", sourceId: "watch", date: base.date, granularity: "daily_total", steps: 2580 }
  ] });
  assert.equal(result.countedSteps, 0);
  assert.equal(result.status, "PROVISIONAL_REVIEW_REQUIRED");
});

test("accepts one daily aggregate only when no interval data exists", () => {
  const result = reconcileDaily({ ...base, records: [
    { id: "p-day", sourceId: "iphone", date: base.date, granularity: "daily_total", steps: 2600 }
  ] });
  assert.equal(result.countedSteps, 2600);
  assert.equal(result.method, "SINGLE_SOURCE_DAILY_TOTAL");
});

test("re-importing the same record ID is idempotent", () => {
  const record = rec("phone-1", "iphone", "2026-11-24T07:00:00Z", "2026-11-24T07:20:00Z", 1200);
  const result = reconcileDaily({ ...base, records: [record, record] });
  assert.equal(result.countedSteps, 1200);
  assert.equal(result.rejected[0].reason, "DUPLICATE_RECORD_ID");
});

test("late-arriving historical records are reconciled against their activity date", () => {
  const result = reconcileDaily({ ...base, records: [
    rec("late-watch", "watch", "2026-11-24T07:00:00Z", "2026-11-24T07:20:00Z", 1200)
  ], generatedAt: "2026-11-25T09:00:00Z" });
  assert.equal(result.date, "2026-11-24");
  assert.equal(result.countedSteps, 1200);
});

test("unconfirmed selection is explicitly marked", () => {
  const result = reconcileDaily({ ...base, selectionConfirmed: false, records: [
    rec("phone-1", "iphone", "2026-11-24T07:00:00Z", "2026-11-24T07:20:00Z", 1200)
  ] });
  assert.match(result.note, /unconfirmed/);
});
