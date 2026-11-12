package com.runjeet.nativeapp;

import androidx.health.connect.client.records.ExerciseSessionRecord;
import androidx.health.connect.client.records.metadata.Metadata;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Collections;

public final class RunJeetHealthRecords {
    private RunJeetHealthRecords() {}

    public static ExerciseSessionRecord session(String activityName, Instant start, Instant end) {
        ZoneId zone = ZoneId.systemDefault();
        ZoneOffset startOffset = zone.getRules().getOffset(start);
        ZoneOffset endOffset = zone.getRules().getOffset(end);
        String normalized = activityName == null ? "" : activityName.toLowerCase(java.util.Locale.ROOT);
        int type;
        String label;
        if (normalized.contains("run")) {
            type = ExerciseSessionRecord.EXERCISE_TYPE_RUNNING;
            label = "RunJeet run";
        } else if (normalized.contains("cycl") || normalized.contains("bik")) {
            type = ExerciseSessionRecord.EXERCISE_TYPE_BIKING;
            label = "RunJeet cycle";
        } else if (normalized.contains("walk")) {
            type = ExerciseSessionRecord.EXERCISE_TYPE_WALKING;
            label = "RunJeet walk";
        } else {
            type = ExerciseSessionRecord.EXERCISE_TYPE_OTHER_WORKOUT;
            label = "RunJeet activity";
        }
        return new ExerciseSessionRecord(
            start, startOffset, end, endOffset,
            Metadata.manualEntry(),
            type,
            label,
            null,
            Collections.emptyList(),
            Collections.emptyList(),
            null,
            null
        );
    }
}
