import CoreLocation
import Foundation
import Network
import UIKit
import React

@objc(LocationServiceBridge)
class LocationService: NSObject, CLLocationManagerDelegate {
  private let manager = CLLocationManager()

  // static default interval: 5 seconds (user requested)
  private var sendIntervalSec: TimeInterval = 5
  private var lastSentAt: TimeInterval = 0

  // tokens / session
  private var authToken: String? = nil
  private var userId: String? = nil

  // control whether native should perform network POSTs
  // default false -> JS must explicitly enable after login
  private var allowNetworkPosts: Bool = false

  // keys
  private let kAuthTokenKey = "location_auth_token"
  private let kUserIdKey = "location_user_id"
  private let kRefreshTokenKey = "location_refresh_token"
  private let kSessionSidKey = "location_session_sid"
  private let kAuthFailCountKey = "location_auth_fail_count"
  private let kMaxAuthFailures: Int = 3

  // Frappe endpoint (single endpoint URL)
  // private let apiBase = "http://192.168.0.143:8000/api/method/cowberry_app.api.locationlog.add_employee_location"
  private let apiBase = "https://cowberry.frappe.cloud/api/method/cowberry_app.api.locationlog.add_employee_location"


  // offline queue file
  private let offlineFilename = "offline_locations.json"
  private var offlineQueueURL: URL {
    let fm = FileManager.default
    let docs = fm.urls(for: .documentDirectory, in: .userDomainMask).first!
    return docs.appendingPathComponent(offlineFilename)
  }
  private let queueAccess = DispatchQueue(label: "com.cowberry.locations.queue", attributes: .concurrent)
  private let maxOfflineItems = 1000
  private let syncBatchSize = 20

  // network monitor
  private var monitor: NWPathMonitor?
  private var isNetworkAvailable: Bool = false
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

    // Load persisted token / userId / sid if present
    if let savedToken = UserDefaults.standard.string(forKey: kAuthTokenKey) {
      self.authToken = savedToken
      print("===DBG=== Loaded auth token from UserDefaults (prefix): \(String(savedToken.prefix(min(15, savedToken.count))))…")
    } else {
      print("===DBG=== No auth token in UserDefaults at init")
    }

    if let savedUid = UserDefaults.standard.string(forKey: kUserIdKey) {
      self.userId = savedUid
      print("===DBG=== Loaded userId from UserDefaults: \(savedUid)")
    } else {
      print("===DBG=== No userId in UserDefaults at init")
    }

    if let sid = UserDefaults.standard.string(forKey: kSessionSidKey) {
      print("===DBG=== Loaded session sid from UserDefaults (prefix): \(String(sid.prefix(min(12, sid.count))))…")
    } else {
      print("===DBG=== No session sid in UserDefaults at init")
    }

    startNetworkMonitor()
  }

  deinit {
    monitor?.cancel()
  }

  // -------------------------
  // Exposed RN methods
  // -------------------------
  @objc func startTracking() {
    print("===DBG=== startTracking called")
    let status = CLLocationManager.authorizationStatus()
    print("===DBG=== Current auth status: \(status.rawValue)")

    if status == .notDetermined {
      print("===DBG=== Requesting Always Authorization…")
      manager.requestAlwaysAuthorization()
    } else if status == .authorizedWhenInUse {
      // Ask for Always, but do not auto-start posting until JS enables.
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
    // optionally also disable network posting to be safe
    self.allowNetworkPosts = false
  }

  @objc func updateInterval(_ seconds: NSNumber) {
    sendIntervalSec = seconds.doubleValue
    print("===DBG=== updateInterval set to \(sendIntervalSec) sec")
  }

  @objc func setAuthToken(_ token: String) {
    print("===DBG=== [Swift] setAuthToken called with prefix: \(String(token.prefix(min(20, token.count))))…")
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
    print("===DBG=== [Swift] setRefreshToken called (prefix): \(String(refresh.prefix(min(10, refresh.count))))")
    UserDefaults.standard.set(refresh, forKey: kRefreshTokenKey)
    UserDefaults.standard.synchronize()
  }

  // NEW: session cookie setter from JS
  @objc func setSessionCookie(_ sid: String) {
    print("===DBG=== setSessionCookie called (prefix): \(String(sid.prefix(min(15, sid.count))))…")
    UserDefaults.standard.set(sid, forKey: kSessionSidKey)
    UserDefaults.standard.synchronize()
  }

  // Expose a debug getter for RN (promise)
@objc func getDebugStatus(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
  queueAccess.async {
    let offline = self.loadOfflineQueueFromDisk()
    let recent = offline.suffix(20).map { ["latitude": $0.latitude, "longitude": $0.longitude, "ts": $0.ts] }
    let info: [String: Any] = [
      "isNetworkAvailable": self.isNetworkAvailable,
      "isSyncingOffline": self.isSyncingOffline,
      "allowNetworkPosts": self.allowNetworkPosts,
      "isTracking": (self.manager.location != nil),
      "offlineCount": offline.count,
      "offlineItems": recent,
      "lastSentTs": self.lastSentAt
    ]

    // Resolve on main thread (safer for RN bridge)
    DispatchQueue.main.async {
      resolve(info)
    }
  }
}


  // Explicit enable/disable network posting
  @objc func enableNetworkPosting() {
    print("===DBG=== enableNetworkPosting called -> true")
    self.allowNetworkPosts = true
  }

  @objc func disableNetworkPosting() {
    print("===DBG=== disableNetworkPosting called -> false")
    self.allowNetworkPosts = false
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

    // DO NOT auto-start posting here — explicit startTracking() should start updates.
    if status == .authorizedAlways {
      print("===DBG=== Now authorizedAlways (will NOT auto-start location updates).")
    } else if status == .authorizedWhenInUse {
      print("===DBG=== Got WhenInUse - should ask for Always")
    } else if status == .denied || status == .restricted {
      print("===DBG=== Authorization denied/restricted - user must enable in Settings")
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
    let elapsedStr = String(format: "%.2f", elapsed)
    print("===DBG=== elapsed since lastSentAt: \(elapsedStr) sec (threshold \(sendIntervalSec))")

    if lastSentAt == 0 || elapsed >= sendIntervalSec {
      lastSentAt = now
      print("===DBG=== Interval passed or first send -> posting location")
      postLocation(lat: loc.coordinate.latitude, lng: loc.coordinate.longitude, speed: loc.speed)
    } else {
      print("===DBG=== Not sending yet (waiting for interval)")
    }
  }

  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    print("===DBG=== didFailWithError: \(error.localizedDescription)")
  }

  // -------------------------
  // Networking + Offline handling (payload changed for Frappe)
  // -------------------------
  private struct OfflineLocation: Codable {
    let latitude: String
    let longitude: String
    let battery: Int
    let speed: Double
    let pause: Bool
    let user: String?
    let ts: TimeInterval
    let vehicle_type: String?
  }

  // Helper to add auth header (Bearer) or Cookie header if sid present
  private func addAuthHeaders(_ req: inout URLRequest) {
    if let token = self.authToken, !token.isEmpty {
      req.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
      print("===DBG=== Added Authorization header (token present prefix): \(String(token.prefix(min(10, token.count))))…")
      return
    }
    if let sid = UserDefaults.standard.string(forKey: kSessionSidKey), !sid.isEmpty {
      req.addValue("sid=\(sid)", forHTTPHeaderField: "Cookie")
      print("===DBG=== Added Cookie header with sid prefix: \(String(sid.prefix(min(12, sid.count))))…")
      return
    }
    print("===DBG=== No auth token or sid present in native (⚠️ request will likely 401/403)")
  }

  private func postLocation(lat: Double, lng: Double, speed: Double) {
    // If JS hasn't enabled posting, store offline and return (prevents race)
    if !self.allowNetworkPosts {
      print("===DBG=== Network posting disabled by JS -> saving offline instead of posting")
      let batteryPctRaw = UIDevice.current.batteryLevel
      let batteryPct = batteryPctRaw >= 0 ? Int((batteryPctRaw * 100).rounded()) : 0
      self.saveOfflineLocation(lat: lat, lng: lng, battery: batteryPct, speed: speed)
      return
    }

    guard let url = URL(string: apiBase) else {
      print("===DBG=== Invalid URL")
      return
    }

    var req = URLRequest(url: url)
    req.httpMethod = "POST"
    req.addValue("application/json", forHTTPHeaderField: "Content-Type")

    // Use helper to add either Authorization or Cookie
    addAuthHeaders(&req)

    let batteryPctRaw = UIDevice.current.batteryLevel
    let batteryPct = batteryPctRaw >= 0 ? Int((batteryPctRaw * 100).rounded()) : 0

    // IMPORTANT: Now include timestamp fields in both local & UTC forms
    let nowTs = Date().timeIntervalSince1970
    let timestampUtc = iso8601UTCString(from: nowTs)
    let timestampLocal = localDateTimeString(from: nowTs)
    let tzOffsetMinutes = TimeZone.current.secondsFromGMT() / 60

    var payload: [String: Any] = [
      "latitude": String(format: "%.6f", lat),
      "longitude": String(format: "%.6f", lng),
      "battery": batteryPct,
      "speed": speed >= 0 ? speed : 0.0,
      "pause": false,
      // timestamp fields: keep "timestamp" as local formatted (yyyy-MM-dd HH:mm:ss)
      "timestamp": timestampLocal,
      // also send canonical UTC ISO
      "timestamp_utc": timestampUtc,
      "tz_offset_minutes": tzOffsetMinutes
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
      if !isNetworkAvailable {
        print("===DBG=== Network down -> saving location offline")
        self.saveOfflineLocation(lat: lat, lng: lng, battery: batteryPct, speed: speed)
        return
      }
    } catch {
      print("===DBG=== Failed to serialize payload: \(error.localizedDescription)")
      return
    }

    print("===DBG=== Executing URLSession dataTask…")
    let task = URLSession.shared.dataTask(with: req) { [weak self] data, resp, err in
      guard let self = self else { return }

      if let err = err {
        print("===DBG=== postLocation error: \(err.localizedDescription) -> saving offline")
        self.saveOfflineLocation(lat: lat, lng: lng, battery: batteryPct, speed: speed)
        return
      }
      if let httpResp = resp as? HTTPURLResponse {
        print("===DBG=== postLocation response status: \(httpResp.statusCode)")
        if httpResp.statusCode == 401 || httpResp.statusCode == 403 {
          print("===DBG=== postLocation got auth error (\(httpResp.statusCode)) -> saving offline and attempting native refresh")
          self.saveOfflineLocation(lat: lat, lng: lng, battery: batteryPct, speed: speed)
          self.handleAuthFailureAndRetry(lat: lat, lng: lng, speed: speed)
          return
        }
        if !(200...299).contains(httpResp.statusCode) {
          print("===DBG=== non-2xx response -> saving offline")
          self.saveOfflineLocation(lat: lat, lng: lng, battery: batteryPct, speed: speed)
          return
        }
      } else {
        print("===DBG=== postLocation no HTTPURLResponse received -> saving offline")
        self.saveOfflineLocation(lat: lat, lng: lng, battery: batteryPct, speed: speed)
        return
      }
      if let data = data, let str = String(data: data, encoding: .utf8) {
        print("===DBG=== postLocation response body: \(str)")
      } else {
        print("===DBG=== postLocation empty response body")
      }

      // Notify JS that a post was sent now
      NotificationCenter.default.post(name: Notification.Name("Location_LastSent"), object: nil, userInfo: ["ts": nowTs])

      // Success -> try to sync any queued items too
      self.syncOfflineLocationsIfNeeded()
    }
    task.resume()
  }

  private func handleAuthFailureAndRetry(lat: Double, lng: Double, speed: Double) {
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

    performTokenRefresh { [weak self] success in
      guard let self = self else { return }
      if success {
        UserDefaults.standard.removeObject(forKey: self.kAuthFailCountKey)
        self.postLocation(lat: lat, lng: lng, speed: speed)
      } else {
        print("===DBG=== Token refresh failed — will stop updates")
        DispatchQueue.main.async {
          self.manager.stopUpdatingLocation()
        }
      }
    }
  }

  private func performTokenRefresh(completion: @escaping (Bool) -> Void) {
    guard let refresh = UserDefaults.standard.string(forKey: kRefreshTokenKey) else {
      print("===DBG=== performTokenRefresh: no refresh token available")
      completion(false); return
    }
    guard let url = URL(string: "https://cowberry.frappe.cloud/api/token/refresh/") else {
      print("===DBG=== performTokenRefresh: invalid URL")
      completion(false); return
    }

    var req = URLRequest(url: url)
    req.httpMethod = "POST"
    req.addValue("application/json", forHTTPHeaderField: "Content-Type")
    let body: [String: Any] = ["refresh": refresh]
    do {
      req.httpBody = try JSONSerialization.data(withJSONObject: body, options: [])
    } catch {
      print("===DBG=== performTokenRefresh: failed serialize body", error)
      completion(false); return
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
      print("===DBG=== performTokenRefresh: new access token saved (prefix): \(String(newAccess.prefix(min(10, newAccess.count))))…")
      completion(true)
    }
    task.resume()
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
      try? FileManager.default.removeItem(at: offlineQueueURL)
      print("===DBG=== removed corrupted offline queue file")
    }
    return []
  }

  private func writeOfflineQueueToDisk(_ items: [OfflineLocation]) {
    do {
      let data = try JSONEncoder().encode(items)
      try data.write(to: self.offlineQueueURL, options: .atomic)
      print("===DBG=== writeOfflineQueueToDisk saved count:", items.count, " path:", offlineQueueURL.path)
    } catch {
      print("===DBG=== writeOfflineQueueToDisk error:", error)
    }
  }

  private func saveOfflineLocation(lat: Double, lng: Double, battery: Int, speed: Double) {
    let loc = OfflineLocation(
      latitude: String(format: "%.6f", lat),
      longitude: String(format: "%.6f", lng),
      battery: battery,
      speed: speed,
      pause: false,
      user: self.userId,
      ts: Date().timeIntervalSince1970,
      vehicle_type: nil
    )

    queueAccess.async(flags: .barrier) {
      var items = self.loadOfflineQueueFromDisk()
      if items.count >= self.maxOfflineItems {
        items.removeFirst(items.count - (self.maxOfflineItems - 1))
      }
      items.append(loc)
      self.writeOfflineQueueToDisk(items)
      print("===DBG=== Saved offline location. newCount:", items.count)

      // Notify JS about offline save
      let lastItem: [String: Any] = ["latitude": loc.latitude, "longitude": loc.longitude, "ts": loc.ts]
      NotificationCenter.default.post(name: Notification.Name("Location_OfflineSaved"), object: nil, userInfo: [
        "count": items.count,
        "last_ts": loc.ts,
        "last_item": lastItem
      ])
    }
  }

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
          print("===DBG=== finished batch send")
          finishSync(successfullyRemoved: true)
          return
        }

        let it = batch[idx]
        // convert stored ts -> local & utc strings
        let timestampUtc = self.iso8601UTCString(from: it.ts)
        let timestampLocal = self.localDateTimeString(from: it.ts)
        let tzOffsetMinutes = TimeZone.current.secondsFromGMT() / 60

        var payload: [String: Any] = [
          "latitude": it.latitude,
          "longitude": it.longitude,
          "battery": it.battery,
          "speed": it.speed,
          "pause": it.pause,
          // send both forms: keep "timestamp" as local formatted (yyyy-MM-dd HH:mm:ss)
          "timestamp": timestampLocal,
          "timestamp_utc": timestampUtc,
          "tz_offset_minutes": tzOffsetMinutes
        ]
        if let v = it.vehicle_type {
          payload["vehicle_type"] = v
        }
        if let uid = it.user, let i = Int(uid) {
          payload["user"] = i
        } else if let uid = it.user {
          payload["user"] = uid
        }

        guard let url = URL(string: self.apiBase) else {
          print("===DBG=== syncOfflineLocations invalid URL")
          finishSync(successfullyRemoved: false)
          return
        }

        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.addValue("application/json", forHTTPHeaderField: "Content-Type")

        // Use same header logic here: authToken -> Authorization, else sid -> Cookie
        if let token = self.authToken, !token.isEmpty {
          req.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
          print("===DBG=== syncOffline: Added Authorization header (prefix): \(String(token.prefix(min(10, token.count))))…")
        } else if let sid = UserDefaults.standard.string(forKey: self.kSessionSidKey), !sid.isEmpty {
          req.addValue("sid=\(sid)", forHTTPHeaderField: "Cookie")
          print("===DBG=== syncOffline: Added Cookie header with sid prefix: \(String(sid.prefix(min(12, sid.count))))…")
        } else {
          print("===DBG=== syncOffline: No auth token or sid present in native")
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
            if httpResp.statusCode == 401 || httpResp.statusCode == 403 {
              print("===DBG=== syncOfflineLocations got auth error -> refreshing token")
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

          // On success remove first item from disk (we send prefix order)
          if let d = data, let json = try? JSONSerialization.jsonObject(with: d, options: []) {
            print("===DBG=== syncOfflineLocations response body for item \(idx): \(json)")
          }
          self.queueAccess.sync(flags: .barrier) {
            var diskItems = self.loadOfflineQueueFromDisk()
            if !diskItems.isEmpty {
              diskItems.removeFirst()
              self.writeOfflineQueueToDisk(diskItems)
              print("===DBG=== removed first offline item from disk. remaining:", diskItems.count)

              // Notify JS about sync progress (remaining items)
              NotificationCenter.default.post(name: Notification.Name("Location_SyncProgress"), object: nil, userInfo: [
                "remaining": diskItems.count
              ])
            } else {
              print("===DBG=== warning: disk queue empty when trying to remove item \(idx)")
            }
          }

          DispatchQueue.global().asyncAfter(deadline: .now() + 0.05) {
            sendOne(idx + 1)
          }
        }
        task.resume()
      }

      // start sending
      sendOne(0)
    }
  }

  private func syncOfflineLocationsIfNeeded() {
    queueAccess.async {
      let items = self.loadOfflineQueueFromDisk()
      if !items.isEmpty && self.isNetworkAvailable && !self.isSyncingOffline {
        self.syncOfflineLocations()
      }
    }
  }

  // -------------------------
  // Network monitor
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
        // Notify JS about network change
        NotificationCenter.default.post(name: Notification.Name("Location_NetworkChanged"), object: nil, userInfo: ["online": online])
        if online {
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

    if let current = monitor?.currentPath {
      self.isNetworkAvailable = (current.status == .satisfied)
      print("===DBG=== Initial network state:", self.isNetworkAvailable)
      // notify initial state to JS
      NotificationCenter.default.post(name: Notification.Name("Location_NetworkChanged"), object: nil, userInfo: ["online": self.isNetworkAvailable])
    }
  }

  // -------------------------
  // Helper: ISO8601 timestamp and local formatter
  // -------------------------
  private func iso8601UTCString(from timeInterval: TimeInterval) -> String {
    let date = Date(timeIntervalSince1970: timeInterval)
    let fmt = ISO8601DateFormatter()
    fmt.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    fmt.timeZone = TimeZone(secondsFromGMT: 0)
    return fmt.string(from: date) // e.g. "2025-10-06T09:05:35.097Z"
  }

  private func localDateTimeString(from timeInterval: TimeInterval) -> String {
    let date = Date(timeIntervalSince1970: timeInterval)
    let df = DateFormatter()
    df.locale = Locale(identifier: "en_GB")
    df.timeZone = TimeZone.current
    // CHANGED: use year-month-day format so payload uses "yyyy-MM-dd HH:mm:ss"
    df.dateFormat = "yyyy-MM-dd HH:mm:ss"
    return df.string(from: date) // e.g. "2025-10-06 14:42:00"
  }
}




// save offline location resolve kre the chat gpt se but isko test nhi kre hai but ye updated code hai 

// import CoreLocation
// import Foundation
// import Network
// import UIKit

// @objc(LocationServiceBridge)
// class LocationService: NSObject, CLLocationManagerDelegate {
//   private let manager = CLLocationManager()

//   // static default interval: 5 seconds (user requested)
//   private var sendIntervalSec: TimeInterval = 5
//   private var lastSentAt: TimeInterval = 0

//   // tokens / session
//   private var authToken: String? = nil
//   private var userId: String? = nil

//   // control whether native should perform network POSTs
//   // default false -> JS must explicitly enable after login
//   private var allowNetworkPosts: Bool = false

//   // keys
//   private let kAuthTokenKey = "location_auth_token"
//   private let kUserIdKey = "location_user_id"
//   private let kRefreshTokenKey = "location_refresh_token"
//   private let kSessionSidKey = "location_session_sid"
//   private let kAuthFailCountKey = "location_auth_fail_count"
//   private let kMaxAuthFailures: Int = 3

//   // Frappe endpoint (single endpoint URL)
//   private let apiBase = "http://192.168.0.143:8000/api/method/cowberry_app.api.locationlog.add_employee_location"

//   // offline queue file
//   private let offlineFilename = "offline_locations.json"
//   private var offlineQueueURL: URL {
//     let fm = FileManager.default
//     let docs = fm.urls(for: .documentDirectory, in: .userDomainMask).first!
//     return docs.appendingPathComponent(offlineFilename)
//   }
//   // CHANGED: use a serial queue (safer for file read/write)
//   private let queueAccess = DispatchQueue(label: "com.cowberry.locations.queue")
//   private let maxOfflineItems = 1000
//   private let syncBatchSize = 20

//   // network monitor
//   private var monitor: NWPathMonitor?
//   private var isNetworkAvailable: Bool = false
//   private var isSyncingOffline: Bool = false

//   override init() {
//     super.init()
//     print("===DBG=== LocationService init called")
//     manager.delegate = self
//     manager.desiredAccuracy = kCLLocationAccuracyBest
//     manager.allowsBackgroundLocationUpdates = true
//     manager.pausesLocationUpdatesAutomatically = false

//     UIDevice.current.isBatteryMonitoringEnabled = true
//     print("===DBG=== Battery monitoring enabled")

//     // Load persisted token / userId / sid if present
//     if let savedToken = UserDefaults.standard.string(forKey: kAuthTokenKey) {
//       self.authToken = savedToken
//       print("===DBG=== Loaded auth token from UserDefaults (prefix): \(String(savedToken.prefix(min(15, savedToken.count))))…")
//     } else {
//       print("===DBG=== No auth token in UserDefaults at init")
//     }

//     if let savedUid = UserDefaults.standard.string(forKey: kUserIdKey) {
//       self.userId = savedUid
//       print("===DBG=== Loaded userId from UserDefaults: \(savedUid)")
//     } else {
//       print("===DBG=== No userId in UserDefaults at init")
//     }

//     if let sid = UserDefaults.standard.string(forKey: kSessionSidKey) {
//       print("===DBG=== Loaded session sid from UserDefaults (prefix): \(String(sid.prefix(min(12, sid.count))))…")
//     } else {
//       print("===DBG=== No session sid in UserDefaults at init")
//     }

//     startNetworkMonitor()
//   }

//   deinit {
//     monitor?.cancel()
//   }

//   // -------------------------
//   // Exposed RN methods
//   // -------------------------
//   @objc func startTracking() {
//     print("===DBG=== startTracking called")
//     let status = CLLocationManager.authorizationStatus()
//     print("===DBG=== Current auth status: \(status.rawValue)")

//     if status == .notDetermined {
//       print("===DBG=== Requesting Always Authorization…")
//       manager.requestAlwaysAuthorization()
//     } else if status == .authorizedWhenInUse {
//       // Ask for Always, but do not auto-start posting until JS enables.
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
//     // optionally also disable network posting to be safe
//     self.allowNetworkPosts = false
//   }

//   @objc func updateInterval(_ seconds: NSNumber) {
//     sendIntervalSec = seconds.doubleValue
//     print("===DBG=== updateInterval set to \(sendIntervalSec) sec")
//   }

//   @objc func setAuthToken(_ token: String) {
//     print("===DBG=== [Swift] setAuthToken called with prefix: \(String(token.prefix(min(20, token.count))))…")
//     self.authToken = token
//     UserDefaults.standard.set(token, forKey: kAuthTokenKey)
//     UserDefaults.standard.synchronize()
//   }

//   @objc func setUserId(_ uid: String) {
//     print("===DBG=== [Swift] setUserId called with: \(uid)")
//     self.userId = uid
//     UserDefaults.standard.set(uid, forKey: kUserIdKey)
//     UserDefaults.standard.synchronize()
//   }

//   @objc func setRefreshToken(_ refresh: String) {
//     print("===DBG=== [Swift] setRefreshToken called (prefix): \(String(refresh.prefix(min(10, refresh.count))))")
//     UserDefaults.standard.set(refresh, forKey: kRefreshTokenKey)
//     UserDefaults.standard.synchronize()
//   }

//   // NEW: session cookie setter from JS
//   @objc func setSessionCookie(_ sid: String) {
//     print("===DBG=== setSessionCookie called (prefix): \(String(sid.prefix(min(15, sid.count))))…")
//     UserDefaults.standard.set(sid, forKey: kSessionSidKey)
//     UserDefaults.standard.synchronize()
//   }

//   // Explicit enable/disable network posting
//   @objc func enableNetworkPosting() {
//     print("===DBG=== enableNetworkPosting called -> true")
//     self.allowNetworkPosts = true
//   }

//   @objc func disableNetworkPosting() {
//     print("===DBG=== disableNetworkPosting called -> false")
//     self.allowNetworkPosts = false
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

//     // DO NOT auto-start posting here — explicit startTracking() should start updates.
//     if status == .authorizedAlways {
//       print("===DBG=== Now authorizedAlways (will NOT auto-start location updates).")
//     } else if status == .authorizedWhenInUse {
//       print("===DBG=== Got WhenInUse - should ask for Always")
//     } else if status == .denied || status == .restricted {
//       print("===DBG=== Authorization denied/restricted - user must enable in Settings")
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
//       postLocation(lat: loc.coordinate.latitude, lng: loc.coordinate.longitude, speed: loc.speed)
//     } else {
//       print("===DBG=== Not sending yet (waiting for interval)")
//     }
//   }

//   func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
//     print("===DBG=== didFailWithError: \(error.localizedDescription)")
//   }

//   // -------------------------
//   // Networking + Offline handling (payload changed for Frappe)
//   // -------------------------
//   private struct OfflineLocation: Codable {
//     let latitude: String
//     let longitude: String
//     let battery: Int
//     let speed: Double
//     let pause: Bool
//     let user: String?
//     let ts: TimeInterval
//     let vehicle_type: String?
//   }

//   // Helper to add auth header (Bearer) or Cookie header if sid present
//   private func addAuthHeaders(_ req: inout URLRequest) {
//     if let token = self.authToken, !token.isEmpty {
//       req.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
//       print("===DBG=== Added Authorization header (token present prefix): \(String(token.prefix(min(10, token.count))))…")
//       return
//     }
//     if let sid = UserDefaults.standard.string(forKey: kSessionSidKey), !sid.isEmpty {
//       req.addValue("sid=\(sid)", forHTTPHeaderField: "Cookie")
//       print("===DBG=== Added Cookie header with sid prefix: \(String(sid.prefix(min(12, sid.count))))…")
//       return
//     }
//     print("===DBG=== No auth token or sid present in native (⚠️ request will likely 401/403)")
//   }

//   private func postLocation(lat: Double, lng: Double, speed: Double) {
//     // If JS hasn't enabled posting, store offline and return (prevents race)
//     if !self.allowNetworkPosts {
//       print("===DBG=== Network posting disabled by JS -> saving offline instead of posting")
//       let batteryPctRaw = UIDevice.current.batteryLevel
//       let batteryPct = batteryPctRaw >= 0 ? Int((batteryPctRaw * 100).rounded()) : 0
//       self.saveOfflineLocation(lat: lat, lng: lng, battery: batteryPct, speed: speed)
//       return
//     }

//     guard let url = URL(string: apiBase) else {
//       print("===DBG=== Invalid URL")
//       return
//     }

//     var req = URLRequest(url: url)
//     req.httpMethod = "POST"
//     req.addValue("application/json", forHTTPHeaderField: "Content-Type")

//     // Use helper to add either Authorization or Cookie
//     addAuthHeaders(&req)

//     let batteryPctRaw = UIDevice.current.batteryLevel
//     let batteryPct = batteryPctRaw >= 0 ? Int((batteryPctRaw * 100).rounded()) : 0

//     // IMPORTANT: Now include timestamp fields in both local & UTC forms
//     let nowTs = Date().timeIntervalSince1970
//     let timestampUtc = iso8601UTCString(from: nowTs)
//     let timestampLocal = localDateTimeString(from: nowTs)
//     let tzOffsetMinutes = TimeZone.current.secondsFromGMT() / 60

//     var payload: [String: Any] = [
//       "latitude": String(format: "%.6f", lat),
//       "longitude": String(format: "%.6f", lng),
//       "battery": batteryPct,
//       "speed": speed >= 0 ? speed : 0.0,
//       "pause": false,
//       // timestamp fields: keep "timestamp" as local formatted (yyyy-MM-dd HH:mm:ss)
//       "timestamp": timestampLocal,
//       // also send canonical UTC ISO
//       "timestamp_utc": timestampUtc,
//       "tz_offset_minutes": tzOffsetMinutes
//     ]
//     if let uid = self.userId {
//       if let intId = Int(uid) {
//         payload["user"] = intId
//         print("===DBG=== Using numeric userId: \(intId)")
//       } else {
//         payload["user"] = uid
//         print("===DBG=== Using string userId: \(uid)")
//       }
//     }

//     do {
//       let body = try JSONSerialization.data(withJSONObject: payload, options: [])
//       req.httpBody = body
//       let bodyStr = String(data: body, encoding: .utf8) ?? "<empty>"
//       print("===DBG=== postLocation payload JSON: \(bodyStr)")
//       if !isNetworkAvailable {
//         print("===DBG=== Network down -> saving location offline")
//         self.saveOfflineLocation(lat: lat, lng: lng, battery: batteryPct, speed: speed)
//         return
//       }
//     } catch {
//       print("===DBG=== Failed to serialize payload: \(error.localizedDescription)")
//       return
//     }

//     print("===DBG=== Executing URLSession dataTask…")
//     let task = URLSession.shared.dataTask(with: req) { [weak self] data, resp, err in
//       guard let self = self else { return }

//       if let err = err {
//         print("===DBG=== postLocation error: \(err.localizedDescription) -> saving offline")
//         self.saveOfflineLocation(lat: lat, lng: lng, battery: batteryPct, speed: speed)
//         return
//       }
//       if let httpResp = resp as? HTTPURLResponse {
//         print("===DBG=== postLocation response status: \(httpResp.statusCode)")
//         if httpResp.statusCode == 401 || httpResp.statusCode == 403 {
//           print("===DBG=== postLocation got auth error (\(httpResp.statusCode)) -> saving offline and attempting native refresh")
//           self.saveOfflineLocation(lat: lat, lng: lng, battery: batteryPct, speed: speed)
//           self.handleAuthFailureAndRetry(lat: lat, lng: lng, speed: speed)
//           return
//         }
//         if !(200...299).contains(httpResp.statusCode) {
//           print("===DBG=== non-2xx response -> saving offline")
//           self.saveOfflineLocation(lat: lat, lng: lng, battery: batteryPct, speed: speed)
//           return
//         }
//       } else {
//         print("===DBG=== postLocation no HTTPURLResponse received -> saving offline")
//         self.saveOfflineLocation(lat: lat, lng: lng, battery: batteryPct, speed: speed)
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

//   private func handleAuthFailureAndRetry(lat: Double, lng: Double, speed: Double) {
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

//     performTokenRefresh { [weak self] success in
//       guard let self = self else { return }
//       if success {
//         UserDefaults.standard.removeObject(forKey: self.kAuthFailCountKey)
//         self.postLocation(lat: lat, lng: lng, speed: speed)
//       } else {
//         print("===DBG=== Token refresh failed — will stop updates")
//         DispatchQueue.main.async {
//           self.manager.stopUpdatingLocation()
//         }
//       }
//     }
//   }

//   private func performTokenRefresh(completion: @escaping (Bool) -> Void) {
//     guard let refresh = UserDefaults.standard.string(forKey: kRefreshTokenKey) else {
//       print("===DBG=== performTokenRefresh: no refresh token available")
//       completion(false); return
//     }
//     guard let url = URL(string: "http://192.168.0.143:8000/api/token/refresh/") else {
//       print("===DBG=== performTokenRefresh: invalid URL")
//       completion(false); return
//     }

//     var req = URLRequest(url: url)
//     req.httpMethod = "POST"
//     req.addValue("application/json", forHTTPHeaderField: "Content-Type")
//     let body: [String: Any] = ["refresh": refresh]
//     do {
//       req.httpBody = try JSONSerialization.data(withJSONObject: body, options: [])
//     } catch {
//       print("===DBG=== performTokenRefresh: failed serialize body", error)
//       completion(false); return
//     }

//     print("===DBG=== Performing token refresh (native)…")
//     let task = URLSession.shared.dataTask(with: req) { [weak self] data, resp, err in
//       guard let self = self else {
//         completion(false)
//         return
//       }

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
//         let json = try? JSONSerialization.jsonObject(with: data, options: []) as? [String: Any],
//         let newAccess = (json["access"] as? String)
//       else {
//         print("===DBG=== performTokenRefresh: parse failed")
//         completion(false)
//         return
//       }

//       // store new token and update auth header
//       UserDefaults.standard.set(newAccess, forKey: self.kAuthTokenKey)
//       UserDefaults.standard.synchronize()
//       self.authToken = newAccess
//       print("===DBG=== performTokenRefresh: new access token saved (prefix): \(String(newAccess.prefix(min(10, newAccess.count))))…")
//       completion(true)
//     }
//     task.resume()
//   }

//   // -------------------------
//   // OFFLINE QUEUE: save/load atomic + robust verification
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
//       // CHANGED: instead of removing silently, move corrupted file for inspection
//       let badURL = offlineQueueURL.deletingPathExtension().appendingPathExtension("corrupt.\(Int(Date().timeIntervalSince1970)).json")
//       do {
//         try FileManager.default.moveItem(at: offlineQueueURL, to: badURL)
//         print("===DBG=== moved corrupted offline queue to:", badURL.path)
//       } catch {
//         print("===DBG=== failed to move corrupted offline queue:", error)
//         try? FileManager.default.removeItem(at: offlineQueueURL)
//         print("===DBG=== removed corrupted offline queue file as fallback")
//       }
//     }
//     return []
//   }

//   private func writeOfflineQueueToDisk(_ items: [OfflineLocation]) {
//     do {
//       let data = try JSONEncoder().encode(items)
//       try data.write(to: self.offlineQueueURL, options: .atomic)
//       // verify read-back immediately
//       let readData = try Data(contentsOf: self.offlineQueueURL)
//       let readItems = (try? JSONDecoder().decode([OfflineLocation].self, from: readData)) ?? []
//       // also file attributes for debugging
//       var sizeStr = "unknown"
//       if let attrs = try? FileManager.default.attributesOfItem(atPath: offlineQueueURL.path),
//          let size = attrs[.size] as? NSNumber {
//         sizeStr = "\(size.intValue) bytes"
//       }
//       print("===DBG=== writeOfflineQueueToDisk saved count:", items.count, " verified:", readItems.count, " path:", offlineQueueURL.path, " size:", sizeStr)
//     } catch {
//       print("===DBG=== writeOfflineQueueToDisk error:", error)
//     }
//   }

//   private func saveOfflineLocation(lat: Double, lng: Double, battery: Int, speed: Double) {
//     let loc = OfflineLocation(
//       latitude: String(format: "%.6f", lat),
//       longitude: String(format: "%.6f", lng),
//       battery: battery,
//       speed: speed,
//       pause: false,
//       user: self.userId,
//       ts: Date().timeIntervalSince1970,
//       vehicle_type: nil
//     )

//     // use serial queue to protect load/modify/write sequence
//     queueAccess.async {
//       var items = self.loadOfflineQueueFromDisk()
//       if items.count >= self.maxOfflineItems {
//         items.removeFirst(items.count - (self.maxOfflineItems - 1))
//       }
//       items.append(loc)
//       self.writeOfflineQueueToDisk(items)

//       // read back to verify and log last item ts
//       if let verifyData = try? Data(contentsOf: self.offlineQueueURL),
//          let verifyItems = try? JSONDecoder().decode([OfflineLocation].self, from: verifyData) {
//         let lastTs = verifyItems.last?.ts ?? 0
//         print("===DBG=== Saved offline location. newCount:", verifyItems.count, " last_ts:", lastTs)
//       } else {
//         print("===DBG=== Saved offline location but verification failed")
//       }
//     }
//   }

//   private func syncOfflineLocations(completion: (() -> Void)? = nil) {
//     // only proceed if network is available
//     if !isNetworkAvailable {
//       print("===DBG=== syncOfflineLocations called but network unavailable")
//       completion?()
//       return
//     }

//     // ensure single sync at a time
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
//           print("===DBG=== finished batch send")
//           finishSync(successfullyRemoved: true)
//           return
//         }

//         let it = batch[idx]
//         // convert stored ts -> local & utc strings
//         let timestampUtc = self.iso8601UTCString(from: it.ts)
//         let timestampLocal = self.localDateTimeString(from: it.ts)
//         let tzOffsetMinutes = TimeZone.current.secondsFromGMT() / 60

//         var payload: [String: Any] = [
//           "latitude": it.latitude,
//           "longitude": it.longitude,
//           "battery": it.battery,
//           "speed": it.speed,
//           "pause": it.pause,
//           // send both forms: keep "timestamp" as local formatted (yyyy-MM-dd HH:mm:ss)
//           "timestamp": timestampLocal,
//           "timestamp_utc": timestampUtc,
//           "tz_offset_minutes": tzOffsetMinutes
//         ]
//         if let v = it.vehicle_type {
//           payload["vehicle_type"] = v
//         }
//         if let uid = it.user, let i = Int(uid) {
//           payload["user"] = i
//         } else if let uid = it.user {
//           payload["user"] = uid
//         }

//         guard let url = URL(string: self.apiBase) else {
//           print("===DBG=== syncOfflineLocations invalid URL")
//           finishSync(successfullyRemoved: false)
//           return
//         }

//         var req = URLRequest(url: url)
//         req.httpMethod = "POST"
//         req.addValue("application/json", forHTTPHeaderField: "Content-Type")

//         // Use same header logic here: authToken -> Authorization, else sid -> Cookie
//         if let token = self.authToken, !token.isEmpty {
//           req.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
//           print("===DBG=== syncOffline: Added Authorization header (prefix): \(String(token.prefix(min(10, token.count))))…")
//         } else if let sid = UserDefaults.standard.string(forKey: self.kSessionSidKey), !sid.isEmpty {
//           req.addValue("sid=\(sid)", forHTTPHeaderField: "Cookie")
//           print("===DBG=== syncOffline: Added Cookie header with sid prefix: \(String(sid.prefix(min(12, sid.count))))…")
//         } else {
//           print("===DBG=== syncOffline: No auth token or sid present in native")
//         }

//         do {
//           req.httpBody = try JSONSerialization.data(withJSONObject: payload, options: [])
//         } catch {
//           print("===DBG=== syncOfflineLocations JSON serialize error for item \(idx):", error)
//           finishSync(successfullyRemoved: false)
//           return
//         }

//         let task = URLSession.shared.dataTask(with: req) { [weak self] data, resp, err in
//           guard let self = self else {
//             finishSync(successfullyRemoved: false)
//             return
//           }

//           if let err = err {
//             print("===DBG=== syncOfflineLocations network error for item \(idx):", err.localizedDescription)
//             finishSync(successfullyRemoved: false)
//             return
//           }

//           if let httpResp = resp as? HTTPURLResponse {
//             print("===DBG=== syncOfflineLocations response status: \(httpResp.statusCode) for item \(idx)")
//             if httpResp.statusCode == 401 || httpResp.statusCode == 403 {
//               print("===DBG=== syncOfflineLocations got auth error -> refreshing token")
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

//           // On success remove first item from disk (we send prefix order)
//           if let d = data, let json = try? JSONSerialization.jsonObject(with: d, options: []) {
//             print("===DBG=== syncOfflineLocations response body for item \(idx): \(json)")
//           }

//           // IMPORTANT: use queueAccess to update disk safely (serial)
//           self.queueAccess.async {
//             var diskItems = self.loadOfflineQueueFromDisk()
//             if !diskItems.isEmpty {
//               diskItems.removeFirst()
//               self.writeOfflineQueueToDisk(diskItems)
//               print("===DBG=== removed first offline item from disk. remaining:", diskItems.count)
//             } else {
//               print("===DBG=== warning: disk queue empty when trying to remove item \(idx)")
//             }
//           }

//           DispatchQueue.global().asyncAfter(deadline: .now() + 0.05) {
//             sendOne(idx + 1)
//           }
//         }
//         task.resume()
//       }

//       // start sending
//       sendOne(0)
//     } // end queueAccess.async
//   }

//   private func syncOfflineLocationsIfNeeded() {
//     queueAccess.async {
//       let items = self.loadOfflineQueueFromDisk()
//       if !items.isEmpty && self.isNetworkAvailable && !self.isSyncingOffline {
//         self.syncOfflineLocations()
//       }
//     }
//   }

//   // -------------------------
//   // Network monitor
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

//     if let current = monitor?.currentPath {
//       self.isNetworkAvailable = (current.status == .satisfied)
//       print("===DBG=== Initial network state:", self.isNetworkAvailable)
//     }
//   }

//   // -------------------------
//   // Helper: ISO8601 timestamp and local formatter
//   // -------------------------
//   private func iso8601UTCString(from timeInterval: TimeInterval) -> String {
//     let date = Date(timeIntervalSince1970: timeInterval)
//     let fmt = ISO8601DateFormatter()
//     fmt.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
//     fmt.timeZone = TimeZone(secondsFromGMT: 0)
//     return fmt.string(from: date) // e.g. "2025-10-06T09:05:35.097Z"
//   }

//   private func localDateTimeString(from timeInterval: TimeInterval) -> String {
//     let date = Date(timeIntervalSince1970: timeInterval)
//     let df = DateFormatter()
//     df.locale = Locale(identifier: "en_GB")
//     df.timeZone = TimeZone.current
//     // ensure yyyy-MM-dd HH:mm:ss format (year-month-day)
//     df.dateFormat = "yyyy-MM-dd HH:mm:ss"
//     return df.string(from: date) // e.g. "2025-10-06 14:42:00"
//   }
// }




// changes for timezone

// import CoreLocation
// import Foundation
// import Network
// import UIKit

// @objc(LocationServiceBridge)
// class LocationService: NSObject, CLLocationManagerDelegate {
//   private let manager = CLLocationManager()

//   // static default interval: 5 seconds (user requested)
//   private var sendIntervalSec: TimeInterval = 5
//   private var lastSentAt: TimeInterval = 0

//   // tokens / session
//   private var authToken: String? = nil
//   private var userId: String? = nil

//   // control whether native should perform network POSTs
//   // default false -> JS must explicitly enable after login
//   private var allowNetworkPosts: Bool = false

//   // keys
//   private let kAuthTokenKey = "location_auth_token"
//   private let kUserIdKey = "location_user_id"
//   private let kRefreshTokenKey = "location_refresh_token"
//   private let kSessionSidKey = "location_session_sid"
//   private let kAuthFailCountKey = "location_auth_fail_count"
//   private let kMaxAuthFailures: Int = 3

//   // Frappe endpoint (single endpoint URL)
//   private let apiBase = "http://192.168.0.143:8000/api/method/cowberry_app.api.locationlog.add_employee_location"

//   // offline queue file
//   private let offlineFilename = "offline_locations.json"
//   private var offlineQueueURL: URL {
//     let fm = FileManager.default
//     let docs = fm.urls(for: .documentDirectory, in: .userDomainMask).first!
//     return docs.appendingPathComponent(offlineFilename)
//   }
//   private let queueAccess = DispatchQueue(label: "com.cowberry.locations.queue", attributes: .concurrent)
//   private let maxOfflineItems = 1000
//   private let syncBatchSize = 20

//   // network monitor
//   private var monitor: NWPathMonitor?
//   private var isNetworkAvailable: Bool = false
//   private var isSyncingOffline: Bool = false

//   override init() {
//     super.init()
//     print("===DBG=== LocationService init called")
//     manager.delegate = self
//     manager.desiredAccuracy = kCLLocationAccuracyBest
//     manager.allowsBackgroundLocationUpdates = true
//     manager.pausesLocationUpdatesAutomatically = false

//     UIDevice.current.isBatteryMonitoringEnabled = true
//     print("===DBG=== Battery monitoring enabled")

//     // Load persisted token / userId / sid if present
//     if let savedToken = UserDefaults.standard.string(forKey: kAuthTokenKey) {
//       self.authToken = savedToken
//       print("===DBG=== Loaded auth token from UserDefaults (prefix): \(String(savedToken.prefix(min(15, savedToken.count))))…")
//     } else {
//       print("===DBG=== No auth token in UserDefaults at init")
//     }

//     if let savedUid = UserDefaults.standard.string(forKey: kUserIdKey) {
//       self.userId = savedUid
//       print("===DBG=== Loaded userId from UserDefaults: \(savedUid)")
//     } else {
//       print("===DBG=== No userId in UserDefaults at init")
//     }

//     if let sid = UserDefaults.standard.string(forKey: kSessionSidKey) {
//       print("===DBG=== Loaded session sid from UserDefaults (prefix): \(String(sid.prefix(min(12, sid.count))))…")
//     } else {
//       print("===DBG=== No session sid in UserDefaults at init")
//     }

//     startNetworkMonitor()
//   }

//   deinit {
//     monitor?.cancel()
//   }

//   // -------------------------
//   // Exposed RN methods
//   // -------------------------
//   @objc func startTracking() {
//     print("===DBG=== startTracking called")
//     let status = CLLocationManager.authorizationStatus()
//     print("===DBG=== Current auth status: \(status.rawValue)")

//     if status == .notDetermined {
//       print("===DBG=== Requesting Always Authorization…")
//       manager.requestAlwaysAuthorization()
//     } else if status == .authorizedWhenInUse {
//       // Ask for Always, but do not auto-start posting until JS enables.
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
//     // optionally also disable network posting to be safe
//     self.allowNetworkPosts = false
//   }

//   @objc func updateInterval(_ seconds: NSNumber) {
//     sendIntervalSec = seconds.doubleValue
//     print("===DBG=== updateInterval set to \(sendIntervalSec) sec")
//   }

//   @objc func setAuthToken(_ token: String) {
//     print("===DBG=== [Swift] setAuthToken called with prefix: \(String(token.prefix(min(20, token.count))))…")
//     self.authToken = token
//     UserDefaults.standard.set(token, forKey: kAuthTokenKey)
//     UserDefaults.standard.synchronize()
//   }

//   @objc func setUserId(_ uid: String) {
//     print("===DBG=== [Swift] setUserId called with: \(uid)")
//     self.userId = uid
//     UserDefaults.standard.set(uid, forKey: kUserIdKey)
//     UserDefaults.standard.synchronize()
//   }

//   @objc func setRefreshToken(_ refresh: String) {
//     print("===DBG=== [Swift] setRefreshToken called (prefix): \(String(refresh.prefix(min(10, refresh.count))))")
//     UserDefaults.standard.set(refresh, forKey: kRefreshTokenKey)
//     UserDefaults.standard.synchronize()
//   }

//   // NEW: session cookie setter from JS
//   @objc func setSessionCookie(_ sid: String) {
//     print("===DBG=== setSessionCookie called (prefix): \(String(sid.prefix(min(15, sid.count))))…")
//     UserDefaults.standard.set(sid, forKey: kSessionSidKey)
//     UserDefaults.standard.synchronize()
//   }

//   // Explicit enable/disable network posting
//   @objc func enableNetworkPosting() {
//     print("===DBG=== enableNetworkPosting called -> true")
//     self.allowNetworkPosts = true
//   }

//   @objc func disableNetworkPosting() {
//     print("===DBG=== disableNetworkPosting called -> false")
//     self.allowNetworkPosts = false
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

//     // DO NOT auto-start posting here — explicit startTracking() should start updates.
//     if status == .authorizedAlways {
//       print("===DBG=== Now authorizedAlways (will NOT auto-start location updates).")
//     } else if status == .authorizedWhenInUse {
//       print("===DBG=== Got WhenInUse - should ask for Always")
//     } else if status == .denied || status == .restricted {
//       print("===DBG=== Authorization denied/restricted - user must enable in Settings")
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
//       postLocation(lat: loc.coordinate.latitude, lng: loc.coordinate.longitude, speed: loc.speed)
//     } else {
//       print("===DBG=== Not sending yet (waiting for interval)")
//     }
//   }

//   func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
//     print("===DBG=== didFailWithError: \(error.localizedDescription)")
//   }

//   // -------------------------
//   // Networking + Offline handling (payload changed for Frappe)
//   // -------------------------
//   private struct OfflineLocation: Codable {
//     let latitude: String
//     let longitude: String
//     let battery: Int
//     let speed: Double
//     let pause: Bool
//     let user: String?
//     let ts: TimeInterval
//     let vehicle_type: String?
//   }

//   // Helper to add auth header (Bearer) or Cookie header if sid present
//   private func addAuthHeaders(_ req: inout URLRequest) {
//     if let token = self.authToken, !token.isEmpty {
//       req.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
//       print("===DBG=== Added Authorization header (token present prefix): \(String(token.prefix(min(10, token.count))))…")
//       return
//     }
//     if let sid = UserDefaults.standard.string(forKey: kSessionSidKey), !sid.isEmpty {
//       req.addValue("sid=\(sid)", forHTTPHeaderField: "Cookie")
//       print("===DBG=== Added Cookie header with sid prefix: \(String(sid.prefix(min(12, sid.count))))…")
//       return
//     }
//     print("===DBG=== No auth token or sid present in native (⚠️ request will likely 401/403)")
//   }

//   private func postLocation(lat: Double, lng: Double, speed: Double) {
//     // If JS hasn't enabled posting, store offline and return (prevents race)
//     if !self.allowNetworkPosts {
//       print("===DBG=== Network posting disabled by JS -> saving offline instead of posting")
//       let batteryPctRaw = UIDevice.current.batteryLevel
//       let batteryPct = batteryPctRaw >= 0 ? Int((batteryPctRaw * 100).rounded()) : 0
//       self.saveOfflineLocation(lat: lat, lng: lng, battery: batteryPct, speed: speed)
//       return
//     }

//     guard let url = URL(string: apiBase) else {
//       print("===DBG=== Invalid URL")
//       return
//     }

//     var req = URLRequest(url: url)
//     req.httpMethod = "POST"
//     req.addValue("application/json", forHTTPHeaderField: "Content-Type")

//     // Use helper to add either Authorization or Cookie
//     addAuthHeaders(&req)

//     let batteryPctRaw = UIDevice.current.batteryLevel
//     let batteryPct = batteryPctRaw >= 0 ? Int((batteryPctRaw * 100).rounded()) : 0

//     // Frappe expects: latitude, longitude, battery, speed, pause
//     // IMPORTANT: now include timestamp exactly same format as offline sync
//     let nowTs = Date().timeIntervalSince1970
//     let timestampIso = iso8601String(from: nowTs)

//     var payload: [String: Any] = [
//       "latitude": String(format: "%.6f", lat),
//       "longitude": String(format: "%.6f", lng),
//       "battery": batteryPct,
//       "speed": speed >= 0 ? speed : 0.0,
//       "pause": false,
//       "timestamp": timestampIso
//     ]
//     if let uid = self.userId {
//       if let intId = Int(uid) {
//         payload["user"] = intId
//         print("===DBG=== Using numeric userId: \(intId)")
//       } else {
//         payload["user"] = uid
//         print("===DBG=== Using string userId: \(uid)")
//       }
//     }

//     do {
//       let body = try JSONSerialization.data(withJSONObject: payload, options: [])
//       req.httpBody = body
//       let bodyStr = String(data: body, encoding: .utf8) ?? "<empty>"
//       print("===DBG=== postLocation payload JSON: \(bodyStr)")
//       if !isNetworkAvailable {
//         print("===DBG=== Network down -> saving location offline")
//         self.saveOfflineLocation(lat: lat, lng: lng, battery: batteryPct, speed: speed)
//         return
//       }
//     } catch {
//       print("===DBG=== Failed to serialize payload: \(error.localizedDescription)")
//       return
//     }

//     print("===DBG=== Executing URLSession dataTask…")
//     let task = URLSession.shared.dataTask(with: req) { [weak self] data, resp, err in
//       guard let self = self else { return }

//       if let err = err {
//         print("===DBG=== postLocation error: \(err.localizedDescription) -> saving offline")
//         self.saveOfflineLocation(lat: lat, lng: lng, battery: batteryPct, speed: speed)
//         return
//       }
//       if let httpResp = resp as? HTTPURLResponse {
//         print("===DBG=== postLocation response status: \(httpResp.statusCode)")
//         if httpResp.statusCode == 401 || httpResp.statusCode == 403 {
//           print("===DBG=== postLocation got auth error (\(httpResp.statusCode)) -> saving offline and attempting native refresh")
//           self.saveOfflineLocation(lat: lat, lng: lng, battery: batteryPct, speed: speed)
//           self.handleAuthFailureAndRetry(lat: lat, lng: lng, speed: speed)
//           return
//         }
//         if !(200...299).contains(httpResp.statusCode) {
//           print("===DBG=== non-2xx response -> saving offline")
//           self.saveOfflineLocation(lat: lat, lng: lng, battery: batteryPct, speed: speed)
//           return
//         }
//       } else {
//         print("===DBG=== postLocation no HTTPURLResponse received -> saving offline")
//         self.saveOfflineLocation(lat: lat, lng: lng, battery: batteryPct, speed: speed)
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

//   private func handleAuthFailureAndRetry(lat: Double, lng: Double, speed: Double) {
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

//     performTokenRefresh { [weak self] success in
//       guard let self = self else { return }
//       if success {
//         UserDefaults.standard.removeObject(forKey: self.kAuthFailCountKey)
//         self.postLocation(lat: lat, lng: lng, speed: speed)
//       } else {
//         print("===DBG=== Token refresh failed — will stop updates")
//         DispatchQueue.main.async {
//           self.manager.stopUpdatingLocation()
//         }
//       }
//     }
//   }

//   private func performTokenRefresh(completion: @escaping (Bool) -> Void) {
//     guard let refresh = UserDefaults.standard.string(forKey: kRefreshTokenKey) else {
//       print("===DBG=== performTokenRefresh: no refresh token available")
//       completion(false); return
//     }
//     guard let url = URL(string: "http://192.168.0.143:8000/api/token/refresh/") else {
//       print("===DBG=== performTokenRefresh: invalid URL")
//       completion(false); return
//     }

//     var req = URLRequest(url: url)
//     req.httpMethod = "POST"
//     req.addValue("application/json", forHTTPHeaderField: "Content-Type")
//     let body: [String: Any] = ["refresh": refresh]
//     do {
//       req.httpBody = try JSONSerialization.data(withJSONObject: body, options: [])
//     } catch {
//       print("===DBG=== performTokenRefresh: failed serialize body", error)
//       completion(false); return
//     }

//     print("===DBG=== Performing token refresh (native)…")
//     let task = URLSession.shared.dataTask(with: req) { [weak self] data, resp, err in
//       guard let self = self else {
//         completion(false)
//         return
//       }

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
//         let json = try? JSONSerialization.jsonObject(with: data, options: []) as? [String: Any],
//         let newAccess = (json["access"] as? String)
//       else {
//         print("===DBG=== performTokenRefresh: parse failed")
//         completion(false)
//         return
//       }

//       // store new token and update auth header
//       UserDefaults.standard.set(newAccess, forKey: self.kAuthTokenKey)
//       UserDefaults.standard.synchronize()
//       self.authToken = newAccess
//       print("===DBG=== performTokenRefresh: new access token saved (prefix): \(String(newAccess.prefix(min(10, newAccess.count))))…")
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

//   private func saveOfflineLocation(lat: Double, lng: Double, battery: Int, speed: Double) {
//     let loc = OfflineLocation(
//       latitude: String(format: "%.6f", lat),
//       longitude: String(format: "%.6f", lng),
//       battery: battery,
//       speed: speed,
//       pause: false,
//       user: self.userId,
//       ts: Date().timeIntervalSince1970,
//       vehicle_type: nil
//     )

//     queueAccess.async(flags: .barrier) {
//       var items = self.loadOfflineQueueFromDisk()
//       if items.count >= self.maxOfflineItems {
//         items.removeFirst(items.count - (self.maxOfflineItems - 1))
//       }
//       items.append(loc)
//       self.writeOfflineQueueToDisk(items)
//       print("===DBG=== Saved offline location. newCount:", items.count)
//     }
//   }

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
//           print("===DBG=== finished batch send")
//           finishSync(successfullyRemoved: true)
//           return
//         }

//         let it = batch[idx]
//         let timestampIso = self.iso8601String(from: it.ts)

//         var payload: [String: Any] = [
//           "latitude": it.latitude,
//           "longitude": it.longitude,
//           "battery": it.battery,
//           "speed": it.speed,
//           "pause": it.pause
//         ]
//         payload["timestamp"] = timestampIso

//         if let v = it.vehicle_type {
//           payload["vehicle_type"] = v
//         }
//         if let uid = it.user, let i = Int(uid) {
//           payload["user"] = i
//         } else if let uid = it.user {
//           payload["user"] = uid
//         }

//         guard let url = URL(string: self.apiBase) else {
//           print("===DBG=== syncOfflineLocations invalid URL")
//           finishSync(successfullyRemoved: false)
//           return
//         }

//         var req = URLRequest(url: url)
//         req.httpMethod = "POST"
//         req.addValue("application/json", forHTTPHeaderField: "Content-Type")

//         // Use same header logic here: authToken -> Authorization, else sid -> Cookie
//         if let token = self.authToken, !token.isEmpty {
//           req.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
//           print("===DBG=== syncOffline: Added Authorization header (prefix): \(String(token.prefix(min(10, token.count))))…")
//         } else if let sid = UserDefaults.standard.string(forKey: self.kSessionSidKey), !sid.isEmpty {
//           req.addValue("sid=\(sid)", forHTTPHeaderField: "Cookie")
//           print("===DBG=== syncOffline: Added Cookie header with sid prefix: \(String(sid.prefix(min(12, sid.count))))…")
//         } else {
//           print("===DBG=== syncOffline: No auth token or sid present in native")
//         }

//         do {
//           req.httpBody = try JSONSerialization.data(withJSONObject: payload, options: [])
//         } catch {
//           print("===DBG=== syncOfflineLocations JSON serialize error for item \(idx):", error)
//           finishSync(successfullyRemoved: false)
//           return
//         }

//         let task = URLSession.shared.dataTask(with: req) { [weak self] data, resp, err in
//           guard let self = self else {
//             finishSync(successfullyRemoved: false)
//             return
//           }

//           if let err = err {
//             print("===DBG=== syncOfflineLocations network error for item \(idx):", err.localizedDescription)
//             finishSync(successfullyRemoved: false)
//             return
//           }

//           if let httpResp = resp as? HTTPURLResponse {
//             print("===DBG=== syncOfflineLocations response status: \(httpResp.statusCode) for item \(idx)")
//             if httpResp.statusCode == 401 || httpResp.statusCode == 403 {
//               print("===DBG=== syncOfflineLocations got auth error -> refreshing token")
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

//           // On success remove first item from disk (we send prefix order)
//           if let d = data, let json = try? JSONSerialization.jsonObject(with: d, options: []) {
//             print("===DBG=== syncOfflineLocations response body for item \(idx): \(json)")
//           }
//           self.queueAccess.sync(flags: .barrier) {
//             var diskItems = self.loadOfflineQueueFromDisk()
//             if !diskItems.isEmpty {
//               diskItems.removeFirst()
//               self.writeOfflineQueueToDisk(diskItems)
//               print("===DBG=== removed first offline item from disk. remaining:", diskItems.count)
//             } else {
//               print("===DBG=== warning: disk queue empty when trying to remove item \(idx)")
//             }
//           }

//           DispatchQueue.global().asyncAfter(deadline: .now() + 0.05) {
//             sendOne(idx + 1)
//           }
//         }
//         task.resume()
//       }

//       // start sending
//       sendOne(0)
//     }
//   }

//   private func syncOfflineLocationsIfNeeded() {
//     queueAccess.async {
//       let items = self.loadOfflineQueueFromDisk()
//       if !items.isEmpty && self.isNetworkAvailable && !self.isSyncingOffline {
//         self.syncOfflineLocations()
//       }
//     }
//   }

//   // -------------------------
//   // Network monitor
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

//     if let current = monitor?.currentPath {
//       self.isNetworkAvailable = (current.status == .satisfied)
//       print("===DBG=== Initial network state:", self.isNetworkAvailable)
//     }
//   }

//   // -------------------------
//   // Helper: ISO8601 timestamp
//   // -------------------------
//   private func iso8601String(from timeInterval: TimeInterval) -> String {
//     let date = Date(timeIntervalSince1970: timeInterval)
//     let fmt = ISO8601DateFormatter()
//     fmt.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
//     fmt.timeZone = TimeZone(secondsFromGMT: 0)
//     return fmt.string(from: date)
//   }
// }



// payload change with timestamp

// import CoreLocation
// import Foundation
// import Network
// import UIKit

// @objc(LocationServiceBridge)
// class LocationService: NSObject, CLLocationManagerDelegate {
//   private let manager = CLLocationManager()

//   // static default interval: 5 seconds (user requested)
//   private var sendIntervalSec: TimeInterval = 5
//   private var lastSentAt: TimeInterval = 0

//   // tokens / session
//   private var authToken: String? = nil
//   private var userId: String? = nil

//   // control whether native should perform network POSTs
//   // default false -> JS must explicitly enable after login
//   private var allowNetworkPosts: Bool = false

//   // keys
//   private let kAuthTokenKey = "location_auth_token"
//   private let kUserIdKey = "location_user_id"
//   private let kRefreshTokenKey = "location_refresh_token"
//   private let kSessionSidKey = "location_session_sid"
//   private let kAuthFailCountKey = "location_auth_fail_count"
//   private let kMaxAuthFailures: Int = 3

//   // Frappe endpoint (single endpoint URL)
//   private let apiBase = "http://192.168.0.143:8000/api/method/cowberry_app.api.locationlog.add_employee_location"

//   // offline queue file
//   private let offlineFilename = "offline_locations.json"
//   private var offlineQueueURL: URL {
//     let fm = FileManager.default
//     let docs = fm.urls(for: .documentDirectory, in: .userDomainMask).first!
//     return docs.appendingPathComponent(offlineFilename)
//   }
//   private let queueAccess = DispatchQueue(label: "com.cowberry.locations.queue", attributes: .concurrent)
//   private let maxOfflineItems = 1000
//   private let syncBatchSize = 20

//   // network monitor
//   private var monitor: NWPathMonitor?
//   private var isNetworkAvailable: Bool = false
//   private var isSyncingOffline: Bool = false

//   override init() {
//     super.init()
//     print("===DBG=== LocationService init called")
//     manager.delegate = self
//     manager.desiredAccuracy = kCLLocationAccuracyBest
//     manager.allowsBackgroundLocationUpdates = true
//     manager.pausesLocationUpdatesAutomatically = false

//     UIDevice.current.isBatteryMonitoringEnabled = true
//     print("===DBG=== Battery monitoring enabled")

//     // Load persisted token / userId / sid if present
//     if let savedToken = UserDefaults.standard.string(forKey: kAuthTokenKey) {
//       self.authToken = savedToken
//       print("===DBG=== Loaded auth token from UserDefaults (prefix): \(String(savedToken.prefix(min(15, savedToken.count))))…")
//     } else {
//       print("===DBG=== No auth token in UserDefaults at init")
//     }

//     if let savedUid = UserDefaults.standard.string(forKey: kUserIdKey) {
//       self.userId = savedUid
//       print("===DBG=== Loaded userId from UserDefaults: \(savedUid)")
//     } else {
//       print("===DBG=== No userId in UserDefaults at init")
//     }

//     if let sid = UserDefaults.standard.string(forKey: kSessionSidKey) {
//       print("===DBG=== Loaded session sid from UserDefaults (prefix): \(String(sid.prefix(min(12, sid.count))))…")
//     } else {
//       print("===DBG=== No session sid in UserDefaults at init")
//     }

//     startNetworkMonitor()
//   }

//   deinit {
//     monitor?.cancel()
//   }

//   // -------------------------
//   // Exposed RN methods
//   // -------------------------
//   @objc func startTracking() {
//     print("===DBG=== startTracking called")
//     let status = CLLocationManager.authorizationStatus()
//     print("===DBG=== Current auth status: \(status.rawValue)")

//     if status == .notDetermined {
//       print("===DBG=== Requesting Always Authorization…")
//       manager.requestAlwaysAuthorization()
//     } else if status == .authorizedWhenInUse {
//       // Ask for Always, but do not auto-start posting until JS enables.
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
//     // optionally also disable network posting to be safe
//     self.allowNetworkPosts = false
//   }

//   @objc func updateInterval(_ seconds: NSNumber) {
//     sendIntervalSec = seconds.doubleValue
//     print("===DBG=== updateInterval set to \(sendIntervalSec) sec")
//   }

//   @objc func setAuthToken(_ token: String) {
//     print("===DBG=== [Swift] setAuthToken called with prefix: \(String(token.prefix(min(20, token.count))))…")
//     self.authToken = token
//     UserDefaults.standard.set(token, forKey: kAuthTokenKey)
//     UserDefaults.standard.synchronize()
//   }

//   @objc func setUserId(_ uid: String) {
//     print("===DBG=== [Swift] setUserId called with: \(uid)")
//     self.userId = uid
//     UserDefaults.standard.set(uid, forKey: kUserIdKey)
//     UserDefaults.standard.synchronize()
//   }

//   @objc func setRefreshToken(_ refresh: String) {
//     print("===DBG=== [Swift] setRefreshToken called (prefix): \(String(refresh.prefix(min(10, refresh.count))))")
//     UserDefaults.standard.set(refresh, forKey: kRefreshTokenKey)
//     UserDefaults.standard.synchronize()
//   }

//   // NEW: session cookie setter from JS
//   @objc func setSessionCookie(_ sid: String) {
//     print("===DBG=== setSessionCookie called (prefix): \(String(sid.prefix(min(15, sid.count))))…")
//     UserDefaults.standard.set(sid, forKey: kSessionSidKey)
//     UserDefaults.standard.synchronize()
//   }

//   // Explicit enable/disable network posting
//   @objc func enableNetworkPosting() {
//     print("===DBG=== enableNetworkPosting called -> true")
//     self.allowNetworkPosts = true
//   }

//   @objc func disableNetworkPosting() {
//     print("===DBG=== disableNetworkPosting called -> false")
//     self.allowNetworkPosts = false
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

//     // DO NOT auto-start posting here — explicit startTracking() should start updates.
//     if status == .authorizedAlways {
//       print("===DBG=== Now authorizedAlways (will NOT auto-start location updates).")
//     } else if status == .authorizedWhenInUse {
//       print("===DBG=== Got WhenInUse - should ask for Always")
//     } else if status == .denied || status == .restricted {
//       print("===DBG=== Authorization denied/restricted - user must enable in Settings")
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
//       postLocation(lat: loc.coordinate.latitude, lng: loc.coordinate.longitude, speed: loc.speed)
//     } else {
//       print("===DBG=== Not sending yet (waiting for interval)")
//     }
//   }

//   func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
//     print("===DBG=== didFailWithError: \(error.localizedDescription)")
//   }

//   // -------------------------
//   // Networking + Offline handling (payload changed for Frappe)
//   // -------------------------
//   private struct OfflineLocation: Codable {
//     let latitude: String
//     let longitude: String
//     let battery: Int
//     let speed: Double
//     let pause: Bool
//     let user: String?
//     let ts: TimeInterval
//     let vehicle_type: String?
//   }

//   // Helper to add auth header (Bearer) or Cookie header if sid present
//   private func addAuthHeaders(_ req: inout URLRequest) {
//     if let token = self.authToken, !token.isEmpty {
//       req.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
//       print("===DBG=== Added Authorization header (token present prefix): \(String(token.prefix(min(10, token.count))))…")
//       return
//     }
//     if let sid = UserDefaults.standard.string(forKey: kSessionSidKey), !sid.isEmpty {
//       req.addValue("sid=\(sid)", forHTTPHeaderField: "Cookie")
//       print("===DBG=== Added Cookie header with sid prefix: \(String(sid.prefix(min(12, sid.count))))…")
//       return
//     }
//     print("===DBG=== No auth token or sid present in native (⚠️ request will likely 401/403)")
//   }

//   private func postLocation(lat: Double, lng: Double, speed: Double) {
//     // If JS hasn't enabled posting, store offline and return (prevents race)
//     if !self.allowNetworkPosts {
//       print("===DBG=== Network posting disabled by JS -> saving offline instead of posting")
//       let batteryPctRaw = UIDevice.current.batteryLevel
//       let batteryPct = batteryPctRaw >= 0 ? Int((batteryPctRaw * 100).rounded()) : 0
//       self.saveOfflineLocation(lat: lat, lng: lng, battery: batteryPct, speed: speed)
//       return
//     }

//     guard let url = URL(string: apiBase) else {
//       print("===DBG=== Invalid URL")
//       return
//     }

//     var req = URLRequest(url: url)
//     req.httpMethod = "POST"
//     req.addValue("application/json", forHTTPHeaderField: "Content-Type")

//     // Use helper to add either Authorization or Cookie
//     addAuthHeaders(&req)

//     let batteryPctRaw = UIDevice.current.batteryLevel
//     let batteryPct = batteryPctRaw >= 0 ? Int((batteryPctRaw * 100).rounded()) : 0

//     // Frappe expects: latitude, longitude, battery, speed, pause
//     var payload: [String: Any] = [
//       "latitude": String(format: "%.6f", lat),
//       "longitude": String(format: "%.6f", lng),
//       "battery": batteryPct,
//       "speed": speed >= 0 ? speed : 0.0,
//       "pause": false
//     ]
//     if let uid = self.userId {
//       if let intId = Int(uid) {
//         payload["user"] = intId
//         print("===DBG=== Using numeric userId: \(intId)")
//       } else {
//         payload["user"] = uid
//         print("===DBG=== Using string userId: \(uid)")
//       }
//     }

//     do {
//       let body = try JSONSerialization.data(withJSONObject: payload, options: [])
//       req.httpBody = body
//       let bodyStr = String(data: body, encoding: .utf8) ?? "<empty>"
//       print("===DBG=== postLocation payload JSON: \(bodyStr)")
//       if !isNetworkAvailable {
//         print("===DBG=== Network down -> saving location offline")
//         self.saveOfflineLocation(lat: lat, lng: lng, battery: batteryPct, speed: speed)
//         return
//       }
//     } catch {
//       print("===DBG=== Failed to serialize payload: \(error.localizedDescription)")
//       return
//     }

//     print("===DBG=== Executing URLSession dataTask…")
//     let task = URLSession.shared.dataTask(with: req) { [weak self] data, resp, err in
//       guard let self = self else { return }

//       if let err = err {
//         print("===DBG=== postLocation error: \(err.localizedDescription) -> saving offline")
//         self.saveOfflineLocation(lat: lat, lng: lng, battery: batteryPct, speed: speed)
//         return
//       }
//       if let httpResp = resp as? HTTPURLResponse {
//         print("===DBG=== postLocation response status: \(httpResp.statusCode)")
//         if httpResp.statusCode == 401 || httpResp.statusCode == 403 {
//           print("===DBG=== postLocation got auth error (\(httpResp.statusCode)) -> saving offline and attempting native refresh")
//           self.saveOfflineLocation(lat: lat, lng: lng, battery: batteryPct, speed: speed)
//           self.handleAuthFailureAndRetry(lat: lat, lng: lng, speed: speed)
//           return
//         }
//         if !(200...299).contains(httpResp.statusCode) {
//           print("===DBG=== non-2xx response -> saving offline")
//           self.saveOfflineLocation(lat: lat, lng: lng, battery: batteryPct, speed: speed)
//           return
//         }
//       } else {
//         print("===DBG=== postLocation no HTTPURLResponse received -> saving offline")
//         self.saveOfflineLocation(lat: lat, lng: lng, battery: batteryPct, speed: speed)
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

//   private func handleAuthFailureAndRetry(lat: Double, lng: Double, speed: Double) {
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

//     performTokenRefresh { [weak self] success in
//       guard let self = self else { return }
//       if success {
//         UserDefaults.standard.removeObject(forKey: self.kAuthFailCountKey)
//         self.postLocation(lat: lat, lng: lng, speed: speed)
//       } else {
//         print("===DBG=== Token refresh failed — will stop updates")
//         DispatchQueue.main.async {
//           self.manager.stopUpdatingLocation()
//         }
//       }
//     }
//   }

//   private func performTokenRefresh(completion: @escaping (Bool) -> Void) {
//     guard let refresh = UserDefaults.standard.string(forKey: kRefreshTokenKey) else {
//       print("===DBG=== performTokenRefresh: no refresh token available")
//       completion(false); return
//     }
//     guard let url = URL(string: "http://192.168.0.143:8000/api/token/refresh/") else {
//       print("===DBG=== performTokenRefresh: invalid URL")
//       completion(false); return
//     }

//     var req = URLRequest(url: url)
//     req.httpMethod = "POST"
//     req.addValue("application/json", forHTTPHeaderField: "Content-Type")
//     let body: [String: Any] = ["refresh": refresh]
//     do {
//       req.httpBody = try JSONSerialization.data(withJSONObject: body, options: [])
//     } catch {
//       print("===DBG=== performTokenRefresh: failed serialize body", error)
//       completion(false); return
//     }

//     print("===DBG=== Performing token refresh (native)…")
//     let task = URLSession.shared.dataTask(with: req) { [weak self] data, resp, err in
//       guard let self = self else {
//         completion(false)
//         return
//       }

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
//         let json = try? JSONSerialization.jsonObject(with: data, options: []) as? [String: Any],
//         let newAccess = (json["access"] as? String)
//       else {
//         print("===DBG=== performTokenRefresh: parse failed")
//         completion(false)
//         return
//       }

//       // store new token and update auth header
//       UserDefaults.standard.set(newAccess, forKey: self.kAuthTokenKey)
//       UserDefaults.standard.synchronize()
//       self.authToken = newAccess
//       print("===DBG=== performTokenRefresh: new access token saved (prefix): \(String(newAccess.prefix(min(10, newAccess.count))))…")
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

//   private func saveOfflineLocation(lat: Double, lng: Double, battery: Int, speed: Double) {
//     let loc = OfflineLocation(
//       latitude: String(format: "%.6f", lat),
//       longitude: String(format: "%.6f", lng),
//       battery: battery,
//       speed: speed,
//       pause: false,
//       user: self.userId,
//       ts: Date().timeIntervalSince1970,
//       vehicle_type: nil
//     )

//     queueAccess.async(flags: .barrier) {
//       var items = self.loadOfflineQueueFromDisk()
//       if items.count >= self.maxOfflineItems {
//         items.removeFirst(items.count - (self.maxOfflineItems - 1))
//       }
//       items.append(loc)
//       self.writeOfflineQueueToDisk(items)
//       print("===DBG=== Saved offline location. newCount:", items.count)
//     }
//   }

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
//           print("===DBG=== finished batch send")
//           finishSync(successfullyRemoved: true)
//           return
//         }

//         let it = batch[idx]
//         let timestampIso = self.iso8601String(from: it.ts)

//         var payload: [String: Any] = [
//           "latitude": it.latitude,
//           "longitude": it.longitude,
//           "battery": it.battery,
//           "speed": it.speed,
//           "pause": it.pause
//         ]
//         payload["timestamp"] = timestampIso

//         if let v = it.vehicle_type {
//           payload["vehicle_type"] = v
//         }
//         if let uid = it.user, let i = Int(uid) {
//           payload["user"] = i
//         } else if let uid = it.user {
//           payload["user"] = uid
//         }

//         guard let url = URL(string: self.apiBase) else {
//           print("===DBG=== syncOfflineLocations invalid URL")
//           finishSync(successfullyRemoved: false)
//           return
//         }

//         var req = URLRequest(url: url)
//         req.httpMethod = "POST"
//         req.addValue("application/json", forHTTPHeaderField: "Content-Type")

//         // Use same header logic here: authToken -> Authorization, else sid -> Cookie
//         if let token = self.authToken, !token.isEmpty {
//           req.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
//           print("===DBG=== syncOffline: Added Authorization header (prefix): \(String(token.prefix(min(10, token.count))))…")
//         } else if let sid = UserDefaults.standard.string(forKey: self.kSessionSidKey), !sid.isEmpty {
//           req.addValue("sid=\(sid)", forHTTPHeaderField: "Cookie")
//           print("===DBG=== syncOffline: Added Cookie header with sid prefix: \(String(sid.prefix(min(12, sid.count))))…")
//         } else {
//           print("===DBG=== syncOffline: No auth token or sid present in native")
//         }

//         do {
//           req.httpBody = try JSONSerialization.data(withJSONObject: payload, options: [])
//         } catch {
//           print("===DBG=== syncOfflineLocations JSON serialize error for item \(idx):", error)
//           finishSync(successfullyRemoved: false)
//           return
//         }

//         let task = URLSession.shared.dataTask(with: req) { [weak self] data, resp, err in
//           guard let self = self else {
//             finishSync(successfullyRemoved: false)
//             return
//           }

//           if let err = err {
//             print("===DBG=== syncOfflineLocations network error for item \(idx):", err.localizedDescription)
//             finishSync(successfullyRemoved: false)
//             return
//           }

//           if let httpResp = resp as? HTTPURLResponse {
//             print("===DBG=== syncOfflineLocations response status: \(httpResp.statusCode) for item \(idx)")
//             if httpResp.statusCode == 401 || httpResp.statusCode == 403 {
//               print("===DBG=== syncOfflineLocations got auth error -> refreshing token")
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

//           // On success remove first item from disk (we send prefix order)
//           if let d = data, let json = try? JSONSerialization.jsonObject(with: d, options: []) {
//             print("===DBG=== syncOfflineLocations response body for item \(idx): \(json)")
//           }
//           self.queueAccess.sync(flags: .barrier) {
//             var diskItems = self.loadOfflineQueueFromDisk()
//             if !diskItems.isEmpty {
//               diskItems.removeFirst()
//               self.writeOfflineQueueToDisk(diskItems)
//               print("===DBG=== removed first offline item from disk. remaining:", diskItems.count)
//             } else {
//               print("===DBG=== warning: disk queue empty when trying to remove item \(idx)")
//             }
//           }

//           DispatchQueue.global().asyncAfter(deadline: .now() + 0.05) {
//             sendOne(idx + 1)
//           }
//         }
//         task.resume()
//       }

//       // start sending
//       sendOne(0)
//     }
//   }

//   private func syncOfflineLocationsIfNeeded() {
//     queueAccess.async {
//       let items = self.loadOfflineQueueFromDisk()
//       if !items.isEmpty && self.isNetworkAvailable && !self.isSyncingOffline {
//         self.syncOfflineLocations()
//       }
//     }
//   }

//   // -------------------------
//   // Network monitor
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

//     if let current = monitor?.currentPath {
//       self.isNetworkAvailable = (current.status == .satisfied)
//       print("===DBG=== Initial network state:", self.isNetworkAvailable)
//     }
//   }

//   // -------------------------
//   // Helper: ISO8601 timestamp
//   // -------------------------
//   private func iso8601String(from timeInterval: TimeInterval) -> String {
//     let date = Date(timeIntervalSince1970: timeInterval)
//     let fmt = ISO8601DateFormatter()
//     fmt.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
//     fmt.timeZone = TimeZone(secondsFromGMT: 0)
//     return fmt.string(from: date)
//   }
// }
