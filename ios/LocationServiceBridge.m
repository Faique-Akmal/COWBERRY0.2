// #import <React/RCTBridgeModule.h>

// @interface RCT_EXTERN_MODULE(LocationServiceBridge, NSObject)

// RCT_EXTERN_METHOD(startTracking)
// RCT_EXTERN_METHOD(stopTracking)
// RCT_EXTERN_METHOD(updateInterval:(nonnull NSNumber *)seconds)
// RCT_EXTERN_METHOD(setAuthToken:(NSString *)token)
// RCT_EXTERN_METHOD(setUserId:(NSString *)uid)
// RCT_EXTERN_METHOD(setRefreshToken:(NSString *)refresh)
// RCT_EXTERN_METHOD(syncOfflineSimple)

// @end

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(LocationServiceBridge, NSObject)

RCT_EXTERN_METHOD(startTracking)
RCT_EXTERN_METHOD(stopTracking)
RCT_EXTERN_METHOD(updateInterval:(nonnull NSNumber *)seconds)

// auth/session setters
RCT_EXTERN_METHOD(setAuthToken:(NSString *)token)
RCT_EXTERN_METHOD(setUserId:(NSString *)uid)
RCT_EXTERN_METHOD(setRefreshToken:(NSString *)refresh)
RCT_EXTERN_METHOD(setSessionCookie:(NSString *)sid)

// control network posting from JS
RCT_EXTERN_METHOD(enableNetworkPosting)
RCT_EXTERN_METHOD(disableNetworkPosting)

// offline helpers
RCT_EXTERN_METHOD(syncOfflineSimple)

@end
