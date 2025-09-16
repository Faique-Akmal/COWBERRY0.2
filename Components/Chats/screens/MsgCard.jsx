// Components/ChatBubble.jsx
import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, Linking, Platform } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

/**
 * ChatBubble
 * Props:
 *  - msg: message object (must contain keys used below)
 *    expected shape (based on your web code):
 *      { id, sender, sender_username, content, message_type, latitude, longitude, attachments: [{ file_url, file_type, id }], is_deleted, is_edited, is_read, parent, sent_at }
 *  - isMe: boolean
 *  - onReplyPress?: (parentId) => void  // optional if you want reply action
 */

export default function MsgCard({ msg, isMe, onReplyPress }) {
  // guard
  if (!msg) return null;

  const isLocation = msg?.message_type === "location" && msg?.latitude != null && msg?.longitude != null;
  const hasAttachments = Array.isArray(msg?.attachments) && msg.attachments.length > 0;

  // Build static map URL (Yandex like web). Yandex expects lon,lat order.
  const staticMapUrl = useMemo(() => {
    if (!isLocation) return null;
    const lat = Number(msg.latitude);
    const lon = Number(msg.longitude);
    // size 450x250 in web — scale proportionally for mobile; using 600x300 for clarity
    return `https://static-maps.yandex.ru/1.x/?ll=${lon},${lat}&size=650,300&z=15&l=map&pt=${lon},${lat},pm2rdm`;
  }, [msg, isLocation]);

  const openMaps = (lat, lon) => {
    const latNum = Number(lat);
    const lonNum = Number(lon);
    if (!isFinite(latNum) || !isFinite(lonNum)) return;

    const label = encodeURIComponent(msg?.content || "Shared location");
    const iosUrl = `maps:0,0?q=${latNum},${lonNum}(${label})`;
    const androidUrl = `geo:0,0?q=${latNum},${lonNum}(${label})`;
    const webUrl = `https://www.google.com/maps?q=${latNum},${lonNum}`;

    const url = Platform.OS === "ios" ? iosUrl : androidUrl;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) Linking.openURL(url);
        else Linking.openURL(webUrl);
      })
      .catch(() => {
        Linking.openURL(webUrl).catch(() => {});
      });
  };

  const renderAttachments = () => {
    if (!hasAttachments) return null;
    return msg.attachments.map((att) => {
      const url = att.file_url || att.file || att.url;
      const fileType = att.file_type || "";
      if (!url) return null;

      if (fileType.startsWith?.("image/")) {
        return (
          <Image
            key={att.id || url}
            source={{ uri: url }}
            style={styles.attachmentImage}
            resizeMode="cover"
          />
        );
      }

      if (fileType.startsWith?.("video/")) {
        // you can use react-native-video for playable video; for now show placeholder image + filename
        return (
          <View key={att.id || url} style={styles.attachmentDoc}>
            <Text style={styles.attachmentDocText}>{(url || "").split("/").pop()}</Text>
          </View>
        );
      }

      // document / other file
      return (
        <View key={att.id || url} style={styles.attachmentDoc}>
          <Text style={styles.attachmentDocText}>{(url || "").split("/").pop()}</Text>
        </View>
      );
    });
  };

  // Parent reply preview (if present)
  const ParentPreview = () => {
    if (!msg?.parent_message) return null; // if you provide parent message object (else fetch from store)
    const p = msg.parent_message;
    return (
      <View style={styles.parentWrap}>
        <Text style={styles.parentSender}>{p.sender_username}</Text>
        <Text numberOfLines={1} style={styles.parentText}>{p.content}</Text>
      </View>
    );
  };

  // Message bubble
  return (
    <View style={[styles.container, isMe ? styles.rightContainer : styles.leftContainer]}>
      {/* Header: sender name */}
      {msg?.sender_username && (
        <Text style={[styles.senderName, isMe ? styles.senderRight : styles.senderLeft]}>
          {isMe ? `${msg.sender_username} (You)` : msg.sender_username}
        </Text>
      )}

      {/* Deleted */}
      {msg?.is_deleted ? (
        <View style={styles.deletedWrap}>
          <Text style={styles.deletedText}><em>This message was deleted</em></Text>
        </View>
      ) : (
        <>
          {/* Parent reply preview */}
          {!!msg?.parent && <ParentPreview />}

          <View style={styles.contentWrap}>
            {/* Attachments */}
            {hasAttachments && <View style={styles.attachContainer}>{renderAttachments()}</View>}

            {/* Location card */}
            {isLocation ? (
              <View style={[styles.locationCard, isMe ? styles.locationCardRight : styles.locationCardLeft]}>
                {staticMapUrl && (
                  <Image source={{ uri: staticMapUrl }} style={styles.mapPreview} resizeMode="cover" />
                )}
                <View style={styles.locMeta}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons name="location-outline" size={16} color="#fff" />
                    <Text style={styles.locTitle}>  {msg.content || "Shared current location"}</Text>
                  </View>
                  <TouchableOpacity style={styles.openBtn} onPress={() => openMaps(msg.latitude, msg.longitude)}>
                    <Text style={styles.openBtnText}>Open map</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              // normal text
              <View style={[styles.bubble, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
                <Text style={styles.bubbleText}>{msg?.content}</Text>
              </View>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            {msg?.is_edited && <Text style={styles.footerText}>Edited</Text>}
            <Text style={styles.footerText}>{new Date(msg?.sent_at || Date.now()).toLocaleString()}</Text>
            {isMe && <Text style={[styles.readIcon, msg?.is_read ? styles.read : styles.unread]}>✓✓</Text>}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    maxWidth: "86%",
  },
  leftContainer: { alignSelf: "flex-start" },
  rightContainer: { alignSelf: "flex-end" },

  senderName: {
    fontSize: 12,
    marginBottom: 6,
    fontWeight: "700",
    color: "#2d6a4f",
  },
  senderLeft: { textAlign: "left" },
  senderRight: { textAlign: "right" },

  deletedWrap: {
    padding: 8,
  },
  deletedText: {
    fontStyle: "italic",
    color: "#888",
  },

  parentWrap: {
    backgroundColor: "#d1fae5",
    padding: 6,
    borderRadius: 8,
    marginBottom: 6,
    borderLeftWidth: 4,
    borderLeftColor: "#4ade80",
  },
  parentSender: { fontSize: 12, fontWeight: "700", color: "#065f46" },
  parentText: { color: "#0f172a" },

  contentWrap: {},

  attachContainer: {
    marginBottom: 6,
  },
  attachmentImage: {
    width: 220,
    height: 140,
    borderRadius: 8,
    marginBottom: 6,
  },
  attachmentDoc: {
    backgroundColor: "#e6e6e6",
    padding: 8,
    borderRadius: 8,
    marginBottom: 6,
  },
  attachmentDocText: {
    color: "#333",
  },

  // bubble (normal text)
  bubble: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#ffffff",
  },
  bubbleLeft: { backgroundColor: "#2b8a3e" },
  bubbleRight: { backgroundColor: "#10b981" },
  bubbleText: { color: "#fff", fontSize: 15 },

  // location card
  locationCard: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#144c3a",
    width: 300,
  },
  locationCardLeft: { backgroundColor: "#144c3a" },
  locationCardRight: { backgroundColor: "#144c3a" },
  mapPreview: {
    height: 160,
    width: "100%",
    backgroundColor: "#ddd",
  },
  locMeta: {
    padding: 12,
    backgroundColor: "#0f6b4a",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  locTitle: { color: "#fff", fontSize: 15, fontWeight: "700" },
  openBtn: { backgroundColor: "#2f8a5a", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  openBtnText: { color: "#fff", fontWeight: "700" },

  footer: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 8, marginTop: 6 },
  footerText: { fontSize: 10, color: "#999", marginRight: 6 },
  readIcon: { fontSize: 12, color: "#999" },
  read: { color: "#00CAFF" },
  unread: { color: "#cbd5e1" },
});
