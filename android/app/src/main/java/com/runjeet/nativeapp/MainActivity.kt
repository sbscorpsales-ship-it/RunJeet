package com.runjeet.nativeapp

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.StepsRecord
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

class MainActivity : ComponentActivity() {
    private lateinit var webView: WebView
    private var healthClient: HealthConnectClient? = null

    private val healthPermissionRequest = registerForActivityResult(
        PermissionController.createRequestPermissionResultContract()
    ) { granted ->
        if (RunJeetStepSource.readStepsPermission in granted) readHealthConnectSteps()
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
            webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                    latestSteps?.let { dispatchSteps(it.first, it.second) } ?: dispatchCachedHardwareSteps()
                }
            }
        }
        setContentView(webView)
        webView.loadUrl("https://sbscorpsales-ship-it.github.io/RunJeet/")
        connectHealthConnect()
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
                if (RunJeetStepSource.readStepsPermission in granted) {
                    readHealthConnectSteps()
                    requestActivityPermission()
                } else healthPermissionRequest.launch(setOf(RunJeetStepSource.readStepsPermission))
            } catch (_: Exception) {
                requestActivityPermission()
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
            dispatchCachedHardwareSteps()
        }
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}
