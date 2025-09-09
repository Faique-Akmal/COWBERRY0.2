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

  // Keys for persistent storage
  private let kAuthTokenKey = "location_auth_token"
  private let kUserIdKey = "location_user_id"

  override init() {
    super.init()
    print("===DBG=== LocationService init called")
    manager.delegate = self
    manager.desiredAccuracy = kCLLocationAccuracyBest
    manager.allowsBackgroundLocationUpdates = true
    manager.pausesLocationUpdatesAutomatically = false

    UIDevice.current.isBatteryMonitoringEnabled = true
    print("===DBG=== Battery monitoring enabled")

    // Load persisted token / userId if present
    if let savedToken = UserDefaults.standard.string(forKey: kAuthTokenKey) {
      self.authToken = savedToken
      print("===DBG=== Loaded auth token from UserDefaults (prefix): \(savedToken.prefix(15))…")
    } else {
      print("===DBG=== No auth token in UserDefaults at init")
    }

    if let savedUid = UserDefaults.standard.string(forKey: kUserIdKey) {
      self.userId = savedUid
      print("===DBG=== Loaded userId from UserDefaults: \(savedUid)")
    } else {
      print("===DBG=== No userId in UserDefaults at init")
    }
  }

  @objc func startTracking() {
    print("===DBG=== startTracking called")
    let status = CLLocationManager.authorizationStatus()
    print("===DBG=== Current auth status: \(status.rawValue)")

    if status == .notDetermined {
      print("===DBG=== Requesting Always Authorization…")
      manager.requestAlwaysAuthorization()
    } else if status == .authorizedWhenInUse {
      print("===DBG=== Authorized When In Use - requesting Always Authorization")
      manager.requestAlwaysAuthorization()
    } else if status == .authorizedAlways {
      print("===DBG=== Authorized Always - starting location updates")
      manager.startUpdatingLocation()
      lastSentAt = 0
    } else {
      print("===DBG=== Authorization denied/restricted - ask user to enable Always in Settings")
    }
  }

  @objc func stopTracking() {
    print("===DBG=== stopTracking called -> stopping location updates")
    manager.stopUpdatingLocation()
  }

  @objc func updateInterval(_ seconds: NSNumber) {
    sendIntervalSec = seconds.doubleValue
    print("===DBG=== updateInterval set to \(sendIntervalSec) sec")
  }

  // Persist token so native can survive restarts
@objc func setAuthToken(_ token: String) {
  print("===DBG=== [Swift] setAuthToken called with prefix: \(token.prefix(20))…")
  self.authToken = token
  UserDefaults.standard.set(token, forKey: kAuthTokenKey)
}


@objc func setUserId(_ uid: String) {
  print("===DBG=== [Swift] setUserId called with: \(uid)")
  self.userId = uid
  UserDefaults.standard.set(uid, forKey: kUserIdKey)
}




  func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    var status: CLAuthorizationStatus
    if #available(iOS 14.0, *) {
      status = manager.authorizationStatus
    } else {
      status = CLLocationManager.authorizationStatus()
    }
    print("===DBG=== locationManagerDidChangeAuthorization: \(status.rawValue)")

    if status == .authorizedAlways {
      print("===DBG=== Now authorizedAlways -> starting updates")
      manager.startUpdatingLocation()
      lastSentAt = 0
    } else if status == .authorizedWhenInUse {
      print("===DBG=== Got WhenInUse - should ask for Always")
    } else if status == .denied || status == .restricted {
      print("===DBG=== Authorization denied/restricted - user must enable in Settings")
    }
  }

  func locationManager(_ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus) {
    print("===DBG=== didChangeAuthorization (legacy): \(status.rawValue)")
    if status == .authorizedAlways {
      print("===DBG=== AuthorizedAlways from legacy callback -> starting updates")
      manager.startUpdatingLocation()
      lastSentAt = 0
    }
  }

  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    guard let loc = locations.last else {
      print("===DBG=== didUpdateLocations but no location found")
      return
    }

    print("===DBG=== didUpdateLocations lat: \(loc.coordinate.latitude), lng: \(loc.coordinate.longitude), accuracy: \(loc.horizontalAccuracy)")

    let now = Date().timeIntervalSince1970
    let elapsed = now - lastSentAt
    print("===DBG=== elapsed since lastSentAt: \(String(format: "%.2f", elapsed)) sec (threshold \(sendIntervalSec))")

    if lastSentAt == 0 || elapsed >= sendIntervalSec {
      lastSentAt = now
      print("===DBG=== Interval passed or first send -> posting location")
      postLocation(lat: loc.coordinate.latitude, lng: loc.coordinate.longitude)
    } else {
      print("===DBG=== Not sending yet (waiting for interval)")
    }
  }

  private func postLocation(lat: Double, lng: Double) {
    guard let url = URL(string: "https://stg-admin.cowberryindustries.com/api/locations/") else {
      print("===DBG=== Invalid URL")
      return
    }

    var req = URLRequest(url: url)
    req.httpMethod = "POST"
    req.addValue("application/json", forHTTPHeaderField: "Content-Type")

    if let token = self.authToken, !token.isEmpty {
      req.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
      print("===DBG=== Added Authorization header (token present prefix): \(token.prefix(10))…")
    } else {
      print("===DBG=== No auth token set in native (⚠️ request will fail with 401)")
    }

    let batteryPct = Int((UIDevice.current.batteryLevel * 100).rounded())
    print("===DBG=== Battery level: \(batteryPct)%")

    var payload: [String: Any] = [
      "latitude": String(format: "%.6f", lat),
      "longitude": String(format: "%.6f", lng),
      "battery_level": batteryPct
    ]
    if let uid = self.userId {
      if let intId = Int(uid) {
        payload["user"] = intId
        print("===DBG=== Using numeric userId: \(intId)")
      } else {
        payload["user"] = uid
        print("===DBG=== Using string userId: \(uid)")
      }
    } else {
      print("===DBG=== No userId set in native")
    }

    do {
      let body = try JSONSerialization.data(withJSONObject: payload, options: [])
      req.httpBody = body
      print("===DBG=== postLocation payload JSON: \(String(data: body, encoding: .utf8) ?? "<empty>")")
    } catch {
      print("===DBG=== Failed to serialize payload: \(error.localizedDescription)")
      return
    }

    print("===DBG=== Executing URLSession dataTask…")
    let task = URLSession.shared.dataTask(with: req) { data, resp, err in
      if let err = err {
        print("===DBG=== postLocation error: \(err.localizedDescription)")
        return
      }
      if let httpResp = resp as? HTTPURLResponse {
        print("===DBG=== postLocation response status: \(httpResp.statusCode)")
      } else {
        print("===DBG=== postLocation no HTTPURLResponse received")
      }
      if let data = data, let str = String(data: data, encoding: .utf8) {
        print("===DBG=== postLocation response body: \(str)")
      } else {
        print("===DBG=== postLocation empty response body")
      }
    }
    task.resume()
  }

  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    print("===DBG=== didFailWithError: \(error.localizedDescription)")
  }
}
