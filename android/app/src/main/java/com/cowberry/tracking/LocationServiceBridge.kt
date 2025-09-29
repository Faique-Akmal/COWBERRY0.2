package com.cowberry.tracking

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class LocationServiceBridge(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "LocationServiceBridge"
    }

    @ReactMethod
    fun startService(interval: Int) {
        // TODO: yaha tum apna LocationService.kt start karoge
    }

    @ReactMethod
    fun stopService() {
        // TODO: yaha stop karoge
    }

    @ReactMethod
    fun setAuthToken(token: String) {
        // TODO: token save karna
    }

    @ReactMethod
    fun setUserId(uid: String) {
        // TODO: uid save karna
    }

    @ReactMethod
    fun setRefreshToken(refresh: String) {
        // TODO: refresh token save karna
    }

    @ReactMethod
    fun setSessionCookie(sid: String) {
        // TODO: sid save karna
    }
}
