import Foundation
import CoreLocation
import UIKit

@objc(LocationServiceBridge) // expose to Obj-C/React Native as "LocationServiceBridge"
class LocationService: NSObject, CLLocationManagerDelegate {
  private let manager = CLLocationManager()
  private var sendIntervalSec: TimeInterval = 120
  private var lastSentAt: TimeInterval = 0

  override init() {
    super.init()
    manager.delegate = self
    manager.desiredAccuracy = kCLLocationAccuracyBest
    manager.allowsBackgroundLocationUpdates = true
    manager.pausesLocationUpdatesAutomatically = false
    // manager.activityType = .otherNavigation // if appropriate
  }

  // MARK: - Exposed Methods to RN

  @objc
  func startTracking() {
    DispatchQueue.main.async {
      let status = CLLocationManager.authorizationStatus()
      if status == .notDetermined {
        self.manager.requestAlwaysAuthorization()
      } else if status == .authorizedWhenInUse {
        // recommend asking Always as well; RN side should request LOCATION_ALWAYS
        self.manager.requestAlwaysAuthorization()
      }
      self.manager.startUpdatingLocation()
    }
  }

  @objc
  func stopTracking() {
    DispatchQueue.main.async {
      self.manager.stopUpdatingLocation()
    }
  }

  // interval as NSNumber from RN
  @objc
  func updateInterval(_ seconds: NSNumber) {
    sendIntervalSec = seconds.doubleValue
    NSLog("LocationService: sendInterval updated to \(sendIntervalSec) sec")
  }

  // MARK: - CLLocationManagerDelegate

  func locationManager(_ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus) {
    NSLog("LocationService: authorization changed: \(status.rawValue)")
  }

  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    guard let loc = locations.last else { return }
    let now = Date().timeIntervalSince1970
    if now - lastSentAt >= sendIntervalSec {
      lastSentAt = now
      NSLog("LocationService: sending location \(loc.coordinate.latitude), \(loc.coordinate.longitude)")
      postLocation(lat: loc.coordinate.latitude, lng: loc.coordinate.longitude)
    } else {
      NSLog("LocationService: skipping send; elapsed \(now - lastSentAt) < \(sendIntervalSec)")
    }
  }

  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    NSLog("LocationService: location error: \(error.localizedDescription)")
  }

  // MARK: - Networking (basic)
private func postLocation(lat: Double, lng: Double) {
  guard let url = URL(string: "https://yourserver.com/locations/") else {
    NSLog("===DBG=== invalid server URL")
    return
  }
  var req = URLRequest(url: url)
  req.httpMethod = "POST"
  req.setValue("application/json", forHTTPHeaderField: "Content-Type")

  let payload: [String:Any] = [
    "latitude": String(format: "%.6f", lat),
    "longitude": String(format: "%.6f", lng),
    "timestamp": Int(Date().timeIntervalSince1970)
  ]
  guard let data = try? JSONSerialization.data(withJSONObject: payload) else {
    NSLog("===DBG=== failed to serialize payload")
    return
  }
  req.httpBody = data

  // Correct background-task pattern: declare first, then assign
  var bgTask: UIBackgroundTaskIdentifier = .invalid
  bgTask = UIApplication.shared.beginBackgroundTask(withName: "uploadLocation") {
    // expiration handler
    UIApplication.shared.endBackgroundTask(bgTask)
    bgTask = .invalid
  }

  let task = URLSession.shared.dataTask(with: req) { _, response, error in
    if let err = error {
      NSLog("===DBG=== postLocation error: \(err.localizedDescription)")
      // TODO: persist for retry
    } else if let http = response as? HTTPURLResponse {
      NSLog("===DBG=== postLocation status: \(http.statusCode)")
    }
    if bgTask != .invalid {
      UIApplication.shared.endBackgroundTask(bgTask)
      bgTask = .invalid
    }
  }
  task.resume()
}

}
