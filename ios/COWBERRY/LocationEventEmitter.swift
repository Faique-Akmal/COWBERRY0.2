import Foundation
import React

@objc(LocationEventEmitter)
class LocationEventEmitter: RCTEventEmitter {
  override init() {
    super.init()
    NotificationCenter.default.addObserver(self, selector: #selector(onNotification(_:)), name: nil, object: nil)
  }

  override func supportedEvents() -> [String]! {
    return ["NetworkChanged", "OfflineSaved", "SyncProgress", "LastSent"]
  }

  @objc private func onNotification(_ note: Notification) {
    let nm = note.name.rawValue
    if nm == "Location_NetworkChanged" || nm == "Location_OfflineSaved" || nm == "Location_SyncProgress" || nm == "Location_LastSent" {
      if let body = note.userInfo as? [String: Any] {
        let eventName = nm.replacingOccurrences(of: "Location_", with: "")
        sendEvent(withName: eventName, body: body)
      }
    }
  }

  override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
