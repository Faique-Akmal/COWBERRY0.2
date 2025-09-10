// #import <React/RCTBridgeModule.h>

// @interface RCT_EXTERN_MODULE(LocationServiceBridge, NSObject)

// RCT_EXTERN_METHOD(startTracking)
// RCT_EXTERN_METHOD(stopTracking)
// RCT_EXTERN_METHOD(updateInterval:(nonnull NSNumber *)seconds)
// RCT_EXTERN_METHOD(setAuthToken:(NSString *)token)
// RCT_EXTERN_METHOD(setUserId:(NSString *)uid)
// RCT_EXTERN_METHOD(setRefreshToken:(NSString *)refresh)
// RCT_EXTERN_METHOD(syncOffline:(RCTPromiseResolveBlock)resolve
//                   rejecter:(RCTPromiseRejectBlock)reject)

// @end


#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(LocationServiceBridge, NSObject)

RCT_EXTERN_METHOD(startTracking)
RCT_EXTERN_METHOD(stopTracking)
RCT_EXTERN_METHOD(updateInterval:(nonnull NSNumber *)seconds)
RCT_EXTERN_METHOD(setAuthToken:(NSString *)token)
RCT_EXTERN_METHOD(setUserId:(NSString *)uid)
RCT_EXTERN_METHOD(setRefreshToken:(NSString *)refresh)
RCT_EXTERN_METHOD(syncOfflineSimple)

@end
