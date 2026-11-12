package com.runjeet.nativeapp

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.webkit.JavascriptInterface
import org.json.JSONArray
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.units.Energy
import org.json.JSONObject
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

class MainActivity : ComponentActivity() {
    private lateinit var webView: WebView
    private var healthClient: HealthConnectClient? = null
    private var pendingGpsStart = false
    private val writeWorkoutPermissions = setOf(HealthPermission.getWritePermission(ExerciseSessionRecord::class), HealthPermission.getWritePermission(ActiveCaloriesBurnedRecord::class))
    private val readHealthPermissions = setOf(
        RunJeetStepSource.readStepsPermission,
        HealthPermission.getReadPermission(DistanceRecord::class),
        HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class),
        HealthPermission.getReadPermission(ExerciseSessionRecord::class)
    )

    private val locationPermissionRequest = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { result ->
        val granted = result[Manifest.permission.ACCESS_FINE_LOCATION] == true || result[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        if (granted && pendingGpsStart) startLocationService()
        else if (pendingGpsStart) dispatchGpsError("Location permission is required to record a route.")
        pendingGpsStart = false
    }

    private val healthPermissionRequest = registerForActivityResult(
        PermissionController.createRequestPermissionResultContract()
    ) { granted ->
        if (readHealthPermissions.all { it in granted }) {
            readHealthConnectSteps()
            readHealthConnectActivityTotals()
            readHealthConnectWorkouts()
        }
        requestActivityPermission()
    }

    private val activityPermissionRequest = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) startHardwarePedometer()
        else dispatchSteps(0L, "ANDROID_PEDOMETER_PERMISSION_REQUIRED")
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            addJavascriptInterface(AndroidCommands(), "RunJeetAndroid")
            webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                    latestSteps?.let { dispatchSteps(it.first, it.second) } ?: dispatchCachedHardwareSteps()
                    dispatchStoredRoute()
                }
            }
        }
        RunJeetWebBridge.attach(webView)
        setContentView(webView)
        webView.loadUrl("https://sbscorpsales-ship-it.github.io/RunJeet/")
        connectHealthConnect()
    }

    private inner class AndroidCommands {
        @JavascriptInterface fun startGPS() { runOnUiThread { requestLocationAccessAndStart() } }
        @JavascriptInterface fun stopGPS() { runOnUiThread { stopLocationService() } }
        @JavascriptInterface fun clearRoute() { getSharedPreferences(RunJeetLocationService.PREFS, MODE_PRIVATE).edit().putString(RunJeetLocationService.KEY_ROUTE, "[]").apply() }
        @JavascriptInterface fun requestRoute() { runOnUiThread { dispatchStoredRoute() } }
        @JavascriptInterface fun saveWorkout(payload: String) { saveWorkoutToHealthConnect(payload) }
    }

    private fun requestLocationAccessAndStart() {
        val fine = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val coarse = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        if (fine || coarse) { startLocationService(); return }
        pendingGpsStart = true
        locationPermissionRequest.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION))
    }

    private fun startLocationService() {
        val intent = Intent(this, RunJeetLocationService::class.java).setAction(RunJeetLocationService.ACTION_START)
        try { ContextCompat.startForegroundService(this, intent) }
        catch (_: SecurityException) { dispatchGpsError("Android blocked GPS service. Open RunJeet and allow precise location.") }
    }

    private fun stopLocationService() {
        val intent = Intent(this, RunJeetLocationService::class.java).setAction(RunJeetLocationService.ACTION_STOP)
        startService(intent)
    }

    private fun dispatchStoredRoute() {
        val raw = getSharedPreferences(RunJeetLocationService.PREFS, MODE_PRIVATE).getString(RunJeetLocationService.KEY_ROUTE, "[]") ?: "[]"
        val points = try { JSONArray(raw) } catch (_: Exception) { JSONArray() }
        RunJeetWebBridge.emit("runjeetNativeRoute", "{points:$points}")
    }

    private fun dispatchGpsError(message: String) {
        val safe = org.json.JSONObject.quote(message)
        RunJeetWebBridge.emit("runjeetNativeGpsError", "{message:$safe}")
    }

    private var latestSteps: Pair<Long, String>? = null

    private fun dispatchSteps(count: Long, source: String) {
        latestSteps = count to source
        runOnUiThread {
            val safeSource = source.replace("'", "")
            webView.evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('runjeetNativeSteps',{detail:{steps:$count,source:'$safeSource'}}));",
                null
            )
        }
    }

    private fun connectHealthConnect() {
        // Health Connect first; request ACTIVITY_RECOGNITION before using hardware sensor.
        val status = HealthConnectClient.getSdkStatus(this)
        if (status != HealthConnectClient.SDK_AVAILABLE) {
            requestActivityPermission()
            return
        }
        val client = HealthConnectClient.getOrCreate(this)
        healthClient = client
        lifecycleScope.launch {
            try {
                val granted = client.permissionController.getGrantedPermissions()
                val needed = mutableSetOf<String>()
                needed.addAll(readHealthPermissions - granted)
                needed.addAll(writeWorkoutPermissions - granted)
                if (needed.isNotEmpty()) healthPermissionRequest.launch(needed)
                else {
                    readHealthConnectSteps()
                    readHealthConnectActivityTotals()
                    readHealthConnectWorkouts()
                    requestActivityPermission()
                }
            } catch (_: Exception) {
                requestActivityPermission()
            }
        }
    }


    private fun saveWorkoutToHealthConnect(payload: String) {
        val client = healthClient ?: return
        lifecycleScope.launch {
            try {
                val granted = client.permissionController.getGrantedPermissions()
                if (!granted.containsAll(writeWorkoutPermissions)) return@launch
                val data = JSONObject(payload)
                val start = Instant.ofEpochMilli(data.getLong("startTime"))
                val end = Instant.ofEpochMilli(data.getLong("endTime"))
                if (!end.isAfter(start)) return@launch
                val activityName = data.optString("activityType", "Other")
                val records = mutableListOf<androidx.health.connect.client.records.Record>(
                    RunJeetHealthRecords.session(activityName, start, end)
                )
                val calories = data.optDouble("activeCalories", Double.NaN)
                if (calories.isFinite() && calories > 0.0) {
                    val zone = ZoneId.systemDefault()
                    records.add(ActiveCaloriesBurnedRecord(
                        startTime = start,
                        startZoneOffset = zone.rules.getOffset(start),
                        endTime = end,
                        endZoneOffset = zone.rules.getOffset(end),
                        energy = Energy.kilocalories(calories),
                        metadata = androidx.health.connect.client.records.metadata.Metadata.manualEntry()
                    ))
                }
                client.insertRecords(records)
            } catch (_: Exception) {
                // Local RunJeet history remains available if Health Connect is unavailable.
            }
        }
    }

    private fun readHealthConnectSteps() {
        val client = healthClient ?: return
        lifecycleScope.launch {
            try {
                val start = LocalDate.now(ZoneId.systemDefault())
                    .atStartOfDay(ZoneId.systemDefault()).toInstant()
                val response = client.aggregate(
                    androidx.health.connect.client.request.AggregateRequest(
                        metrics = setOf(StepsRecord.COUNT_TOTAL),
                        timeRangeFilter = androidx.health.connect.client.time.TimeRangeFilter.between(start, Instant.now())
                    )
                )
                val total = response[StepsRecord.COUNT_TOTAL] ?: 0L
                if (total > 0L) {
                    dispatchSteps(total, "ANDROID HEALTH CONNECT")
                } else {
                    // Some devices have no Health Connect step provider enabled.
                    // Fall back to the hardware daily total rather than masking it with zero.
                    dispatchCachedHardwareSteps()
                    if (latestSteps == null) dispatchSteps(0L, "ANDROID HEALTH CONNECT")
                }
            } catch (_: Exception) {
                requestActivityPermission()
            }
        }
    }

    private fun readHealthConnectWorkouts() {
        val client = healthClient ?: return
        lifecycleScope.launch {
            try {
                val start = LocalDate.now(ZoneId.systemDefault()).minusDays(30)
                    .atStartOfDay(ZoneId.systemDefault()).toInstant()
                val response = client.readRecords(
                    ReadRecordsRequest(
                        recordType = ExerciseSessionRecord::class,
                        timeRangeFilter = androidx.health.connect.client.time.TimeRangeFilter.after(start),
                        pageSize = 30
                    )
                )
                val records = JSONArray()
                response.records.sortedByDescending { it.startTime }.forEach { workout ->
                    val activity = when (workout.exerciseType) {
                        ExerciseSessionRecord.EXERCISE_TYPE_WALKING -> "Walking"
                        ExerciseSessionRecord.EXERCISE_TYPE_RUNNING -> "Running"
                        ExerciseSessionRecord.EXERCISE_TYPE_BIKING -> "Cycling"
                        ExerciseSessionRecord.EXERCISE_TYPE_HIKING -> "Hiking"
                        ExerciseSessionRecord.EXERCISE_TYPE_SWIMMING_POOL,
                        ExerciseSessionRecord.EXERCISE_TYPE_SWIMMING_OPEN_WATER -> "Swimming"
                        ExerciseSessionRecord.EXERCISE_TYPE_YOGA -> "Yoga"
                        ExerciseSessionRecord.EXERCISE_TYPE_STRENGTH_TRAINING -> "Strength Training"
                        else -> "Workout"
                    }
                    records.put(JSONObject()
                        .put("id", workout.metadata.id ?: "${workout.startTime.toEpochMilli()}-${workout.metadata.dataOrigin.packageName}")
                        .put("activityType", activity)
                        .put("startedAt", workout.startTime.toEpochMilli())
                        .put("durationSec", java.time.Duration.between(workout.startTime, workout.endTime).seconds.coerceAtLeast(0))
                        .put("sourceName", workout.metadata.dataOrigin.packageName)
                    )
                }
                RunJeetWebBridge.emit("runjeetNativeHealthWorkouts", JSONObject().put("records", records).toString())
            } catch (_: Exception) {
                // Workout history remains optional; do not block step or daily-total imports.
            }
        }
    }

    private fun readHealthConnectActivityTotals() {
        val client = healthClient ?: return
        lifecycleScope.launch {
            try {
                val start = LocalDate.now(ZoneId.systemDefault())
                    .atStartOfDay(ZoneId.systemDefault()).toInstant()
                val response = client.aggregate(
                    androidx.health.connect.client.request.AggregateRequest(
                        metrics = setOf(
                            DistanceRecord.DISTANCE_TOTAL,
                            ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL
                        ),
                        timeRangeFilter = androidx.health.connect.client.time.TimeRangeFilter.between(start, Instant.now())
                    )
                )
                val distanceMeters = response[DistanceRecord.DISTANCE_TOTAL]?.inMeters ?: 0.0
                val activeCalories = response[ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL]?.inKilocalories ?: 0.0
                val payload = JSONObject()
                    .put("distanceMeters", distanceMeters)
                    .put("activeCalories", activeCalories)
                    .put("source", "HEALTH CONNECT")
                RunJeetWebBridge.emit("runjeetNativeHealth", payload.toString())
            } catch (_: Exception) {
                // Keep local activity history available if optional aggregates are unavailable.
            }
        }
    }

    private fun requestActivityPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.ACTIVITY_RECOGNITION) != PackageManager.PERMISSION_GRANTED) {
            activityPermissionRequest.launch(Manifest.permission.ACTIVITY_RECOGNITION)
        } else startHardwarePedometer()
    }

    private fun startHardwarePedometer() {
        val serviceIntent = Intent(this, RunJeetPedometerService::class.java)
        ContextCompat.startForegroundService(this, serviceIntent)
        dispatchCachedHardwareSteps()
    }

    private fun dispatchCachedHardwareSteps() {
        val prefs = getSharedPreferences(RunJeetPedometerService.STEPS_PREFS, MODE_PRIVATE)
        val savedDate = prefs.getString("latest_step_date", null)
        if (savedDate == LocalDate.now(ZoneId.systemDefault()).toString()) {
            val count = prefs.getLong("latest_daily_steps", 0L)
            val source = prefs.getString("latest_step_source", "ANDROID_HARDWARE_PEDOMETER") ?: "ANDROID_HARDWARE_PEDOMETER"
            if (latestSteps?.second?.contains("HEALTH CONNECT") != true) dispatchSteps(count, source)
        }
    }

    override fun onResume() {
        super.onResume()
        if (::webView.isInitialized) {
            readHealthConnectSteps()
            readHealthConnectActivityTotals()
            readHealthConnectWorkouts()
            dispatchCachedHardwareSteps()
            // Replay the locally buffered GPS route after returning from background.
            // WebView events may have been missed while Android suspended the UI.
            dispatchStoredRoute()
        }
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}
