/* GATIVX Intelligent Activity Reconciliation (IAR)
 * Pure deterministic core. No device/network/storage access.
 * Interval records are additive only when their time windows do not overlap.
 * Exact-window duplicates are represented once; partial overlaps are held for review.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.GATIVXIAR = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
  const millis = value => typeof value === "number" ? value : Date.parse(value);
  const sourceKey = value => String(value || "").trim();

  function quality(record) {
    const q = Number(record.qualityScore);
    return Number.isFinite(q) ? Math.max(0, Math.min(100, q)) : 0;
  }

  function reconcileDaily(input) {
    const date = String(input.date || "");
    if (!validDate(date)) throw new TypeError("A valid local activity date (YYYY-MM-DD) is required.");
    const selected = new Set((input.selectedSources || []).map(sourceKey).filter(Boolean));
    const records = Array.isArray(input.records) ? input.records : [];
    const preference = input.sourcePriority || [];
    const priority = new Map(preference.map((id, index) => [sourceKey(id), index]));
    const seenIds = new Set();
    const accepted = [];
    const excluded = [];
    const rejected = [];

    for (const record of records) {
      if (!record || !record.id || !sourceKey(record.sourceId)) {
        rejected.push({ id: record && record.id || null, reason: "MISSING_RECORD_OR_SOURCE_ID" });
        continue;
      }
      if (seenIds.has(String(record.id))) {
        rejected.push({ id: String(record.id), reason: "DUPLICATE_RECORD_ID" });
        continue;
      }
      seenIds.add(String(record.id));
      if (record.date !== date) continue;
      if (!selected.has(sourceKey(record.sourceId))) {
        excluded.push({ id: String(record.id), sourceId: sourceKey(record.sourceId), reason: "SOURCE_NOT_SELECTED" });
        continue;
      }
      const steps = Number(record.steps);
      if (!Number.isSafeInteger(steps) || steps < 0) {
        rejected.push({ id: String(record.id), reason: "INVALID_STEP_VALUE" });
        continue;
      }
      const granularity = record.granularity || "interval";
      if (granularity === "daily_total") {
        accepted.push({ ...record, steps, granularity, _start: null, _end: null });
        continue;
      }
      const start = millis(record.startAt), end = millis(record.endAt);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
        rejected.push({ id: String(record.id), reason: "INVALID_INTERVAL" });
        continue;
      }
      accepted.push({ ...record, steps, granularity, _start: start, _end: end });
    }

    const dailyTotals = accepted.filter(r => r.granularity === "daily_total");
    const intervals = accepted.filter(r => r.granularity !== "daily_total");
    const intervalOut = [];
    const byWindow = new Map();
    for (const record of intervals) {
      const key = record._start + ":" + record._end;
      if (!byWindow.has(key)) byWindow.set(key, []);
      byWindow.get(key).push(record);
    }

    const chosen = [];
    for (const group of byWindow.values()) {
      group.sort((a, b) => {
        const pa = priority.has(sourceKey(a.sourceId)) ? priority.get(sourceKey(a.sourceId)) : 9999;
        const pb = priority.has(sourceKey(b.sourceId)) ? priority.get(sourceKey(b.sourceId)) : 9999;
        return pa - pb || quality(b) - quality(a) || String(a.id).localeCompare(String(b.id));
      });
      chosen.push(group[0]);
      for (const duplicate of group.slice(1)) {
        rejected.push({ id: String(duplicate.id), reason: "SAME_INTERVAL_DUPLICATE", representedBy: String(group[0].id) });
      }
    }

    chosen.sort((a, b) => a._start - b._start || a._end - b._end);
    const conflicted = new Set();
    for (let i = 0; i < chosen.length; i++) {
      for (let j = i + 1; j < chosen.length && chosen[j]._start < chosen[i]._end; j++) {
        conflicted.add(chosen[i]);
        conflicted.add(chosen[j]);
      }
    }
    for (const record of chosen) {
      if (conflicted.has(record)) {
        rejected.push({ id: String(record.id), reason: "PARTIAL_INTERVAL_OVERLAP_REQUIRES_REVIEW" });
      } else {
        intervalOut.push(record);
      }
    }

    // Daily aggregates cannot safely be added to interval samples or to another
    // device's daily aggregate because their underlying time windows are unknown.
    let dailyAggregate = null;
    if (dailyTotals.length === 1 && intervals.length === 0) {
      dailyAggregate = dailyTotals[0];
    } else {
      for (const record of dailyTotals) {
        rejected.push({
          id: String(record.id),
          reason: intervals.length ? "DAILY_TOTAL_OVERLAPS_INTERVAL_DATA" : "MULTIPLE_DAILY_TOTALS_CANNOT_BE_DEDUPLICATED"
        });
      }
    }

    const intervalSteps = intervalOut.reduce((sum, record) => sum + record.steps, 0);
    const countedSteps = dailyAggregate ? dailyAggregate.steps : intervalSteps;
    const hasUnresolved = rejected.some(r =>
      r.reason === "PARTIAL_INTERVAL_OVERLAP_REQUIRES_REVIEW" ||
      r.reason === "DAILY_TOTAL_OVERLAPS_INTERVAL_DATA" ||
      r.reason === "MULTIPLE_DAILY_TOTALS_CANNOT_BE_DEDUPLICATED"
    );
    return {
      date,
      countedSteps,
      status: !selected.size ? "NO_SELECTED_SOURCES" : hasUnresolved ? "PROVISIONAL_REVIEW_REQUIRED" : "RECONCILED",
      selectionConfirmed: input.selectionConfirmed === true,
      selectedSources: [...selected].sort(),
      includedRecordIds: dailyAggregate ? [String(dailyAggregate.id)] : intervalOut.map(r => String(r.id)),
      excluded,
      rejected,
      unresolved: hasUnresolved,
      method: dailyAggregate ? "SINGLE_SOURCE_DAILY_TOTAL" : "NON_OVERLAPPING_INTERVAL_SUM",
      generatedAt: input.generatedAt || null,
      note: input.selectionConfirmed === true
        ? "Member-confirmed source selection; device wearer identity is not independently proven."
        : "Source selection is unconfirmed; attribution remains provisional."
    };
  }

  return { reconcileDaily };
});
