#import <React/RCTUIManager.h>
#import <React/RCTViewManager.h>

@interface PiedPiperSourceTextManager : RCTViewManager
@end

@implementation PiedPiperSourceTextManager

RCT_EXPORT_MODULE(PiedPiperSourceText)

- (UIView *)view {
  return [[UIView alloc] init];
}

@end

@interface PiedPiperSourceTextRunManager : RCTViewManager
@end

@implementation PiedPiperSourceTextRunManager

RCT_EXPORT_MODULE(PiedPiperSourceTextRun)

- (UIView *)view {
  return nil;
}

@end
