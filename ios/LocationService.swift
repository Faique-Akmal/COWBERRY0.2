import Foundation
import CoreLocation
import UIKit

@objc(LocationServiceBridge)
class LocationService: NSObject, CLLocationManagerDelegate {
private let manager = CLLocationManager()
  private var sendIntervalSec: TimeInterval = 120
  private var lastSentAt: TimeInterval = 0
  private var authToken: String? = nil
  private var userId: String? = nil

  override init() {
    super.init()
    NSLog("===DBG=== LocationService init called")
    manager.delegate = self
    manager.desiredAccuracy = kCLLocationAccuracyBest
    manager.allowsBackgroundLocationUpdates = true
    manager.pausesLocationUpdatesAutomatically = false

    // make sure battery monitoring available if you use battery_level
    UIDevice.current.isBatteryMonitoringEnabled = true
  }

  @objc func startTracking() {
    NSLog("===DBG=== startTracking called")
    let status = CLLocationManager.authorizationStatus()
    NSLog("===DBG=== Current auth status: %d", status.rawValue)

    if status == .notDetermined {
      NSLog("===DBG=== Requesting Always Authorization…")
      manager.requestAlwaysAuthorization()
      // don't start updates yet; wait for authorization callback
    } else if status == .authorizedWhenInUse {
      NSLog("===DBG=== Authorized When In Use - requesting Always Authorization")
      manager.requestAlwaysAuthorization()
    } else if status == .authorizedAlways {
      NSLog("===DBG=== Authorized Always - starting location updates")
      manager.startUpdatingLocation()
      // reset lastSentAt so first update can send immediately
      lastSentAt = 0
    } else {
      NSLog("===DBG=== Authorization status is restricted/denied - instruct user to enable Always in Settings")
    }
  }

  @objc func stopTracking() {
    NSLog("===DBG=== stopTracking called")
    manager.stopUpdatingLocation()
  }

  @objc func updateInterval(_ seconds: NSNumber) {
    sendIntervalSec = seconds.doubleValue
    NSLog("===DBG=== updateInterval set to %.0f sec", sendIntervalSec)
  }

  @objc func setAuthToken(_ token: String) {
    self.authToken = token
    NSLog("===DBG=== setAuthToken received: %.10s…", token)
  }

  @objc func setUserId(_ uid: String) {
    self.userId = uid
    NSLog("===DBG=== setUserId received: %@", uid)
  }

  // iOS 14+ authorization change handler
  func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    var status: CLAuthorizationStatus
    if #available(iOS 14.0, *) {
      status = manager.authorizationStatus
    } else {
      status = CLLocationManager.authorizationStatus()
    }
    NSLog("===DBG=== locationManagerDidChangeAuthorization: %d", status.rawValue)

    if status == .authorizedAlways {
      NSLog("===DBG=== Now authorizedAlways -> starting updates")
      manager.startUpdatingLocation()
      lastSentAt = 0
    } else if status == .authorizedWhenInUse {
      NSLog("===DBG=== Got WhenInUse - consider asking for Always")
      // optional: prompt user to go to settings for Always
    } else if status == .denied || status == .restricted {
      NSLog("===DBG=== Authorization denied/restricted - prompt user to enable Always in Settings")
    }
  }

  // Fallback older method (still ok)
  func locationManager(_ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus) {
    NSLog("===DBG=== didChangeAuthorization (legacy): %d", status.rawValue)
    if status == .authorizedAlways {
      manager.startUpdatingLocation()
      lastSentAt = 0
    }
  }

  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    guard let loc = locations.last else {
      NSLog("===DBG=== didUpdateLocations but no location found")
      return
    }

    NSLog("===DBG=== didUpdateLocations lat: %.6f lng: %.6f accuracy: %.1f", loc.coordinate.latitude, loc.coordinate.longitude, loc.horizontalAccuracy)

    let now = Date().timeIntervalSince1970
    let elapsed = now - lastSentAt
    NSLog("===DBG=== elapsed since lastSentAt: %.2f sec (threshold %.2f)", elapsed, sendIntervalSec)

    if lastSentAt == 0 || elapsed >= sendIntervalSec {
      lastSentAt = now
      NSLog("===DBG=== Interval passed or first send -> posting location")
      postLocation(lat: loc.coordinate.latitude, lng: loc.coordinate.longitude)
    } else {
      NSLog("===DBG=== Not sending yet")
    }
  }

  private func postLocation(lat: Double, lng: Double) {
    guard let url = URL(string: "https://stg-admin.cowberryindustries.com/api/locations/") else {
      NSLog("===DBG=== Invalid URL")
      return
    }

    var req = URLRequest(url: url)
    req.httpMethod = "POST"
    req.addValue("application/json", forHTTPHeaderField: "Content-Type")

    if let token = self.authToken, !token.isEmpty {
      req.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
      NSLog("===DBG=== Added Authorization header (token present)")
    } else {
      NSLog("===DBG=== No auth token set in native (will attempt without auth)")
    }

    // payload exactly like axiosInstance expects
    let batteryPct = Int((UIDevice.current.batteryLevel * 100).rounded())
    var payload: [String: Any] = [
      "latitude": String(format: "%.6f", lat),
      "longitude": String(format: "%.6f", lng),
      "battery_level": batteryPct
    ]
    if let uid = self.userId {
      // if server expects integer, try converting
      if let intId = Int(uid) {
        payload["user"] = intId
      } else {
        payload["user"] = uid
      }
    }

    do {
      let body = try JSONSerialization.data(withJSONObject: payload, options: [])
      req.httpBody = body
      NSLog("===DBG=== postLocation payload: %@", String(data: body, encoding: .utf8) ?? "<empty>")
    } catch {
      NSLog("===DBG=== Failed to serialize payload: %@", error.localizedDescription)
      return
    }

    let task = URLSession.shared.dataTask(with: req) { data, resp, err in
      if let err = err {
        NSLog("===DBG=== postLocation error: %@", err.localizedDescription)
        return
      }
      if let httpResp = resp as? HTTPURLResponse {
        NSLog("===DBG=== postLocation response status: %d", httpResp.statusCode)
      }
      if let data = data, let str = String(data: data, encoding: .utf8) {
        NSLog("===DBG=== postLocation response body: %@", str)
      }
    }
    task.resume()
  }

  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    NSLog("===DBG=== didFailWithError: %@", error.localizedDescription)
  }
}
