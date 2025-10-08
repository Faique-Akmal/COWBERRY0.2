// LocationDebugScreen.js
import React, { useEffect, useState, useRef } from 'react'
import { View, Text, TouchableOpacity, FlatList, SafeAreaView, NativeModules, NativeEventEmitter, Platform, StyleSheet } from 'react-native'

const { LocationServiceBridge, LocationEventEmitter } = NativeModules
const emitter = Platform.OS === 'ios' && LocationEventEmitter ? new NativeEventEmitter(LocationEventEmitter) : null

export default function LocationDebugScreen() {
  const [networkOnline, setNetworkOnline] = useState(null)
  const [isTracking, setIsTracking] = useState(false)
  const [allowNetwork, setAllowNetwork] = useState(false)
  const [lastSentTs, setLastSentTs] = useState(null)
  const [offlineCount, setOfflineCount] = useState(0)
  const [offlineItems, setOfflineItems] = useState([])
  const [logs, setLogs] = useState([])
  const logsRef = useRef([])

  useEffect(() => {
    const subs = []
    if (emitter) {
      subs.push(emitter.addListener('NetworkChanged', payload => {
        pushLog(`NetworkChanged: ${JSON.stringify(payload)}`)
        setNetworkOnline(!!payload.online)
      }))
      subs.push(emitter.addListener('OfflineSaved', payload => {
        pushLog(`OfflineSaved: count=${payload.count} last_ts=${payload.last_ts}`)
        setOfflineCount(payload.count)
        if (payload.last_item) setOfflineItems(prev => [payload.last_item, ...prev].slice(0,200))
      }))
      subs.push(emitter.addListener('SyncProgress', payload => {
        pushLog(`SyncProgress: ${JSON.stringify(payload)}`)
        if (payload.remaining !== undefined) setOfflineCount(payload.remaining)
      }))
      subs.push(emitter.addListener('LastSent', payload => {
        pushLog(`LastSent: ${JSON.stringify(payload)}`)
        setLastSentTs(payload.ts)
      }))
    }

    (async () => {
      try {
        if (LocationServiceBridge && LocationServiceBridge.getDebugStatus) {
          const status = await LocationServiceBridge.getDebugStatus()
          if (status) {
            setNetworkOnline(!!status.isNetworkAvailable)
            setIsTracking(!!status.isTracking)
            setAllowNetwork(!!status.allowNetworkPosts)
            setOfflineCount(status.offlineCount || 0)
            if (status.offlineItems) setOfflineItems(status.offlineItems)
            if (status.lastSentTs) setLastSentTs(status.lastSentTs)
            pushLog('Initial status loaded from native')
          }
        } else {
          pushLog('Native getDebugStatus not available — relying on events')
        }
      } catch (e) {
        pushLog('getDebugStatus error: ' + String(e))
      }
    })()

    return () => subs.forEach(s => s.remove && s.remove())
  }, [])

  function pushLog(text) {
    logsRef.current = [new Date().toISOString() + ' ' + text, ...logsRef.current].slice(0,500)
    setLogs([...logsRef.current])
  }

  const startTracking = () => { try { LocationServiceBridge.startTracking(); setIsTracking(true); pushLog('startTracking called') } catch(e){pushLog('err:'+e)} }
  const stopTracking = () => { try { LocationServiceBridge.stopTracking(); setIsTracking(false); pushLog('stopTracking called') } catch(e){pushLog('err:'+e)} }
  const enablePosting = () => { try { LocationServiceBridge.enableNetworkPosting(); setAllowNetwork(true); pushLog('enableNetworkPosting called') } catch(e){pushLog('err:'+e)} }
  const disablePosting = () => { try { LocationServiceBridge.disableNetworkPosting(); setAllowNetwork(false); pushLog('disableNetworkPosting called') } catch(e){pushLog('err:'+e)} }
  const forceSync = () => { try { LocationServiceBridge.syncOfflineSimple(); pushLog('syncOfflineSimple called') } catch(e){pushLog('err:'+e)} }
  const setIntervalOne = () => { try { LocationServiceBridge.updateInterval(1); pushLog('updateInterval(1)') } catch(e){pushLog('err:'+e)} }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        <Text style={styles.header}>Location Debug Dashboard</Text>

        <View style={styles.row}>
          <View style={styles.stat}><Text style={styles.statLabel}>Network</Text><Text style={styles.statValue}>{networkOnline===null?'-':(networkOnline?'online':'offline')}</Text></View>
          <View style={styles.stat}><Text style={styles.statLabel}>Tracking</Text><Text style={styles.statValue}>{isTracking?'on':'off'}</Text></View>
          <View style={styles.stat}><Text style={styles.statLabel}>Posting</Text><Text style={styles.statValue}>{allowNetwork?'enabled':'disabled'}</Text></View>
        </View>

        <View style={styles.row}>
          <View style={styles.stat}><Text style={styles.statLabel}>Offline Count</Text><Text style={styles.statValue}>{offlineCount}</Text></View>
          <View style={styles.stat}><Text style={styles.statLabel}>Last Sent ts</Text><Text style={styles.statValue}>{lastSentTs || '-'}</Text></View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity onPress={startTracking} style={styles.btn}><Text style={styles.btnText}>Start</Text></TouchableOpacity>
          <TouchableOpacity onPress={stopTracking} style={styles.btn}><Text style={styles.btnText}>Stop</Text></TouchableOpacity>
          <TouchableOpacity onPress={enablePosting} style={styles.btnGreen}><Text style={styles.btnText}>EnablePost</Text></TouchableOpacity>
          <TouchableOpacity onPress={disablePosting} style={styles.btnRed}><Text style={styles.btnText}>DisablePost</Text></TouchableOpacity>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity onPress={forceSync} style={styles.btnPurple}><Text style={styles.btnText}>ForceSync</Text></TouchableOpacity>
          <TouchableOpacity onPress={setIntervalOne} style={styles.btnOrange}><Text style={styles.btnText}>Interval=1s</Text></TouchableOpacity>
        </View>

        <Text style={styles.subHeader}>Recent offline items</Text>
        <FlatList
          data={offlineItems}
          keyExtractor={(item, idx) => (item.ts ? String(item.ts) : String(idx))}
          style={styles.list}
          contentContainerStyle={{paddingBottom:8}}
          renderItem={({item}) => (
            <View style={styles.item}>
              <Text style={styles.itemTs}>{item.ts ?? item.timestamp}</Text>
              <Text style={styles.itemCoords}>{item.latitude},{item.longitude}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={{color:'#666'}}>No items</Text>}
        />

        <Text style={styles.subHeader}>Logs (latest)</Text>
        <FlatList
          data={logs}
          keyExtractor={(item, idx) => String(idx)}
          style={[styles.list, {maxHeight:240}]}
          contentContainerStyle={{paddingBottom:8}}
          renderItem={({item}) => <Text style={styles.logText}>{item}</Text>}
          ListEmptyComponent={<Text style={{color:'#666'}}>No logs yet</Text>}
        />

      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, padding: 12 },
  header: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  stat: { flex: 1, padding: 8, margin: 4, backgroundColor: '#f3f3f3', borderRadius: 8 },
  statLabel: { fontSize: 12, color: '#444' },
  statValue: { fontSize: 16, fontWeight: '700' },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 6 },
  btn: { padding: 8, margin: 4, borderRadius: 6, backgroundColor: '#2b6cb0' },
  btnGreen: { padding: 8, margin: 4, borderRadius: 6, backgroundColor: '#2f855a' },
  btnRed: { padding: 8, margin: 4, borderRadius: 6, backgroundColor: '#e53e3e' },
  btnPurple: { padding: 8, margin: 4, borderRadius: 6, backgroundColor: '#805ad5' },
  btnOrange: { padding: 8, margin: 4, borderRadius: 6, backgroundColor: '#dd6b20' },
  btnText: { color: '#fff' },
  subHeader: { fontWeight: '700', marginTop: 10, marginBottom: 6 },
  list: { marginBottom: 8 },
  item: { padding: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  itemTs: { fontSize: 12, color: '#666' },
  itemCoords: { fontSize: 13 },
  logText: { color: '#0b1220', fontSize: 12, paddingVertical: 2 }
})
