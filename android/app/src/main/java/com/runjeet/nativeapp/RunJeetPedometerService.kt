package com.runjeet.nativeapp

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

/**
 * Keeps the hardware step counter registered while the app UI is backgrounded.
 * Android's health/pedometer service is explicitly visible to the user.
 */
class RunJeetPedometerService : Service() {
    private var stepSource: RunJeetStepSource? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentTitle("RunJeet is counting steps")
            .setContentText("Daily steps are collected on this device.")
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()
        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }

        stepSource = RunJeetStepSource(this) { count, source ->
            getSharedPreferences(STEPS_PREFS, MODE_PRIVATE).edit()
                .putLong("latest_daily_steps", count)
                .putString("latest_step_source", source)
                .putString("latest_step_date", java.time.LocalDate.now().toString())
                .apply()
        }.also { it.start() }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_STICKY

    override fun onDestroy() {
        stepSource?.stop()
        stepSource = null
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Step counting",
                NotificationManager.IMPORTANCE_LOW
            ).apply { description = "Shows when RunJeet is collecting steps in the background." }
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }

    companion object {
        const val CHANNEL_ID = "runjeet_step_counter"
        const val NOTIFICATION_ID = 7401
        const val STEPS_PREFS = "runjeet_steps"
    }
}
