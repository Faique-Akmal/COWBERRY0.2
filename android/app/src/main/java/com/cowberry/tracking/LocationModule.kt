package com.cowberry.tracking

import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class LocationModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  companion object { private const val TAG = "LocationModule" }

  override fun getName(): String = "LocationServiceBridge" // keep same js name if used already

  @ReactMethod
  fun startService(initialIntervalSec: Int, promise: Promise) {
    try {
      // persist tracking flag + interval
      val prefs = reactContext.getSharedPreferences("location_prefs", Context.MODE_PRIVATE)
      prefs.edit().putBoolean("tracking_enabled", true).putInt("last_interval_sec", initialIntervalSec).apply()

      val intent = Intent(reactContext, LocationService::class.java)
      intent.putExtra("interval", initialIntervalSec)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        reactContext.startForegroundService(intent)
      } else {
        reactContext.startService(intent)
      }
      Log.i(TAG, "===DBG=== startService called with interval $initialIntervalSec")
      promise.resolve(true)
    } catch (ex: Exception) {
      Log.e(TAG, "startService failed: ${ex.message}")
      promise.reject("START_SERVICE_FAILED", ex.message)
    }
  }

  @ReactMethod
  fun stopService(promise: Promise) {
    try {
      // mark disabled in prefs
      val prefs = reactContext.getSharedPreferences("location_prefs", Context.MODE_PRIVATE)
      prefs.edit().putBoolean("tracking_enabled", false).apply()

      val intent = Intent(reactContext, LocationService::class.java)
      reactContext.stopService(intent)
      Log.i(TAG, "===DBG=== stopService called and tracking_enabled=false saved")
      promise.resolve(true)
    } catch (ex: Exception) {
      Log.e(TAG, "stopService failed: ${ex.message}")
      promise.reject("STOP_SERVICE_FAILED", ex.message)
    }
  }

  @ReactMethod
  fun updateInterval(seconds: Int) {
    val intent = Intent("com.cowberry.UPDATE_INTERVAL")
    intent.putExtra("interval", seconds)
    reactContext.sendBroadcast(intent)
    // persist too
    val prefs = reactContext.getSharedPreferences("location_prefs", Context.MODE_PRIVATE)
    prefs.edit().putInt("last_interval_sec", seconds).apply()
    Log.i(TAG, "===DBG=== updateInterval broadcast sent & saved: $seconds")
  }

  @ReactMethod
  fun setAuthToken(token: String?) {
    val prefs = reactContext.getSharedPreferences("location_prefs", Context.MODE_PRIVATE)
    prefs.edit().putString("location_auth_token", token).apply()
    Log.i(TAG, "===DBG=== setAuthToken saved")
  }

  @ReactMethod
  fun setRefreshToken(token: String?) {
    val prefs = reactContext.getSharedPreferences("location_prefs", Context.MODE_PRIVATE)
    prefs.edit().putString("location_refresh_token", token).apply()
    Log.i(TAG, "===DBG=== setRefreshToken saved")
  }

  @ReactMethod
  fun setSessionCookie(sid: String?) {
    val prefs = reactContext.getSharedPreferences("location_prefs", Context.MODE_PRIVATE)
    prefs.edit().putString("location_session_sid", sid).apply()
    Log.i(TAG, "===DBG=== setSessionCookie saved")
  }

  @ReactMethod
  fun setUserId(uid: String?) {
    val prefs = reactContext.getSharedPreferences("location_prefs", Context.MODE_PRIVATE)
    prefs.edit().putString("location_user_id", uid).apply()
    Log.i(TAG, "===DBG=== setUserId saved: $uid")
  }

  @ReactMethod
  fun enableNetworkPosting() {
    val prefs = reactContext.getSharedPreferences("location_prefs", Context.MODE_PRIVATE)
    prefs.edit().putBoolean("network_posting_enabled", true).apply()
    Log.i(TAG, "===DBG=== enableNetworkPosting called")
  }

  @ReactMethod
  fun disableNetworkPosting() {
    val prefs = reactContext.getSharedPreferences("location_prefs", Context.MODE_PRIVATE)
    prefs.edit().putBoolean("network_posting_enabled", false).apply()
    Log.i(TAG, "===DBG=== disableNetworkPosting called")
  }

  @ReactMethod
  fun isTracking(promise: Promise) {
    val prefs = reactContext.getSharedPreferences("location_prefs", Context.MODE_PRIVATE)
    val enabled = prefs.getBoolean("tracking_enabled", false)
    promise.resolve(enabled)
  }
}
