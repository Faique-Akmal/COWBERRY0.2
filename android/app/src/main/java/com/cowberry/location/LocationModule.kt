package com.cowberry.location

import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import com.facebook.react.bridge.*

class LocationModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "LocationServiceBridge"

  @ReactMethod
  fun startService(initialIntervalSec: Int) {
    val intent = Intent(reactContext, LocationService::class.java)
    intent.putExtra("interval", initialIntervalSec)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      reactContext.startForegroundService(intent)
    } else {
      reactContext.startService(intent)
    }
    Log.i("LocationModule", "===DBG=== startService called with interval $initialIntervalSec")
  }

  @ReactMethod
  fun stopService() {
    val intent = Intent(reactContext, LocationService::class.java)
    reactContext.stopService(intent)
    Log.i("LocationModule", "===DBG=== stopService called")
  }

  @ReactMethod
  fun updateInterval(seconds: Int) {
    val intent = Intent("com.cowberry.UPDATE_INTERVAL")
    intent.putExtra("interval", seconds)
    reactContext.sendBroadcast(intent)
    Log.i("LocationModule", "===DBG=== updateInterval broadcast sent: $seconds")
  }

  @ReactMethod
  fun setAuthToken(token: String) {
    val prefs = reactContext.getSharedPreferences("location_prefs", Context.MODE_PRIVATE)
    prefs.edit().putString("location_auth_token", token).apply()
    Log.i("LocationModule", "===DBG=== setAuthToken saved")
  }

  @ReactMethod
  fun setUserId(uid: String) {
    val prefs = reactContext.getSharedPreferences("location_prefs", Context.MODE_PRIVATE)
    prefs.edit().putString("location_user_id", uid).apply()
    Log.i("LocationModule", "===DBG=== setUserId saved: $uid")
  }
}
