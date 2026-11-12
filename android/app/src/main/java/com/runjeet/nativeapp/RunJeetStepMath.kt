package com.runjeet.nativeapp

/**
 * Pure daily-total calculation for Android TYPE_STEP_COUNTER readings.
 * The hardware counter is cumulative since boot, so this stores a delta
 * against the last observed value and carries that delta into the current day.
 */
internal object RunJeetStepMath {
    fun dailyTotal(
        savedBoot: Long,
        currentBoot: Long,
        previousTotal: Long,
        currentTotal: Long,
        previousDay: String?,
        today: String,
        savedDaily: Long
    ): Long {
        val sameBoot = savedBoot == currentBoot &&
            previousTotal >= 0L &&
            currentTotal >= previousTotal
        val delta = if (sameBoot) currentTotal - previousTotal else 0L
        return when {
            !sameBoot -> if (previousDay == today) savedDaily.coerceAtLeast(0L) else 0L
            previousDay == today -> (savedDaily + delta).coerceAtLeast(0L)
            else -> delta.coerceAtLeast(0L)
        }
    }
}
