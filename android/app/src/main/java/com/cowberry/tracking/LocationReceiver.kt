package com.cowberry.tracking

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

class LocationReceiver : BroadcastReceiver() {
  companion object { private const val TAG = "LocationReceiver" }

  override fun onReceive(context: Context, intent: Intent?) {
    val prefs = context.getSharedPreferences("location_prefs", Context.MODE_PRIVATE)
    if (!prefs.getBoolean("tracking_enabled", false)) {
      Log.i(TAG, "Receiver: tracking disabled — ignoring broadcast")
      return
    }

    Log.i(TAG, "Receiver: onReceive intent=${intent?.action} extras=${intent?.extras}")
    if (intent == null) {
      Log.w(TAG, "Receiver: intent null")
      return
    }

    val newIntervalSec = intent.getIntExtra("interval", -1)
    Log.i(TAG, "Receiver: Got interval extra: $newIntervalSec")

    val svcIntent = Intent(context, LocationService::class.java)
    if (newIntervalSec > 0) svcIntent.putExtra("interval", newIntervalSec)

    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(svcIntent)
        Log.i(TAG, "Receiver: startForegroundService called from receiver")
      } else {
        context.startService(svcIntent)
        Log.i(TAG, "Receiver: startService called from receiver")
      }
    } catch (ex: Exception) {
      Log.e(TAG, "Receiver: Error starting service from receiver: ${ex.message}")
    }
  }
}
