package com.cowberry.location

import android.app.*
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.*
import okhttp3.*
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

class LocationService : Service() {

  private lateinit var fusedClient: FusedLocationProviderClient
  private lateinit var locationCallback: LocationCallback
  private var sendIntervalMs: Long = 2 * 60 * 1000 // default 2 min
  private var lastSentAt: Long = 0
  private val httpClient =
    OkHttpClient.Builder().connectTimeout(15, TimeUnit.SECONDS).build()
  private val serverUrl = "https://stg-admin.cowberryindustries.com/api/locations/"

  override fun onCreate() {
    super.onCreate()
    fusedClient = LocationServices.getFusedLocationProviderClient(this)

    val locationRequest = LocationRequest.create().apply {
      interval = 15_000
      fastestInterval = 5_000
      priority = Priority.PRIORITY_HIGH_ACCURACY
    }

    locationCallback = object : LocationCallback() {
      override fun onLocationResult(result: LocationResult) {
        val loc = result.lastLocation ?: return
        val now = System.currentTimeMillis()
        if (now - lastSentAt >= sendIntervalMs) {
          lastSentAt = now
          postLocation(loc.latitude, loc.longitude)
        }
      }
    }

    startForegroundServiceWithNotification()
    fusedClient.requestLocationUpdates(locationRequest, locationCallback, Looper.getMainLooper())
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    intent?.extras?.let { extras ->
      if (extras.containsKey("interval")) {
        val interval = extras.getInt("interval", -1)
        if (interval > 0) {
          updateSendInterval(interval.toLong())
          android.util.Log.d("LocationService", "===DBG=== interval updated to $interval sec")
        }
      }
    }
    return START_STICKY
  }

  private fun startForegroundServiceWithNotification() {
    val channelId = "location_channel"
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val chan = NotificationChannel(
        channelId,
        "Location Service",
        NotificationManager.IMPORTANCE_LOW
      )
      val nm = getSystemService(NotificationManager::class.java)
      nm.createNotificationChannel(chan)
    }
    val notification: Notification = NotificationCompat.Builder(this, channelId)
      .setContentTitle("App tracking location")
      .setContentText("Location tracking is active")
      .setSmallIcon(android.R.drawable.ic_menu_mylocation)
      .build()
    startForeground(1, notification)
  }

  private fun postLocation(lat: Double, lng: Double) {
    val json = JSONObject().apply {
      put("latitude", String.format("%.6f", lat))
      put("longitude", String.format("%.6f", lng))
      put("timestamp", System.currentTimeMillis() / 1000)
    }

    val body = RequestBody.create(MediaType.parse("application/json; charset=utf-8"), json.toString())
    val builder = Request.Builder().url(serverUrl).post(body)

    val prefs = applicationContext.getSharedPreferences("location_prefs", Context.MODE_PRIVATE)
    val token = prefs.getString("location_auth_token", null)
    if (!token.isNullOrEmpty()) {
      builder.addHeader("Authorization", "Bearer $token")
      android.util.Log.d("LocationService", "===DBG=== Using auth token in header")
    } else {
      android.util.Log.d("LocationService", "===DBG=== No auth token found")
    }

    val req = builder.build()
    httpClient.newCall(req).enqueue(object : Callback {
      override fun onFailure(call: Call, e: IOException) {
        android.util.Log.e("LocationService", "===DBG=== postLocation failed: ${e.message}")
      }

      override fun onResponse(call: Call, response: Response) {
        android.util.Log.d("LocationService", "===DBG=== postLocation status: ${response.code()}")
        response.close()
      }
    })
  }

  fun updateSendInterval(seconds: Long) {
    sendIntervalMs = seconds * 1000
  }

  override fun onDestroy() {
    fusedClient.removeLocationUpdates(locationCallback)
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null
}
