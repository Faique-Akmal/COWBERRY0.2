package com.cowberry.tracking

import android.app.*
import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkRequest
import android.os.Build
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.*
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import org.json.JSONObject
import java.io.File
import java.io.IOException
import java.util.concurrent.TimeUnit
import kotlin.concurrent.thread

class LocationService : Service() {
  companion object {
    private const val TAG = "LocationService"
  }

  private lateinit var fusedClient: FusedLocationProviderClient
  private lateinit var locationCallback: LocationCallback
  @Volatile private var sendIntervalMs: Long = 5_000L
  @Volatile private var lastSentAt: Long = 0L
  private val httpClient = OkHttpClient.Builder().connectTimeout(15, TimeUnit.SECONDS).build()

  // prefs keys
  private val PREFS = "location_prefs"
  private val KEY_TOKEN = "location_auth_token"
  private val KEY_SID = "location_session_sid"
  private val KEY_USER = "location_user_id"
  private val KEY_POSTING = "network_posting_enabled"
  private val KEY_REFRESH = "location_refresh_token"

  // server endpoint — change to your endpoint (use https in prod)
  private val serverUrl = "http://192.168.0.143:8000/api/method/cowberry_app.api.locationlog.add_employee_location"

  // offline queue file in cache dir
  private val offlineFile by lazy { File(cacheDir, "offline_locations.json") }
  private val maxOffline = 200
  private val syncBatchSize = 20
  @Volatile private var isSyncing = false

  // network monitoring
  private var connectivityManager: ConnectivityManager? = null
  private var networkCallback: ConnectivityManager.NetworkCallback? = null
  @Volatile private var networkAvailable = false

  override fun onCreate() {
    super.onCreate()
    Log.i(TAG, "===DBG=== onCreate")

    // start foreground notification first (must be quick)
    startForegroundServiceWithNotification()

    fusedClient = LocationServices.getFusedLocationProviderClient(this)

    val locationRequest = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 15_000L)
      .setMinUpdateIntervalMillis(5_000L)
      .setMaxUpdateAgeMillis(30_000L)
      .build()

    locationCallback = object : LocationCallback() {
      override fun onLocationResult(result: LocationResult) {
        val loc = result.lastLocation ?: return
        val now = System.currentTimeMillis()
        if (lastSentAt == 0L || (now - lastSentAt) >= sendIntervalMs) {
          lastSentAt = now
          Log.d(TAG, "===DBG=== Location got: ${loc.latitude}, ${loc.longitude} (send)")
          postLocation(loc.latitude, loc.longitude, loc.speed.toDouble())
        } else {
          Log.d(TAG, "===DBG=== Location got but waiting interval")
        }
      }
    }

    try {
      fusedClient.requestLocationUpdates(locationRequest, locationCallback, Looper.getMainLooper())
      Log.i(TAG, "===DBG=== requested location updates")
    } catch (se: SecurityException) {
      Log.e(TAG, "Missing location permission: ${se.message}")
      stopSelf()
      return
    } catch (ex: Exception) {
      Log.e(TAG, "requestLocationUpdates failed: ${ex.message}")
    }

    setupNetworkCallback()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    intent?.extras?.let { extras ->
      if (extras.containsKey("interval")) {
        val interval = extras.getInt("interval", -1)
        if (interval > 0) {
          updateSendInterval(interval.toLong())
          Log.i(TAG, "===DBG=== interval updated to $interval sec (from start intent)")
        }
      }
    }
    return START_STICKY
  }

  private fun startForegroundServiceWithNotification() {
    val channelId = "cowberry_location_channel"
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(channelId, "Location Tracking", NotificationManager.IMPORTANCE_LOW)
      val nm = getSystemService(NotificationManager::class.java)
      nm.createNotificationChannel(channel)
    }
    val notification = NotificationCompat.Builder(this, channelId)
      .setContentTitle("App tracking location")
      .setContentText("Location tracking is active")
      .setSmallIcon(android.R.drawable.ic_menu_mylocation)
      .setOngoing(true)
      .build()
    startForeground(1, notification)
    Log.i(TAG, "===DBG=== startForeground called")
  }

  private fun getPrefs(): android.content.SharedPreferences {
    return getSharedPreferences(PREFS, Context.MODE_PRIVATE)
  }

  private fun readAuthToken(): String? = getPrefs().getString(KEY_TOKEN, null)
  private fun readSid(): String? = getPrefs().getString(KEY_SID, null)
  private fun readUserId(): String? = getPrefs().getString(KEY_USER, null)
  private fun isPostingEnabled(): Boolean = getPrefs().getBoolean(KEY_POSTING, false)

  private fun addAuthHeaders(builder: Request.Builder) {
    val token = readAuthToken()
    if (!token.isNullOrEmpty()) {
      builder.addHeader("Authorization", "Bearer $token")
      Log.d(TAG, "===DBG=== Added Authorization header (prefix): ${token.take(12)}")
      return
    }
    val sid = readSid()
    if (!sid.isNullOrEmpty()) {
      builder.addHeader("Cookie", "sid=$sid")
      Log.d(TAG, "===DBG=== Added Cookie header with sid prefix: ${sid.take(12)}")
      return
    }
    Log.d(TAG, "===DBG=== No auth header available in native")
  }

  private fun postLocation(lat: Double, lng: Double, speed: Double) {
    // if posting disabled, save offline
    if (!isPostingEnabled()) {
      Log.i(TAG, "===DBG=== Network posting disabled -> saving offline")
      saveOffline(lat, lng, speed)
      return
    }

    val json = JSONObject().apply {
      put("latitude", String.format("%.6f", lat))
      put("longitude", String.format("%.6f", lng))
      put("battery", 0) // optional: add battery if you want via BatteryManager
      put("speed", speed)
      put("pause", false)
    }

    val body = RequestBody.create("application/json; charset=utf-8".toMediaType(), json.toString())
    val builder = Request.Builder().url(serverUrl).post(body)
    addAuthHeaders(builder)
    val req = builder.build()

    httpClient.newCall(req).enqueue(object : Callback {
      override fun onFailure(call: Call, e: IOException) {
        Log.e(TAG, "===DBG=== postLocation failed: ${e.message} -> save offline")
        saveOffline(lat, lng, speed)
      }

      override fun onResponse(call: Call, response: Response) {
        Log.i(TAG, "===DBG=== postLocation status: ${response.code}")
        if (response.code == 401 || response.code == 403) {
          Log.w(TAG, "===DBG=== auth error from server -> save offline and attempt refresh")
          saveOffline(lat, lng, speed)
          handleAuthFailureAndRetry(lat, lng, speed)
        } else if (!response.isSuccessful) {
          Log.w(TAG, "===DBG=== non-2xx -> save offline")
          saveOffline(lat, lng, speed)
        } else {
          Log.d(TAG, "===DBG=== postLocation success body: ${response.body?.string() ?: "<empty>"}")
          syncOfflineIfNeeded()
        }
        response.close()
      }
    })
  }

  private fun handleAuthFailureAndRetry(lat: Double, lng: Double, speed: Double) {
    // attempt refresh using KEY_REFRESH; simple single try
    val refresh = getPrefs().getString(KEY_REFRESH, null) ?: run {
      Log.w(TAG, "===DBG=== no refresh token available")
      return
    }
    val refreshUrl = "http://192.168.0.143:8000/api/token/refresh/"
    val bodyJson = JSONObject().put("refresh", refresh)
    val body = RequestBody.create("application/json; charset=utf-8".toMediaType(), bodyJson.toString())
    val req = Request.Builder().url(refreshUrl).post(body).build()
    httpClient.newCall(req).enqueue(object : Callback {
      override fun onFailure(call: Call, e: IOException) {
        Log.e(TAG, "===DBG=== refresh failed: ${e.message}")
      }
      override fun onResponse(call: Call, response: Response) {
        if (!response.isSuccessful) {
          Log.w(TAG, "===DBG=== refresh non-200: ${response.code}")
        } else {
          val bodyStr = response.body?.string()
          // naive parse for "access" key
          try {
            val obj = JSONObject(bodyStr ?: "{}")
            val newAccess = obj.optString("access", null)
            if (!newAccess.isNullOrEmpty()) {
              getPrefs().edit().putString(KEY_TOKEN, newAccess).apply()
              Log.i(TAG, "===DBG=== refresh saved new token (prefix): ${newAccess.take(12)}")
            }
          } catch (ex: Exception) {
            Log.e(TAG, "===DBG=== refresh parse error: ${ex.message}")
          }
        }
        response.close()
      }
    })
  }

  // offline queue simple append as JSON array
  private fun saveOffline(lat: Double, lng: Double, speed: Double) {
    thread {
      try {
        val arr = if (offlineFile.exists()) {
          val s = offlineFile.readText()
          if (s.isBlank()) mutableListOf<JSONObject>() else {
            val existing = org.json.JSONArray(s)
            val list = mutableListOf<JSONObject>()
            for (i in 0 until existing.length()) list.add(existing.getJSONObject(i))
            list
          }
        } else mutableListOf()
        val item = JSONObject().apply {
          put("latitude", String.format("%.6f", lat))
          put("longitude", String.format("%.6f", lng))
          put("speed", speed)
          put("ts", System.currentTimeMillis() / 1000)
          val uid = readUserId()
          if (!uid.isNullOrEmpty()) put("user", uid)
        }
        arr.add(item)
        // trim to maxOffline
        while (arr.size > maxOffline) arr.removeAt(0)
        val out = org.json.JSONArray(arr.toList())
        offlineFile.writeText(out.toString())
        Log.i(TAG, "===DBG=== saveOffline appended, newCount: ${arr.size}")
      } catch (ex: Exception) {
        Log.e(TAG, "===DBG=== saveOffline err: ${ex.message}")
      }
    }
  }

  private fun syncOfflineIfNeeded() {
    if (!networkAvailable) {
      Log.i(TAG, "===DBG=== network not available, skip syncOffline")
      return
    }
    thread {
      try {
        if (!offlineFile.exists()) return@thread
        val s = offlineFile.readText()
        if (s.isBlank()) return@thread
        val arr = org.json.JSONArray(s)
        if (arr.length() == 0) return@thread
        val sendCount = Math.min(arr.length(), syncBatchSize)
        for (i in 0 until sendCount) {
          val obj = arr.getJSONObject(i)
          val builder = Request.Builder().url(serverUrl)
          val p = JSONObject()
          p.put("latitude", obj.optString("latitude"))
          p.put("longitude", obj.optString("longitude"))
          p.put("speed", obj.optDouble("speed", 0.0))
          p.put("pause", false)
          if (obj.has("user")) p.put("user", obj.get("user"))
          val body = RequestBody.create("application/json; charset=utf-8".toMediaType(), p.toString())
          addAuthHeaders(builder)
          val req = builder.post(body).build()
          val resp = try { httpClient.newCall(req).execute() } catch (ex: Exception) { null }
          if (resp == null || !resp.isSuccessful) {
            Log.w(TAG, "===DBG=== syncOffline item failed, abort batch")
            return@thread
          } else {
            resp.close()
          }
        }
        // if all succeeded remove first sendCount items
        val remaining = org.json.JSONArray()
        for (i in sendCount until arr.length()) remaining.put(arr.getJSONObject(i))
        offlineFile.writeText(remaining.toString())
        Log.i(TAG, "===DBG=== syncOffline succeeded removed $sendCount items, remaining ${remaining.length()}")
      } catch (ex: Exception) {
        Log.e(TAG, "===DBG=== syncOffline err: ${ex.message}")
      }
    }
  }

  private fun setupNetworkCallback() {
    try {
      connectivityManager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
      networkCallback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
          Log.i(TAG, "===DBG=== network available")
          networkAvailable = true
          syncOfflineIfNeeded()
        }
        override fun onLost(network: Network) {
          Log.i(TAG, "===DBG=== network lost")
          networkAvailable = false
        }
      }
      val req = NetworkRequest.Builder().build()
      connectivityManager?.registerNetworkCallback(req, networkCallback!!)
      // initial state
      val active = connectivityManager?.activeNetwork != null
      networkAvailable = active
      Log.i(TAG, "===DBG=== initial networkAvailable: $networkAvailable")
    } catch (ex: Exception) {
      Log.e(TAG, "===DBG=== network callback setup error: ${ex.message}")
    }
  }

  fun updateSendInterval(seconds: Long) {
    sendIntervalMs = seconds * 1000
    Log.i(TAG, "===DBG=== updateSendInterval to ${sendIntervalMs}ms")
  }

  override fun onDestroy() {
    try {
      fusedClient.removeLocationUpdates(locationCallback)
    } catch (ex: Exception) {
      Log.w(TAG, "removeLocationUpdates failed: ${ex.message}")
    }
    try {
      networkCallback?.let { connectivityManager?.unregisterNetworkCallback(it) }
    } catch (ex: Exception) {}
    Log.i(TAG, "===DBG=== onDestroy")
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null
}
