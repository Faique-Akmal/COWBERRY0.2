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

  override fun getName(): String = "LocationServiceBridge"

  @ReactMethod
  fun startService(initialIntervalSec: Int, promise: Promise) {
    try {
      val intent = Intent(reactContext, LocationService::class.java)
      intent.putExtra("interval", initialIntervalSec)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        reactContext.startForegroundService(intent)
      } else {
        reactContext.startService(intent)
      }
      Log.i("LocationModule", "===DBG=== startService called with interval $initialIntervalSec")
      promise.resolve(true)
    } catch (ex: Exception) {
      Log.e("LocationModule", "startService failed: ${ex.message}")
      promise.reject("START_SERVICE_FAILED", ex.message)
    }
  }

  @ReactMethod
  fun stopService(promise: Promise) {
    try {
      val intent = Intent(reactContext, LocationService::class.java)
      reactContext.stopService(intent)
      Log.i("LocationModule", "===DBG=== stopService called")
      promise.resolve(true)
    } catch (ex: Exception) {
      Log.e("LocationModule", "stopService failed: ${ex.message}")
      promise.reject("STOP_SERVICE_FAILED", ex.message)
    }
  }

  @ReactMethod
  fun updateInterval(seconds: Int) {
    val intent = Intent("com.cowberry.UPDATE_INTERVAL")
    intent.putExtra("interval", seconds)
    reactContext.sendBroadcast(intent)
    Log.i("LocationModule", "===DBG=== updateInterval broadcast sent: $seconds")
  }

  @ReactMethod
  fun setAuthToken(token: String?) {
    val prefs = reactContext.getSharedPreferences("location_prefs", Context.MODE_PRIVATE)
    prefs.edit().putString("location_auth_token", token).apply()
    Log.i("LocationModule", "===DBG=== setAuthToken saved")
  }

  @ReactMethod
  fun setRefreshToken(token: String?) {
    val prefs = reactContext.getSharedPreferences("location_prefs", Context.MODE_PRIVATE)
    prefs.edit().putString("location_refresh_token", token).apply()
    Log.i("LocationModule", "===DBG=== setRefreshToken saved")
  }

  @ReactMethod
  fun setSessionCookie(sid: String?) {
    val prefs = reactContext.getSharedPreferences("location_prefs", Context.MODE_PRIVATE)
    prefs.edit().putString("location_session_sid", sid).apply()
    Log.i("LocationModule", "===DBG=== setSessionCookie saved")
  }

  @ReactMethod
  fun setUserId(uid: String?) {
    val prefs = reactContext.getSharedPreferences("location_prefs", Context.MODE_PRIVATE)
    prefs.edit().putString("location_user_id", uid).apply()
    Log.i("LocationModule", "===DBG=== setUserId saved: $uid")
  }

  @ReactMethod
  fun enableNetworkPosting() {
    val prefs = reactContext.getSharedPreferences("location_prefs", Context.MODE_PRIVATE)
    prefs.edit().putBoolean("network_posting_enabled", true).apply()
    Log.i("LocationModule", "===DBG=== enableNetworkPosting called")
  }

  @ReactMethod
  fun disableNetworkPosting() {
    val prefs = reactContext.getSharedPreferences("location_prefs", Context.MODE_PRIVATE)
    prefs.edit().putBoolean("network_posting_enabled", false).apply()
    Log.i("LocationModule", "===DBG=== disableNetworkPosting called")
  }
}
