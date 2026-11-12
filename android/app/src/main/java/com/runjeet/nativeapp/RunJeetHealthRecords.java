package com.runjeet.nativeapp;

import androidx.health.connect.client.records.ExerciseSessionRecord;
import androidx.health.connect.client.records.metadata.Metadata;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Collections;

public final class RunJeetHealthRecords {
    private RunJeetHealthRecords() {}

    public static ExerciseSessionRecord walkingSession(Instant start, Instant end) {
        ZoneOffset startOffset = ZoneOffset.systemDefault().getRules().getOffset(start);
        ZoneOffset endOffset = ZoneOffset.systemDefault().getRules().getOffset(end);
        return new ExerciseSessionRecord(
            start, startOffset, end, endOffset,
            Metadata.manualEntry(),
            ExerciseSessionRecord.EXERCISE_TYPE_WALKING,
            "RunJeet walk",
            null,
            Collections.emptyList(),
            Collections.emptyList(),
            null,
            null
        );
    }
}
