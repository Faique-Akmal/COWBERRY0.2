// import Foundation
// import CoreLocation
// import UIKit

// @objc(LocationServiceBridge)
// class LocationService: NSObject, CLLocationManagerDelegate {
//   private let manager = CLLocationManager()
//   private var sendIntervalSec: TimeInterval = 120
//   private var lastSentAt: TimeInterval = 0
//   private var authToken: String? = nil
//   private var userId: String? = nil

//   // Keys for persistent storage
//   private let kAuthTokenKey = "location_auth_token"
//   private let kUserIdKey = "location_user_id"

//   override init() {
//     super.init()
//     print("===DBG=== LocationService init called")
//     manager.delegate = self
//     manager.desiredAccuracy = kCLLocationAccuracyBest
//     manager.allowsBackgroundLocationUpdates = true
//     manager.pausesLocationUpdatesAutomatically = false

//     UIDevice.current.isBatteryMonitoringEnabled = true
//     print("===DBG=== Battery monitoring enabled")

//     // Load persisted token / userId if present
//     if let savedToken = UserDefaults.standard.string(forKey: kAuthTokenKey) {
//       self.authToken = savedToken
//       print("===DBG=== Loaded auth token from UserDefaults (prefix): \(savedToken.prefix(15))…")
//     } else {
//       print("===DBG=== No auth token in UserDefaults at init")
//     }

//     if let savedUid = UserDefaults.standard.string(forKey: kUserIdKey) {
//       self.userId = savedUid
//       print("===DBG=== Loaded userId from UserDefaults: \(savedUid)")
//     } else {
//       print("===DBG=== No userId in UserDefaults at init")
//     }
//   }

//   @objc func startTracking() {
//     print("===DBG=== startTracking called")
//     let status = CLLocationManager.authorizationStatus()
//     print("===DBG=== Current auth status: \(status.rawValue)")

//     if status == .notDetermined {
//       print("===DBG=== Requesting Always Authorization…")
//       manager.requestAlwaysAuthorization()
//     } else if status == .authorizedWhenInUse {
//       print("===DBG=== Authorized When In Use - requesting Always Authorization")
//       manager.requestAlwaysAuthorization()
//     } else if status == .authorizedAlways {
//       print("===DBG=== Authorized Always - starting location updates")
//       manager.startUpdatingLocation()
//       lastSentAt = 0
//     } else {
//       print("===DBG=== Authorization denied/restricted - ask user to enable Always in Settings")
//     }
//   }

//   @objc func stopTracking() {
//     print("===DBG=== stopTracking called -> stopping location updates")
//     manager.stopUpdatingLocation()
//   }

//   @objc func updateInterval(_ seconds: NSNumber) {
//     sendIntervalSec = seconds.doubleValue
//     print("===DBG=== updateInterval set to \(sendIntervalSec) sec")
//   }

//   // Persist token so native can survive restarts
// @objc func setAuthToken(_ token: String) {
//   print("===DBG=== [Swift] setAuthToken called with prefix: \(token.prefix(20))…")
//   self.authToken = token
//   UserDefaults.standard.set(token, forKey: kAuthTokenKey)
// }

// @objc func setUserId(_ uid: String) {
//   print("===DBG=== [Swift] setUserId called with: \(uid)")
//   self.userId = uid
//   UserDefaults.standard.set(uid, forKey: kUserIdKey)
// }

//   func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
//     var status: CLAuthorizationStatus
//     if #available(iOS 14.0, *) {
//       status = manager.authorizationStatus
//     } else {
//       status = CLLocationManager.authorizationStatus()
//     }
//     print("===DBG=== locationManagerDidChangeAuthorization: \(status.rawValue)")

//     if status == .authorizedAlways {
//       print("===DBG=== Now authorizedAlways -> starting updates")
//       manager.startUpdatingLocation()
//       lastSentAt = 0
//     } else if status == .authorizedWhenInUse {
//       print("===DBG=== Got WhenInUse - should ask for Always")
//     } else if status == .denied || status == .restricted {
//       print("===DBG=== Authorization denied/restricted - user must enable in Settings")
//     }
//   }

//   func locationManager(_ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus) {
//     print("===DBG=== didChangeAuthorization (legacy): \(status.rawValue)")
//     if status == .authorizedAlways {
//       print("===DBG=== AuthorizedAlways from legacy callback -> starting updates")
//       manager.startUpdatingLocation()
//       lastSentAt = 0
//     }
//   }

//   func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
//     guard let loc = locations.last else {
//       print("===DBG=== didUpdateLocations but no location found")
//       return
//     }

//     print("===DBG=== didUpdateLocations lat: \(loc.coordinate.latitude), lng: \(loc.coordinate.longitude), accuracy: \(loc.horizontalAccuracy)")

//     let now = Date().timeIntervalSince1970
//     let elapsed = now - lastSentAt
//     print("===DBG=== elapsed since lastSentAt: \(String(format: "%.2f", elapsed)) sec (threshold \(sendIntervalSec))")

//     if lastSentAt == 0 || elapsed >= sendIntervalSec {
//       lastSentAt = now
//       print("===DBG=== Interval passed or first send -> posting location")
//       postLocation(lat: loc.coordinate.latitude, lng: loc.coordinate.longitude)
//     } else {
//       print("===DBG=== Not sending yet (waiting for interval)")
//     }
//   }

//   private func postLocation(lat: Double, lng: Double) {
//     guard let url = URL(string: "https://stg-admin.cowberryindustries.com/api/locations/") else {
//       print("===DBG=== Invalid URL")
//       return
//     }

//     var req = URLRequest(url: url)
//     req.httpMethod = "POST"
//     req.addValue("application/json", forHTTPHeaderField: "Content-Type")

//     if let token = self.authToken, !token.isEmpty {
//       req.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
//       print("===DBG=== Added Authorization header (token present prefix): \(token.prefix(10))…")
//     } else {
//       print("===DBG=== No auth token set in native (⚠️ request will fail with 401)")
//     }

//     let batteryPct = Int((UIDevice.current.batteryLevel * 100).rounded())
//     print("===DBG=== Battery level: \(batteryPct)%")

//     var payload: [String: Any] = [
//       "latitude": String(format: "%.6f", lat),
//       "longitude": String(format: "%.6f", lng),
//       "battery_level": batteryPct
//     ]
//     if let uid = self.userId {
//       if let intId = Int(uid) {
//         payload["user"] = intId
//         print("===DBG=== Using numeric userId: \(intId)")
//       } else {
//         payload["user"] = uid
//         print("===DBG=== Using string userId: \(uid)")
//       }
//     } else {
//       print("===DBG=== No userId set in native")
//     }

//     do {
//       let body = try JSONSerialization.data(withJSONObject: payload, options: [])
//       req.httpBody = body
//       print("===DBG=== postLocation payload JSON: \(String(data: body, encoding: .utf8) ?? "<empty>")")
//     } catch {
//       print("===DBG=== Failed to serialize payload: \(error.localizedDescription)")
//       return
//     }

//     print("===DBG=== Executing URLSession dataTask…")
//     let task = URLSession.shared.dataTask(with: req) { data, resp, err in
//       if let err = err {
//         print("===DBG=== postLocation error: \(err.localizedDescription)")
//         return
//       }
//       if let httpResp = resp as? HTTPURLResponse {
//         print("===DBG=== postLocation response status: \(httpResp.statusCode)")
//       } else {
//         print("===DBG=== postLocation no HTTPURLResponse received")
//       }
//       if let data = data, let str = String(data: data, encoding: .utf8) {
//         print("===DBG=== postLocation response body: \(str)")
//       } else {
//         print("===DBG=== postLocation empty response body")
//       }
//     }
//     task.resume()
//   }

//   func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
//     print("===DBG=== didFailWithError: \(error.localizedDescription)")
//   }
// }

import CoreLocation
import Foundation
import Network
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
  private let kRefreshTokenKey = "location_refresh_token"
  private let kAuthFailCountKey = "location_auth_fail_count"
  private let kMaxAuthFailures: Int = 3

    // change this to point to your local backend when testing
  private let apiBase = "http://192.168.0.143:8001/api"


  // -------------------------
  // OFFLINE QUEUE
  // -------------------------
  // File-based queue to avoid UserDefaults size issues
  private let offlineFilename = "offline_locations.json"
  private var offlineQueueURL: URL {
    let fm = FileManager.default
    let docs = fm.urls(for: .documentDirectory, in: .userDomainMask).first!
    return docs.appendingPathComponent(offlineFilename)
  }
  private let queueAccess = DispatchQueue(
    label: "com.cowberry.locations.queue", attributes: .concurrent)
  private let maxOfflineItems = 1000
  private let syncBatchSize = 20  // send in small batches

  // -------------------------
  // NETWORK / SYNC STATE
  // -------------------------
  private var monitor: NWPathMonitor?
  private var isNetworkAvailable: Bool = false

  // prevent concurrent syncs
  private var isSyncingOffline: Bool = false

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
      print(
        "===DBG=== Loaded auth token from UserDefaults (prefix): \(savedToken.prefix(min(15, savedToken.count)))…"
      )
    } else {
      print("===DBG=== No auth token in UserDefaults at init")
    }

    if let savedUid = UserDefaults.standard.string(forKey: kUserIdKey) {
      self.userId = savedUid
      print("===DBG=== Loaded userId from UserDefaults: \(savedUid)")
    } else {
      print("===DBG=== No userId in UserDefaults at init")
    }

    // start network monitor
    startNetworkMonitor()
  }

  deinit {
    monitor?.cancel()
  }

  // -------------------------
  // Public RN-exposed methods
  // -------------------------
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

  @objc func setAuthToken(_ token: String) {
    print(
      "===DBG=== [Swift] setAuthToken called with prefix: \(token.prefix(min(20, token.count)))…")
    self.authToken = token
    UserDefaults.standard.set(token, forKey: kAuthTokenKey)
    UserDefaults.standard.synchronize()
  }

  @objc func setUserId(_ uid: String) {
    print("===DBG=== [Swift] setUserId called with: \(uid)")
    self.userId = uid
    UserDefaults.standard.set(uid, forKey: kUserIdKey)
    UserDefaults.standard.synchronize()
  }

  @objc func setRefreshToken(_ refresh: String) {
    print(
      "===DBG=== [Swift] setRefreshToken called (prefix): \(refresh.prefix(min(10, refresh.count)))"
    )
    UserDefaults.standard.set(refresh, forKey: kRefreshTokenKey)
    UserDefaults.standard.synchronize()
  }

  // Exposed: Force a manual offline sync from JS (void/simple)
  @objc func syncOfflineSimple() {
    print("===DBG=== syncOfflineSimple called from JS")
    self.syncOfflineLocations()
  }

  // -------------------------
  // CLLocationManagerDelegate
  // -------------------------
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

  func locationManager(
    _ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus
  ) {
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

    print(
      "===DBG=== didUpdateLocations lat: \(loc.coordinate.latitude), lng: \(loc.coordinate.longitude), accuracy: \(loc.horizontalAccuracy)"
    )

    let now = Date().timeIntervalSince1970
    let elapsed = now - lastSentAt
    let elapsedStr = String(format: "%.2f", elapsed)
    print("===DBG=== elapsed since lastSentAt: \(elapsedStr) sec (threshold \(sendIntervalSec))")

    if lastSentAt == 0 || elapsed >= sendIntervalSec {
      lastSentAt = now
      print("===DBG=== Interval passed or first send -> posting location")
      postLocation(lat: loc.coordinate.latitude, lng: loc.coordinate.longitude)
    } else {
      print("===DBG=== Not sending yet (waiting for interval)")
    }
  }

  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    print("===DBG=== didFailWithError: \(error.localizedDescription)")
  }

  // -------------------------
  // Networking + Offline handling
  // -------------------------
  private struct OfflineLocation: Codable {
    let latitude: String
    let longitude: String
    let battery_level: Int
    let user: String?
    let ts: TimeInterval  // original capture time as epoch seconds (kept for compatibility)
    let vehicle_type: String?  // optional, backend expects this
  }

  private func postLocation(lat: Double, lng: Double) {
   guard let url = URL(string: "\(self.apiBase)/locations/") else {
  print("===DBG=== Invalid URL")
  return
}


    var req = URLRequest(url: url)
    req.httpMethod = "POST"
    req.addValue("application/json", forHTTPHeaderField: "Content-Type")

    if let token = self.authToken, !token.isEmpty {
      req.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
      print(
        "===DBG=== Added Authorization header (token present prefix): \(token.prefix(min(10, token.count)))…"
      )
    } else {
      print("===DBG=== No auth token set in native (⚠️ request will fail with 401)")
    }

    let batteryPctRaw = UIDevice.current.batteryLevel
    let batteryPct = batteryPctRaw >= 0 ? Int((batteryPctRaw * 100).rounded()) : 0

    let now = Date().timeIntervalSince1970
    let timestampIso = iso8601String(from: now)

    var payload: [String: Any] = [
      "timestamp": timestampIso,
      "latitude": String(format: "%.6f", lat),
      "longitude": String(format: "%.6f", lng),
      "battery_level": batteryPct,
      "vehicle_type": "walk",  // or use value coming from JS/native if available
    ]
    if let uid = self.userId {
      if let intId = Int(uid) {
        payload["user"] = intId
        print("===DBG=== Using numeric userId: \(intId)")
      } else {
        payload["user"] = uid
        print("===DBG=== Using string userId: \(uid)")
      }
    }

    do {
      let body = try JSONSerialization.data(withJSONObject: payload, options: [])
      req.httpBody = body
      let bodyStr = String(data: body, encoding: .utf8) ?? "<empty>"
      print("===DBG=== postLocation payload JSON: \(bodyStr)")
    } catch {
      print("===DBG=== Failed to serialize payload: \(error.localizedDescription)")
      return
    }

    // If no network, save offline directly
    if !isNetworkAvailable {
      print("===DBG=== Network down -> saving location offline")
      // pass nil because we don't have a vehicle_type from JS/native at this point
      self.saveOfflineLocation(lat: lat, lng: lng, battery: batteryPct, vehicleType: nil)
      return
    }

    print("===DBG=== Executing URLSession dataTask…")
    let task = URLSession.shared.dataTask(with: req) { [weak self] data, resp, err in
      guard let self = self else { return }

      if let err = err {
        print("===DBG=== postLocation error: \(err.localizedDescription) -> saving offline")
        self.saveOfflineLocation(lat: lat, lng: lng, battery: batteryPct, vehicleType: nil)
        return
      }
      if let httpResp = resp as? HTTPURLResponse {
        print("===DBG=== postLocation response status: \(httpResp.statusCode)")
        if httpResp.statusCode == 401 {
          print("===DBG=== postLocation got 401 -> attempting native refresh and retry")
          self.handleAuthFailureAndRetry(lat: lat, lng: lng)
          return
        }
        if !(200...299).contains(httpResp.statusCode) {
          print("===DBG=== non-2xx response -> saving offline")
          self.saveOfflineLocation(lat: lat, lng: lng, battery: batteryPct, vehicleType: nil)
          return
        }
      } else {
        print("===DBG=== postLocation no HTTPURLResponse received -> saving offline")
        self.saveOfflineLocation(lat: lat, lng: lng, battery: batteryPct, vehicleType: nil)
        return
      }
      if let data = data, let str = String(data: data, encoding: .utf8) {
        print("===DBG=== postLocation response body: \(str)")
      } else {
        print("===DBG=== postLocation empty response body")
      }

      // Success -> try to sync any queued items too
      self.syncOfflineLocationsIfNeeded()
    }
    task.resume()
  }

  // Called when a 401 occurs: try refreshing token natively and retry once
  private func handleAuthFailureAndRetry(lat: Double, lng: Double) {
    // increment failure counter
    var failCount = UserDefaults.standard.integer(forKey: kAuthFailCountKey)
    failCount += 1
    UserDefaults.standard.set(failCount, forKey: kAuthFailCountKey)
    UserDefaults.standard.synchronize()

    if failCount > kMaxAuthFailures {
      print("===DBG=== Too many auth failures (\(failCount)) — stopping updates to avoid spam")
      DispatchQueue.main.async {
        self.manager.stopUpdatingLocation()
      }
      return
    }

    // perform refresh
    performTokenRefresh { [weak self] success in
      guard let self = self else { return }
      if success {
        // reset fail count
        UserDefaults.standard.removeObject(forKey: self.kAuthFailCountKey)
        UserDefaults.standard.synchronize()
        // retry posting once with updated token
        print("===DBG=== Token refresh successful — retrying postLocation")
        self.postLocation(lat: lat, lng: lng)
      } else {
        print("===DBG=== Token refresh failed — will stop updates")
        DispatchQueue.main.async {
          self.manager.stopUpdatingLocation()
        }
      }
    }
  }

  // Performs the token refresh by calling backend refresh endpoint using stored refresh token
  private func performTokenRefresh(completion: @escaping (Bool) -> Void) {
    guard let refresh = UserDefaults.standard.string(forKey: kRefreshTokenKey) else {
      print("===DBG=== performTokenRefresh: no refresh token available")
      completion(false)
      return
    }

    guard let url = URL(string: "https://stg-admin.cowberryindustries.com/api/token/refresh/")
    else {
      print("===DBG=== performTokenRefresh: invalid URL")
      completion(false)
      return
    }

    var req = URLRequest(url: url)
    req.httpMethod = "POST"
    req.addValue("application/json", forHTTPHeaderField: "Content-Type")
    let body: [String: Any] = ["refresh": refresh]
    do {
      req.httpBody = try JSONSerialization.data(withJSONObject: body, options: [])
    } catch {
      print("===DBG=== performTokenRefresh: failed serialize body", error)
      completion(false)
      return
    }

    print("===DBG=== Performing token refresh (native)…")
    let task = URLSession.shared.dataTask(with: req) { [weak self] data, resp, err in
      guard let self = self else {
        completion(false)
        return
      }

      if let err = err {
        print("===DBG=== performTokenRefresh error:", err.localizedDescription)
        completion(false)
        return
      }
      guard let httpResp = resp as? HTTPURLResponse else {
        print("===DBG=== performTokenRefresh no HTTP response")
        completion(false)
        return
      }
      if httpResp.statusCode != 200 {
        print("===DBG=== performTokenRefresh status:", httpResp.statusCode)
        completion(false)
        return
      }
      guard let data = data,
        let json = try? JSONSerialization.jsonObject(with: data, options: []) as? [String: Any],
        let newAccess = (json["access"] as? String)
      else {
        print("===DBG=== performTokenRefresh: parse failed")
        completion(false)
        return
      }

      // store new token and update auth header
      UserDefaults.standard.set(newAccess, forKey: self.kAuthTokenKey)
      UserDefaults.standard.synchronize()
      self.authToken = newAccess
      print(
        "===DBG=== performTokenRefresh: new access token saved (prefix): \(newAccess.prefix(min(10, newAccess.count)))…"
      )
      completion(true)
    }
    task.resume()
  }

  // helper to produce ISO-8601 timestamp strings (UTC, fractional seconds)
  private func iso8601String(from timeInterval: TimeInterval) -> String {
    let date = Date(timeIntervalSince1970: timeInterval)
    let fmt = ISO8601DateFormatter()
    fmt.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    fmt.timeZone = TimeZone(secondsFromGMT: 0)
    return fmt.string(from: date) // e.g. 2025-09-11T04:32:27.640Z
  }

  // -------------------------
  // OFFLINE QUEUE: save/load atomic
  // -------------------------
  private func loadOfflineQueueFromDisk() -> [OfflineLocation] {
    do {
      let url = offlineQueueURL
      if FileManager.default.fileExists(atPath: url.path) {
        let data = try Data(contentsOf: url)
        if data.isEmpty { return [] }
        let items = try JSONDecoder().decode([OfflineLocation].self, from: data)
        return items
      }
    } catch {
      print("===DBG=== loadOfflineQueueFromDisk error:", error)
      // if file corrupted, remove to recover
      try? FileManager.default.removeItem(at: offlineQueueURL)
      print("===DBG=== removed corrupted offline queue file")
    }
    return []
  }

  private func writeOfflineQueueToDisk(_ items: [OfflineLocation]) {
    do {
      let data = try JSONEncoder().encode(items)
      try data.write(to: self.offlineQueueURL, options: .atomic)
      print(
        "===DBG=== writeOfflineQueueToDisk saved count:", items.count, " path:",
        offlineQueueURL.path)
    } catch {
      print("===DBG=== writeOfflineQueueToDisk error:", error)
    }
  }

  private func saveOfflineLocation(
    lat: Double, lng: Double, battery: Int, vehicleType: String? = "walk"
  ) {
    let loc = OfflineLocation(
      latitude: String(format: "%.6f", lat),
      longitude: String(format: "%.6f", lng),
      battery_level: battery,
      user: self.userId,
      ts: Date().timeIntervalSince1970,
      vehicle_type: vehicleType
    )

    queueAccess.async(flags: .barrier) {
      var items = self.loadOfflineQueueFromDisk()
      if items.count >= self.maxOfflineItems {
        items.removeFirst(items.count - (self.maxOfflineItems - 1))
      }
      items.append(loc)
      self.writeOfflineQueueToDisk(items)
      print("===DBG=== Saved offline location. newCount:", items.count)
    }
  }

  // Sync in batches. Completion handler optional.
  private func syncOfflineLocations(completion: (() -> Void)? = nil) {
    if !isNetworkAvailable {
      print("===DBG=== syncOfflineLocations called but network unavailable")
      completion?()
      return
    }

    queueAccess.async {
      if self.isSyncingOffline {
        print("===DBG=== sync already in progress, returning")
        DispatchQueue.main.async { completion?() }
        return
      }
      self.isSyncingOffline = true

      var items = self.loadOfflineQueueFromDisk()
      guard !items.isEmpty else {
        print("===DBG=== no offline locations to sync")
        self.isSyncingOffline = false
        DispatchQueue.main.async { completion?() }
        return
      }

      let batchCount = min(self.syncBatchSize, items.count)
      let batch = Array(items.prefix(batchCount))

      func finishSync(successfullyRemoved: Bool) {
        self.isSyncingOffline = false
        DispatchQueue.main.async { completion?() }
      }

   func sendOne(_ idx: Int) {
  guard idx < batch.count else {
    // existing removal code...
    return
  }

  let it = batch[idx]
  // <-- use explicit self inside closure
  let timestampIso = self.iso8601String(from: it.ts)

  var payload: [String: Any] = [
    "timestamp": timestampIso,
    "latitude": it.latitude,
    "longitude": it.longitude,
    "battery_level": it.battery_level,
  ]
  if let v = it.vehicle_type {
    payload["vehicle_type"] = v
  }
  if let uid = it.user, let i = Int(uid) {
    payload["user"] = i
  } else if let uid = it.user {
    payload["user"] = uid
  }

 guard let url = URL(string: "\(self.apiBase)/locations/") else {
  print("===DBG=== syncOfflineLocations invalid URL")
  finishSync(successfullyRemoved: false)
  return
}


  var req = URLRequest(url: url)
  req.httpMethod = "POST"
  req.addValue("application/json", forHTTPHeaderField: "Content-Type")
  if let token = self.authToken {
    req.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
  }

  do {
    req.httpBody = try JSONSerialization.data(withJSONObject: payload, options: [])
  } catch {
    print("===DBG=== syncOfflineLocations JSON serialize error for item \(idx):", error)
    finishSync(successfullyRemoved: false)
    return
  }

  let task = URLSession.shared.dataTask(with: req) { [weak self] data, resp, err in
    guard let self = self else {
      finishSync(successfullyRemoved: false)
      return
    }

    if let err = err {
      print("===DBG=== syncOfflineLocations network error for item \(idx):", err.localizedDescription)
      finishSync(successfullyRemoved: false)
      return
    }

    if let httpResp = resp as? HTTPURLResponse {
      print("===DBG=== syncOfflineLocations response status: \(httpResp.statusCode) for item \(idx)")
      if httpResp.statusCode == 401 {
        print("===DBG=== syncOfflineLocations got 401 -> refreshing token")
        self.performTokenRefresh { success in
          print("===DBG=== syncOfflineLocations refresh result: \(success)")
          finishSync(successfullyRemoved: false)
        }
        return
      }
      if !(200...299).contains(httpResp.statusCode) {
        if let d = data, let bodyStr = String(data: d, encoding: .utf8) {
          print("===DBG=== syncOfflineLocations server error body for item \(idx): \(bodyStr)")
        }
        print("===DBG=== syncOfflineLocations non-2xx for item \(idx) -> abort batch and retry later")
        finishSync(successfullyRemoved: false)
        return
      }
    } else {
      print("===DBG=== syncOfflineLocations no HTTPURLResponse for item \(idx) -> abort")
      finishSync(successfullyRemoved: false)
      return
    }

    // success -> small gap (0.1s) then next
    DispatchQueue.global().asyncAfter(deadline: .now() + 0.1) {
      sendOne(idx + 1)
    }
  }
  task.resume()
}


      // start sending
      sendOne(0)
    }
  }

  // small wrapper to attempt sync if items exist
  private func syncOfflineLocationsIfNeeded() {
    queueAccess.async {
      let items = self.loadOfflineQueueFromDisk()
      if !items.isEmpty && self.isNetworkAvailable && !self.isSyncingOffline {
        self.syncOfflineLocations()
      }
    }
  }

  // -------------------------
  // Network monitor using NWPathMonitor
  // -------------------------
  private func startNetworkMonitor() {
    monitor = NWPathMonitor()
    let q = DispatchQueue(label: "com.cowberry.network.monitor")
    monitor?.pathUpdateHandler = { [weak self] path in
      guard let self = self else { return }
      let online = path.status == .satisfied
      if online != self.isNetworkAvailable {
        self.isNetworkAvailable = online
        print("===DBG=== Network availability changed: \(online)")
        if online {
          // small delay to let system stabilize
          DispatchQueue.global().asyncAfter(deadline: .now() + 0.3) {
            if !self.isSyncingOffline {
              self.syncOfflineLocations()
            } else {
              print("===DBG=== sync already running, skip start")
            }
          }
        }
      }
    }
    monitor?.start(queue: q)

    // best-effort initial state
    if let current = monitor?.currentPath {
      self.isNetworkAvailable = (current.status == .satisfied)
      print("===DBG=== Initial network state:", self.isNetworkAvailable)
    }
  }
}


// exect timestam ke sath post

// import Foundation
// import CoreLocation
// import UIKit
// import Network

// @objc(LocationServiceBridge)
// class LocationService: NSObject, CLLocationManagerDelegate {
//   private let manager = CLLocationManager()
//   private var sendIntervalSec: TimeInterval = 120
//   private var lastSentAt: TimeInterval = 0
//   private var authToken: String? = nil
//   private var userId: String? = nil

//   // Keys for persistent storage
//   private let kAuthTokenKey = "location_auth_token"
//   private let kUserIdKey = "location_user_id"
//   private let kRefreshTokenKey = "location_refresh_token"
//   private let kAuthFailCountKey = "location_auth_fail_count"
//   private let kMaxAuthFailures: Int = 3

//   // -------------------------
//   // OFFLINE QUEUE
//   // -------------------------
//   // File-based queue to avoid UserDefaults size issues
//   private let offlineFilename = "offline_locations.json"
//   private var offlineQueueURL: URL {
//     let fm = FileManager.default
//     let docs = fm.urls(for: .documentDirectory, in: .userDomainMask).first!
//     return docs.appendingPathComponent(offlineFilename)
//   }
//   private let queueAccess = DispatchQueue(label: "com.cowberry.locations.queue", attributes: .concurrent)
//   private let maxOfflineItems = 1000
//   private let syncBatchSize = 20 // send in small batches

//   // -------------------------
//   // NETWORK / SYNC STATE
//   // -------------------------
//   private var monitor: NWPathMonitor?
//   private var isNetworkAvailable: Bool = false

//   // prevent concurrent syncs
//   private var isSyncingOffline: Bool = false

//   // optional vehicle type (can be set from JS/native)
//   private var currentVehicleType: String? = nil

//   override init() {
//     super.init()
//     print("===DBG=== LocationService init called")
//     manager.delegate = self
//     manager.desiredAccuracy = kCLLocationAccuracyBest
//     manager.allowsBackgroundLocationUpdates = true
//     manager.pausesLocationUpdatesAutomatically = false

//     UIDevice.current.isBatteryMonitoringEnabled = true
//     print("===DBG=== Battery monitoring enabled")

//     // Load persisted token / userId if present
//     if let savedToken = UserDefaults.standard.string(forKey: kAuthTokenKey) {
//       self.authToken = savedToken
//       print("===DBG=== Loaded auth token from UserDefaults (prefix): \(savedToken.prefix(min(15, savedToken.count)))…")
//     } else {
//       print("===DBG=== No auth token in UserDefaults at init")
//     }

//     if let savedUid = UserDefaults.standard.string(forKey: kUserIdKey) {
//       self.userId = savedUid
//       print("===DBG=== Loaded userId from UserDefaults: \(savedUid)")
//     } else {
//       print("===DBG=== No userId in UserDefaults at init")
//     }

//     // start network monitor
//     startNetworkMonitor()
//   }

//   deinit {
//     monitor?.cancel()
//   }

//   // -------------------------
//   // Public RN-exposed methods
//   // -------------------------
//   @objc func startTracking() {
//     print("===DBG=== startTracking called")
//     let status = CLLocationManager.authorizationStatus()
//     print("===DBG=== Current auth status: \(status.rawValue)")

//     if status == .notDetermined {
//       print("===DBG=== Requesting Always Authorization…")
//       manager.requestAlwaysAuthorization()
//     } else if status == .authorizedWhenInUse {
//       print("===DBG=== Authorized When In Use - requesting Always Authorization")
//       manager.requestAlwaysAuthorization()
//     } else if status == .authorizedAlways {
//       print("===DBG=== Authorized Always - starting location updates")
//       manager.startUpdatingLocation()
//       lastSentAt = 0
//     } else {
//       print("===DBG=== Authorization denied/restricted - ask user to enable Always in Settings")
//     }
//   }

//   @objc func stopTracking() {
//     print("===DBG=== stopTracking called -> stopping location updates")
//     manager.stopUpdatingLocation()
//   }

//   @objc func updateInterval(_ seconds: NSNumber) {
//     sendIntervalSec = seconds.doubleValue
//     print("===DBG=== updateInterval set to \(sendIntervalSec) sec")
//   }

//   @objc func setAuthToken(_ token: String) {
//     print("===DBG=== [Swift] setAuthToken called with prefix: \(token.prefix(min(20, token.count)))…")
//     self.authToken = token
//     UserDefaults.standard.set(token, forKey: kAuthTokenKey)
//     UserDefaults.standard.synchronize()
//   }

//  @objc func setUserId(_ uid: String) {
//   // ignore "undefined" or empty strings coming from JS
//   let trimmed = uid.trimmingCharacters(in: .whitespacesAndNewlines)
//   if trimmed.isEmpty || trimmed == "undefined" {
//     print("===DBG=== setUserId called with invalid value '\(uid)'. Clearing stored userId.")
//     UserDefaults.standard.removeObject(forKey: kUserIdKey)
//     UserDefaults.standard.synchronize()
//     self.userId = nil
//     return
//   }
//   print("===DBG=== [Swift] setUserId called with: \(trimmed)")
//   self.userId = trimmed
//   UserDefaults.standard.set(trimmed, forKey: kUserIdKey)
//   UserDefaults.standard.synchronize()
// }

//   @objc func setRefreshToken(_ refresh: String) {
//     print("===DBG=== [Swift] setRefreshToken called (prefix): \(refresh.prefix(min(10, refresh.count)))")
//     UserDefaults.standard.set(refresh, forKey: kRefreshTokenKey)
//     UserDefaults.standard.synchronize()
//   }

//   // allow JS to set vehicle_type if available
//   @objc func setVehicleType(_ v: String?) {
//     if let vv = v {
//       self.currentVehicleType = vv
//       print("===DBG=== setVehicleType called: \(vv)")
//     } else {
//       self.currentVehicleType = nil
//       print("===DBG=== setVehicleType called: nil (cleared)")
//     }
//   }

//   // Exposed: Force a manual offline sync from JS (void/simple)
//   @objc func syncOfflineSimple() {
//     print("===DBG=== syncOfflineSimple called from JS")
//     self.syncOfflineLocations()
//   }

//   // -------------------------
//   // CLLocationManagerDelegate
//   // -------------------------
//   func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
//     var status: CLAuthorizationStatus
//     if #available(iOS 14.0, *) {
//       status = manager.authorizationStatus
//     } else {
//       status = CLLocationManager.authorizationStatus()
//     }
//     print("===DBG=== locationManagerDidChangeAuthorization: \(status.rawValue)")

//     if status == .authorizedAlways {
//       print("===DBG=== Now authorizedAlways -> starting updates")
//       manager.startUpdatingLocation()
//       lastSentAt = 0
//     } else if status == .authorizedWhenInUse {
//       print("===DBG=== Got WhenInUse - should ask for Always")
//     } else if status == .denied || status == .restricted {
//       print("===DBG=== Authorization denied/restricted - user must enable in Settings")
//     }
//   }

//   func locationManager(_ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus) {
//     print("===DBG=== didChangeAuthorization (legacy): \(status.rawValue)")
//     if status == .authorizedAlways {
//       print("===DBG=== AuthorizedAlways from legacy callback -> starting updates")
//       manager.startUpdatingLocation()
//       lastSentAt = 0
//     }
//   }

//   func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
//     guard let loc = locations.last else {
//       print("===DBG=== didUpdateLocations but no location found")
//       return
//     }

//     print("===DBG=== didUpdateLocations lat: \(loc.coordinate.latitude), lng: \(loc.coordinate.longitude), accuracy: \(loc.horizontalAccuracy)")

//     let now = Date().timeIntervalSince1970
//     let elapsed = now - lastSentAt
//     let elapsedStr = String(format: "%.2f", elapsed)
//     print("===DBG=== elapsed since lastSentAt: \(elapsedStr) sec (threshold \(sendIntervalSec))")

//     if lastSentAt == 0 || elapsed >= sendIntervalSec {
//       lastSentAt = now
//       print("===DBG=== Interval passed or first send -> posting location")
//       postLocation(lat: loc.coordinate.latitude, lng: loc.coordinate.longitude)
//     } else {
//       print("===DBG=== Not sending yet (waiting for interval)")
//     }
//   }

//   func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
//     print("===DBG=== didFailWithError: \(error.localizedDescription)")
//   }

//   // -------------------------
//   // Networking + Offline handling
//   // -------------------------
//   private struct OfflineLocation: Codable {
//     let latitude: String
//     let longitude: String
//     let battery_level: Int
//     let user: String? // storing as string to keep JSON simple
//     let ts: TimeInterval
//     let vehicle_type: String? // optional
//   }

//   // ISO8601 helper with fractional seconds + Z
//   private func iso8601String(from ts: TimeInterval) -> String {
//     let date = Date(timeIntervalSince1970: ts)
//     let fmt = ISO8601DateFormatter()
//     fmt.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
//     // ensure Z (UTC) style — formatter will produce Z when using withInternetDateTime
//     return fmt.string(from: date)
//   }

//   private func postLocation(lat: Double, lng: Double) {
//     guard let url = URL(string: "https://stg-admin.cowberryindustries.com/api/locations/") else {
//       print("===DBG=== Invalid URL")
//       return
//     }

//     var req = URLRequest(url: url)
//     req.httpMethod = "POST"
//     req.addValue("application/json", forHTTPHeaderField: "Content-Type")

//     if let token = self.authToken, !token.isEmpty {
//       req.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
//       print("===DBG=== Added Authorization header (token present prefix): \(token.prefix(min(10, token.count)))…")
//     } else {
//       print("===DBG=== No auth token set in native (⚠️ request will fail with 401)")
//     }

//     let batteryPctRaw = UIDevice.current.batteryLevel
//     let batteryPct = batteryPctRaw >= 0 ? Int((batteryPctRaw * 100).rounded()) : 0

//     // Build payload, but omit keys that are nil
//     var payload: [String: Any] = [
//       "latitude": String(format: "%.6f", lat),
//       "longitude": String(format: "%.6f", lng),
//       "battery_level": batteryPct,
//       "timestamp": iso8601String(from: Date().timeIntervalSince1970)
//     ]

//     // user handling (only add if valid)
// if let uid = self.userId, !uid.isEmpty, uid != "undefined" {
//   if let intId = Int(uid) {
//     payload["user"] = intId
//     print("===DBG=== Using numeric userId: \(intId)")
//   } else {
//     payload["user"] = uid
//     print("===DBG=== Using string userId: \(uid)")
//   }
// } else {
//   print("===DBG=== No valid userId set — not adding 'user' to payload")
// }

//     // add vehicle_type only if available
//     if let vehicle = self.currentVehicleType, !vehicle.isEmpty {
//       payload["vehicle_type"] = vehicle
//     }

//     do {
//       let body = try JSONSerialization.data(withJSONObject: payload, options: [])
//       req.httpBody = body
//       let bodyStr = String(data: body, encoding: .utf8) ?? "<empty>"
//       print("===DBG=== postLocation payload JSON: \(bodyStr)")
//     } catch {
//       print("===DBG=== Failed to serialize payload: \(error.localizedDescription)")
//       return
//     }

//     // If no network, save offline directly (save timestamp = now)
//     if !isNetworkAvailable {
//       print("===DBG=== Network down -> saving location offline")
//       saveOfflineLocation(lat: lat, lng: lng, battery: batteryPct, vehicleType: self.currentVehicleType)
//       return
//     }

//     print("===DBG=== Executing URLSession dataTask…")
//     let task = URLSession.shared.dataTask(with: req) { [weak self] data, resp, err in
//       guard let self = self else { return }

//       if let err = err {
//         print("===DBG=== postLocation error: \(err.localizedDescription) -> saving offline")
//         self.saveOfflineLocation(lat: lat, lng: lng, battery: batteryPct, vehicleType: self.currentVehicleType)
//         return
//       }
//       if let httpResp = resp as? HTTPURLResponse {
//         print("===DBG=== postLocation response status: \(httpResp.statusCode)")
//         if httpResp.statusCode == 401 {
//           print("===DBG=== postLocation got 401 -> attempting native refresh and retry")
//           self.handleAuthFailureAndRetry(lat: lat, lng: lng)
//           return
//         }
//         if !(200...299).contains(httpResp.statusCode) {
//           // print server body (if any) for debugging
//           if let d = data, let bodyStr = String(data: d, encoding: .utf8) {
//             print("===DBG=== postLocation server error body: \(bodyStr)")
//           } else {
//             print("===DBG=== postLocation server returned no body")
//           }
//           print("===DBG=== non-2xx response -> saving offline")
//           self.saveOfflineLocation(lat: lat, lng: lng, battery: batteryPct, vehicleType: self.currentVehicleType)
//           return
//         }
//       } else {
//         print("===DBG=== postLocation no HTTPURLResponse received -> saving offline")
//         self.saveOfflineLocation(lat: lat, lng: lng, battery: batteryPct, vehicleType: self.currentVehicleType)
//         return
//       }
//       if let data = data, let str = String(data: data, encoding: .utf8) {
//         print("===DBG=== postLocation response body: \(str)")
//       } else {
//         print("===DBG=== postLocation empty response body")
//       }

//       // Success -> try to sync any queued items too
//       self.syncOfflineLocationsIfNeeded()
//     }
//     task.resume()
//   }

//   // Called when a 401 occurs: try refreshing token natively and retry once
//   private func handleAuthFailureAndRetry(lat: Double, lng: Double) {
//     // increment failure counter
//     var failCount = UserDefaults.standard.integer(forKey: kAuthFailCountKey)
//     failCount += 1
//     UserDefaults.standard.set(failCount, forKey: kAuthFailCountKey)
//     UserDefaults.standard.synchronize()

//     if failCount > kMaxAuthFailures {
//       print("===DBG=== Too many auth failures (\(failCount)) — stopping updates to avoid spam")
//       DispatchQueue.main.async {
//         self.manager.stopUpdatingLocation()
//       }
//       return
//     }

//     // perform refresh
//     performTokenRefresh { [weak self] success in
//       guard let self = self else { return }
//       if success {
//         // reset fail count
//         UserDefaults.standard.removeObject(forKey: self.kAuthFailCountKey)
//         UserDefaults.standard.synchronize()
//         // retry posting once with updated token
//         print("===DBG=== Token refresh successful — retrying postLocation")
//         self.postLocation(lat: lat, lng: lng)
//       } else {
//         print("===DBG=== Token refresh failed — will stop updates")
//         DispatchQueue.main.async {
//           self.manager.stopUpdatingLocation()
//         }
//       }
//     }
//   }

//   // Performs the token refresh by calling backend refresh endpoint using stored refresh token
//   private func performTokenRefresh(completion: @escaping (Bool) -> Void) {
//     guard let refresh = UserDefaults.standard.string(forKey: kRefreshTokenKey) else {
//       print("===DBG=== performTokenRefresh: no refresh token available")
//       completion(false)
//       return
//     }

//     guard let url = URL(string: "https://stg-admin.cowberryindustries.com/api/token/refresh/") else {
//       print("===DBG=== performTokenRefresh: invalid URL")
//       completion(false)
//       return
//     }

//     var req = URLRequest(url: url)
//     req.httpMethod = "POST"
//     req.addValue("application/json", forHTTPHeaderField: "Content-Type")
//     let body: [String: Any] = ["refresh": refresh]
//     do {
//       req.httpBody = try JSONSerialization.data(withJSONObject: body, options: [])
//     } catch {
//       print("===DBG=== performTokenRefresh: failed serialize body", error)
//       completion(false)
//       return
//     }

//     print("===DBG=== Performing token refresh (native)…")
//     let task = URLSession.shared.dataTask(with: req) { [weak self] data, resp, err in
//       guard let self = self else { completion(false); return }

//       if let err = err {
//         print("===DBG=== performTokenRefresh error:", err.localizedDescription)
//         completion(false)
//         return
//       }
//       guard let httpResp = resp as? HTTPURLResponse else {
//         print("===DBG=== performTokenRefresh no HTTP response")
//         completion(false)
//         return
//       }
//       if httpResp.statusCode != 200 {
//         print("===DBG=== performTokenRefresh status:", httpResp.statusCode)
//         completion(false)
//         return
//       }
//       guard let data = data,
//             let json = try? JSONSerialization.jsonObject(with: data, options: []) as? [String: Any],
//             let newAccess = (json["access"] as? String) else {
//         print("===DBG=== performTokenRefresh: parse failed")
//         completion(false)
//         return
//       }

//       // store new token and update auth header
//       UserDefaults.standard.set(newAccess, forKey: self.kAuthTokenKey)
//       UserDefaults.standard.synchronize()
//       self.authToken = newAccess
//       print("===DBG=== performTokenRefresh: new access token saved (prefix): \(newAccess.prefix(min(10, newAccess.count)))…")
//       completion(true)
//     }
//     task.resume()
//   }

//   // -------------------------
//   // OFFLINE QUEUE: save/load atomic
//   // -------------------------
//   private func loadOfflineQueueFromDisk() -> [OfflineLocation] {
//     do {
//       let url = offlineQueueURL
//       if FileManager.default.fileExists(atPath: url.path) {
//         let data = try Data(contentsOf: url)
//         if data.isEmpty { return [] }
//         let items = try JSONDecoder().decode([OfflineLocation].self, from: data)
//         return items
//       }
//     } catch {
//       print("===DBG=== loadOfflineQueueFromDisk error:", error)
//       // if file corrupted, remove to recover
//       try? FileManager.default.removeItem(at: offlineQueueURL)
//       print("===DBG=== removed corrupted offline queue file")
//     }
//     return []
//   }

//   private func writeOfflineQueueToDisk(_ items: [OfflineLocation]) {
//     do {
//       let data = try JSONEncoder().encode(items)
//       try data.write(to: self.offlineQueueURL, options: .atomic)
//       print("===DBG=== writeOfflineQueueToDisk saved count:", items.count, " path:", offlineQueueURL.path)
//     } catch {
//       print("===DBG=== writeOfflineQueueToDisk error:", error)
//     }
//   }

//   private func saveOfflineLocation(lat: Double, lng: Double, battery: Int, vehicleType: String? = nil) {
//     let loc = OfflineLocation(
//       latitude: String(format: "%.6f", lat),
//       longitude: String(format: "%.6f", lng),
//       battery_level: battery,
//       user: self.userId,
//       ts: Date().timeIntervalSince1970,
//       vehicle_type: vehicleType
//     )

//     queueAccess.async(flags: .barrier) {
//       var items = self.loadOfflineQueueFromDisk()
//       if items.count >= self.maxOfflineItems {
//         // drop oldest to keep cap
//         items.removeFirst(items.count - (self.maxOfflineItems - 1))
//       }
//       items.append(loc)
//       self.writeOfflineQueueToDisk(items)
//       print("===DBG=== Saved offline location. newCount:", items.count)
//     }
//   }

//   // Sync in batches. Completion handler optional.
//   private func syncOfflineLocations(completion: (() -> Void)? = nil) {
//     if !isNetworkAvailable {
//       print("===DBG=== syncOfflineLocations called but network unavailable")
//       completion?()
//       return
//     }

//     queueAccess.async {
//       if self.isSyncingOffline {
//         print("===DBG=== sync already in progress, returning")
//         DispatchQueue.main.async { completion?() }
//         return
//       }
//       self.isSyncingOffline = true

//       var items = self.loadOfflineQueueFromDisk()
//       guard !items.isEmpty else {
//         print("===DBG=== no offline locations to sync")
//         self.isSyncingOffline = false
//         DispatchQueue.main.async { completion?() }
//         return
//       }

//       let batchCount = min(self.syncBatchSize, items.count)
//       let batch = Array(items.prefix(batchCount))

//       func finishSync(successfullyRemoved: Bool) {
//         self.isSyncingOffline = false
//         DispatchQueue.main.async { completion?() }
//       }

//       func sendOne(_ idx: Int) {
//         guard idx < batch.count else {
//           // all items in this batch sent successfully -> remove them from disk
//           self.queueAccess.async(flags: .barrier) {
//             var remaining = self.loadOfflineQueueFromDisk()
//             if remaining.count >= batchCount {
//               remaining.removeFirst(batchCount)
//             } else {
//               remaining.removeAll()
//             }
//             self.writeOfflineQueueToDisk(remaining)
//             print("===DBG=== synced batch of \(batchCount). remaining = \(remaining.count)")
//             if !remaining.isEmpty && self.isNetworkAvailable {
//               DispatchQueue.global().asyncAfter(deadline: .now() + 0.5) {
//                 self.syncOfflineLocations(completion: completion)
//               }
//             } else {
//               finishSync(successfullyRemoved: true)
//             }
//           }
//           return
//         }

//         let it = batch[idx]
//         let date = Date(timeIntervalSince1970: it.ts)
// let fmt = ISO8601DateFormatter()
// fmt.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
// let tsStr = fmt.string(from: date)

// var payload: [String: Any] = [
//   "latitude": it.latitude,
//   "longitude": it.longitude,
//   "battery_level": it.battery_level,
//   "timestamp": tsStr
// ]

//         if let uid = it.user, let i = Int(uid) {
//           payload["user"] = i
//         } else if let uid = it.user {
//           payload["user"] = uid
//         }

//         // add vehicle_type only if present
//         if let v = it.vehicle_type, !v.isEmpty {
//           payload["vehicle_type"] = v
//         }

//         guard let url = URL(string: "https://stg-admin.cowberryindustries.com/api/locations/") else {
//           print("===DBG=== syncOfflineLocations invalid URL")
//           finishSync(successfullyRemoved: false)
//           return
//         }

//         var req = URLRequest(url: url)
//         req.httpMethod = "POST"
//         req.addValue("application/json", forHTTPHeaderField: "Content-Type")
//         if let token = self.authToken { req.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }

//         do {
//           req.httpBody = try JSONSerialization.data(withJSONObject: payload, options: [])
//         } catch {
//           print("===DBG=== syncOfflineLocations JSON serialize error for item \(idx):", error)
//           finishSync(successfullyRemoved: false)
//           return
//         }

//         let task = URLSession.shared.dataTask(with: req) { data, resp, err in
//           if let err = err {
//             print("===DBG=== syncOfflineLocations network error for item \(idx):", err.localizedDescription)
//             finishSync(successfullyRemoved: false)
//             return
//           }

//           if let httpResp = resp as? HTTPURLResponse {
//             print("===DBG=== syncOfflineLocations response status: \(httpResp.statusCode) for item \(idx)")
//             if httpResp.statusCode == 401 {
//               print("===DBG=== syncOfflineLocations got 401 -> refreshing token")
//               self.performTokenRefresh { success in
//                 print("===DBG=== syncOfflineLocations refresh result: \(success)")
//                 finishSync(successfullyRemoved: false)
//               }
//               return
//             }
//             if !(200...299).contains(httpResp.statusCode) {
//               if let d = data, let bodyStr = String(data: d, encoding: .utf8) {
//                 print("===DBG=== syncOfflineLocations server error body for item \(idx): \(bodyStr)")
//               }
//               print("===DBG=== syncOfflineLocations non-2xx for item \(idx) -> abort batch and retry later")
//               finishSync(successfullyRemoved: false)
//               return
//             }
//           } else {
//             print("===DBG=== syncOfflineLocations no HTTPURLResponse for item \(idx) -> abort")
//             finishSync(successfullyRemoved: false)
//             return
//           }

//           // success -> small gap (0.1s) then next
//           DispatchQueue.global().asyncAfter(deadline: .now() + 0.1) {
//             sendOne(idx + 1)
//           }
//         }
//         task.resume()
//       }

//       // start sending
//       sendOne(0)
//     }
//   }

//   // small wrapper to attempt sync if items exist
//   private func syncOfflineLocationsIfNeeded() {
//     queueAccess.async {
//       let items = self.loadOfflineQueueFromDisk()
//       if !items.isEmpty && self.isNetworkAvailable && !self.isSyncingOffline {
//         self.syncOfflineLocations()
//       }
//     }
//   }

//   // -------------------------
//   // Network monitor using NWPathMonitor
//   // -------------------------
//   private func startNetworkMonitor() {
//     monitor = NWPathMonitor()
//     let q = DispatchQueue(label: "com.cowberry.network.monitor")
//     monitor?.pathUpdateHandler = { [weak self] path in
//       guard let self = self else { return }
//       let online = path.status == .satisfied
//       if online != self.isNetworkAvailable {
//         self.isNetworkAvailable = online
//         print("===DBG=== Network availability changed: \(online)")
//         if online {
//           // small delay to let system stabilize
//           DispatchQueue.global().asyncAfter(deadline: .now() + 0.3) {
//             if !self.isSyncingOffline {
//               self.syncOfflineLocations()
//             } else {
//               print("===DBG=== sync already running, skip start")
//             }
//           }
//         }
//       }
//     }
//     monitor?.start(queue: q)

//     // best-effort initial state
//     if let current = monitor?.currentPath {
//       self.isNetworkAvailable = (current.status == .satisfied)
//       print("===DBG=== Initial network state:", self.isNetworkAvailable)
//     }
//   }
// }
