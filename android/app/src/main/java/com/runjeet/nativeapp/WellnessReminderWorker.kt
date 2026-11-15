package com.runjeet.nativeapp

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.work.Worker
import androidx.work.WorkerParameters

class WellnessReminderWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
    override fun doWork(): Result {
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(applicationContext, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            return Result.success()
        }
        val kind = inputData.getString("kind") ?: return Result.failure()
        val title: String
        val message: String
        when (kind) {
            "water" -> {
                title = "Hydration check-in"
                message = "Time for a water check-in. Have a glass if you are thirsty."
            }
            "sedentary" -> {
                title = "Movement break"
                message = "Take a gentle 2–5 minute movement break."
            }
            else -> return Result.failure()
        }
        val manager = applicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            manager.createNotificationChannel(
                NotificationChannel("gativx_wellness", "GATIVX wellness reminders", NotificationManager.IMPORTANCE_DEFAULT)
            )
        }
        val notification = NotificationCompat.Builder(applicationContext, "gativx_wellness")
            .setSmallIcon(android.R.drawable.ic_popup_reminder)
            .setContentTitle(title)
            .setContentText(message)
            .setAutoCancel(true)
            .build()
        return try {
            NotificationManagerCompat.from(applicationContext).notify(if (kind == "water") 7101 else 7102, notification)
            Result.success()
        } catch (_: SecurityException) {
            Result.success()
        }
    }
}
