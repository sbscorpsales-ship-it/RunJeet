package com.runjeet.nativeapp

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.time.TimeRangeFilter
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/**
 * Native Android step source scaffold.
 * Device TYPE_STEP_COUNTER is cumulative since reboot; persist the baseline
 * and derive today's delta. Health Connect aggregate is preferred when allowed.
 */
class RunJeetStepSource(
    context: Context,
    private val onDailySteps: (Long, String) -> Unit
) : SensorEventListener {
    private val app = context.applicationContext
    private val manager = app.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    private val sensor = manager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
    private val prefs = app.getSharedPreferences("runjeet_steps", Context.MODE_PRIVATE)
    private var bootBaseline = -1f

    fun start() {
        sensor?.let { manager.registerListener(this, it, SensorManager.SENSOR_DELAY_NORMAL) }
    }

    fun stop() { manager.unregisterListener(this) }

    override fun onSensorChanged(event: SensorEvent) {
        if (event.sensor.type != Sensor.TYPE_STEP_COUNTER) return
        val totalSinceBoot = event.values[0]
        val bootId = android.os.SystemClock.elapsedRealtime().toLong()
        val savedBoot = prefs.getLong("boot_marker", -1L)
        if (savedBoot != bootId || bootBaseline < 0f) {
            bootBaseline = totalSinceBoot
            prefs.edit().putLong("boot_marker", bootId).putFloat("baseline", bootBaseline).apply()
        }
        val todayDelta = (totalSinceBoot - bootBaseline).toLong().coerceAtLeast(0)
        onDailySteps(todayDelta, "ANDROID_HARDWARE_PEDOMETER")
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit

    companion object {
        val readStepsPermission = HealthPermission.getReadPermission(StepsRecord::class)
    }
}

class RunJeetHealthConnect(private val client: HealthConnectClient) {
    suspend fun todaySteps(): Long {
        val start = LocalDate.now().atStartOfDay(ZoneId.systemDefault()).toInstant()
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
