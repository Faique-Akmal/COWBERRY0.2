// LocationServiceBridge.m
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(LocationServiceBridge, NSObject)
RCT_EXTERN_METHOD(startTracking)
RCT_EXTERN_METHOD(stopTracking)
RCT_EXTERN_METHOD(updateInterval:(nonnull NSNumber *)seconds)
@end
