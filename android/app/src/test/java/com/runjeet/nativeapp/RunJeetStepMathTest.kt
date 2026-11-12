package com.runjeet.nativeapp

import org.junit.Assert.assertEquals
import org.junit.Test

class RunJeetStepMathTest {
    @Test fun addsSensorDeltaDuringSameDay() {
        assertEquals(1500L, RunJeetStepMath.dailyTotal(7, 7, 10000, 10300, "2026-11-12", "2026-11-12", 1200))
    }

    @Test fun startsNewDayFromObservedDelta() {
        assertEquals(45L, RunJeetStepMath.dailyTotal(7, 7, 10000, 10045, "2026-11-11", "2026-11-12", 9000))
    }

    @Test fun preservesSameDayTotalAcrossRebootBaselineReset() {
        assertEquals(4200L, RunJeetStepMath.dailyTotal(7, 8, 90000, 12, "2026-11-12", "2026-11-12", 4200))
    }

    @Test fun resetsTotalAfterRebootOnANewDay() {
        assertEquals(0L, RunJeetStepMath.dailyTotal(7, 8, 90000, 12, "2026-11-11", "2026-11-12", 4200))
    }

    @Test fun ignoresCounterRegressionWithoutSubtractingSteps() {
        assertEquals(800L, RunJeetStepMath.dailyTotal(7, 7, 2000, 100, "2026-11-12", "2026-11-12", 800))
    }
}
