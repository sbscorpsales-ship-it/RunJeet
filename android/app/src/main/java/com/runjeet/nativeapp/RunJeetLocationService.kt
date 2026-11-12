package com.runjeet.nativeapp

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import org.json.JSONArray
import org.json.JSONObject
import java.lang.ref.WeakReference

object RunJeetWebBridge {
    @Volatile private var web: WeakReference<android.webkit.WebView>? = null
    fun attach(view: android.webkit.WebView) { web = WeakReference(view) }
    fun emit(event: String, json: String) {
        val target = web?.get() ?: return
        target.post {
            target.evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('$event',{detail:$json}));",
                null
            )
        }
    }
}

class RunJeetLocationService : Service(), LocationListener {
    private lateinit var locationManager: LocationManager
    private val prefs by lazy { getSharedPreferences(PREFS, MODE_PRIVATE) }

    override fun onCreate() {
        super.onCreate()
        locationManager = getSystemService(LOCATION_SERVICE) as LocationManager
        createChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> { stopTracking(); stopSelf(); return START_NOT_STICKY }
            ACTION_CLEAR -> { prefs.edit().putString(KEY_ROUTE, "[]").apply(); return START_STICKY }
        }
        val notification = NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentTitle("RunJeet is recording your route")
            .setContentText("GPS tracking is active. Tap Stop in RunJeet to finish.")
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()
        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
        } else startForeground(NOTIFICATION_ID, notification)

        requestAvailableProviders()
        return START_STICKY
    }

    // Keep the foreground service alive through temporary provider outages.
    // GPS hardware does not require internet; network location is only a fallback.
    private fun requestAvailableProviders() {
        var requested = false
        try {
            if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 2000L, 3f, this, Looper.getMainLooper())
                requested = true
            }
        } catch (_: SecurityException) {
            RunJeetWebBridge.emit("runjeetNativeGpsStatus", JSONObject().put("message", "Location permission is unavailable. Your activity and saved route are retained.").toString())
            return
        } catch (_: IllegalArgumentException) {}
        try {
            if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                locationManager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 3000L, 5f, this, Looper.getMainLooper())
                requested = true
            }
        } catch (_: SecurityException) {
            RunJeetWebBridge.emit("runjeetNativeGpsStatus", JSONObject().put("message", "Location permission is unavailable. Your activity and saved route are retained.").toString())
            return
        } catch (_: IllegalArgumentException) {}
        val message = if (requested) {
            "GPS service is active. Route points are saved on this device; internet is not required for GPS recording."
        } else {
            "GPS signal or location provider is temporarily unavailable. RunJeet is keeping your activity open and will retry when location becomes available."
        }
        RunJeetWebBridge.emit("runjeetNativeGpsStatus", JSONObject().put("message", message).toString())
    }

    override fun onProviderEnabled(provider: String) { requestAvailableProviders() }

    override fun onProviderDisabled(provider: String) { requestAvailableProviders() }

    override fun onLocationChanged(location: Location) {
        if (!location.hasAccuracy() || location.accuracy > 60f) return
        val point = JSONObject().apply {
            put("lat", location.latitude)
            put("lon", location.longitude)
            put("accuracy", location.accuracy.toDouble())
            put("ts", location.time.toDouble())
        }
        val route = try { JSONArray(prefs.getString(KEY_ROUTE, "[]") ?: "[]") } catch (_: Exception) { JSONArray() }
        if (route.length() > 0) {
            val prev = route.optJSONObject(route.length() - 1)
            if (prev != null) {
                val previous = Location("RunJeet").apply {
                    latitude = prev.optDouble("lat")
                    longitude = prev.optDouble("lon")
                    time = prev.optLong("ts")
                }
                if (location.time - previous.time <= 1500L && location.distanceTo(previous) <= 2f) return
            }
        }
        route.put(point)
        while (route.length() > 20000) route.remove(0)
        prefs.edit().putString(KEY_ROUTE, route.toString()).apply()
        RunJeetWebBridge.emit("runjeetNativeLocation", point.toString())
    }

    fun stopTracking() {
        try { locationManager.removeUpdates(this) } catch (_: Exception) {}
        stopForeground(STOP_FOREGROUND_REMOVE)
    }

    override fun onDestroy() { stopTracking(); super.onDestroy() }
    override fun onBind(intent: Intent?): IBinder? = null
    override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {
        if (status == android.location.LocationProvider.OUT_OF_SERVICE ||
            status == android.location.LocationProvider.TEMPORARILY_UNAVAILABLE) {
            RunJeetWebBridge.emit("runjeetNativeGpsStatus", JSONObject().put("message", "GPS signal temporarily unavailable. Your activity and saved route are safe; waiting for a new location fix.").toString())
        } else if (status == android.location.LocationProvider.AVAILABLE) {
            requestAvailableProviders()
        }
    }

    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(NotificationChannel(CHANNEL, "GPS activity", NotificationManager.IMPORTANCE_LOW))
        }
    }

    companion object {
        const val PREFS = "runjeet_location"
        const val KEY_ROUTE = "route_points"
        const val ACTION_START = "com.runjeet.nativeapp.GPS_START"
        const val ACTION_STOP = "com.runjeet.nativeapp.GPS_STOP"
        const val ACTION_CLEAR = "com.runjeet.nativeapp.GPS_CLEAR"
        const val NOTIFICATION_ID = 7402
        private const val CHANNEL = "runjeet_gps"
    }
}