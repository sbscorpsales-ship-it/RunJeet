package com.runjeet.nativeapp

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.provider.Settings
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.time.TimeRangeFilter
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/**
 * Native Android step source.
 * TYPE_STEP_COUNTER is cumulative since boot. A separate persisted baseline
 * is maintained for each local calendar day and device boot.
 */
class RunJeetStepSource(
    context: Context,
    private val onDailySteps: (Long, String) -> Unit
) : SensorEventListener {
    private val app = context.applicationContext
    private val manager = app.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    private val sensor = manager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
    private val prefs = app.getSharedPreferences("runjeet_steps", Context.MODE_PRIVATE)

    fun start() {
        sensor?.let { manager.registerListener(this, it, SensorManager.SENSOR_DELAY_NORMAL) }
    }

    fun stop() { manager.unregisterListener(this) }

    override fun onSensorChanged(event: SensorEvent) {
        if (event.sensor.type != Sensor.TYPE_STEP_COUNTER) return
        val totalSinceBoot = event.values[0].toLong().coerceAtLeast(0L)
        val bootId = Settings.Global.getInt(app.contentResolver, "boot_count", 0).toLong()
        val today = LocalDate.now(ZoneId.systemDefault()).toString()
        val savedBoot = prefs.getLong("boot_marker", -1L)
        val savedDay = prefs.getString("baseline_day", null)
        val key = "baseline_${bootId}_${today}"

        var baseline = if (savedBoot == bootId && savedDay == today) {
            prefs.getLong(key, -1L)
        } else -1L

        if (baseline < 0L || baseline > totalSinceBoot) {
            baseline = totalSinceBoot
            prefs.edit()
                .putLong("boot_marker", bootId)
                .putString("baseline_day", today)
                .putLong(key, baseline)
                .apply()
        }

        onDailySteps((totalSinceBoot - baseline).coerceAtLeast(0L), "ANDROID_HARDWARE_PEDOMETER")
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit

    companion object {
        val readStepsPermission = HealthPermission.getReadPermission(StepsRecord::class)
    }
}

/** Use Health Connect's daily aggregate as the preferred source when permission is granted. */
class RunJeetHealthConnect(private val client: HealthConnectClient) {
    suspend fun todaySteps(): Long {
        val start = LocalDate.now(ZoneId.systemDefault()).atStartOfDay(ZoneId.systemDefault()).toInstant()
        val end = Instant.now()
        val result = client.aggregate(
            AggregateRequest(
                metrics = setOf(StepsRecord.COUNT_TOTAL),
                timeRangeFilter = TimeRangeFilter.between(start, end)
            )
        )
        return result[StepsRecord.COUNT_TOTAL] ?: 0L
    }
}
