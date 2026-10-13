#import "PiedPiperSourceTextRun.h"
#import <React/RCTFabricComponentsPlugins.h>
#import "PiedPiperSourceTextRunComponentDescriptor.h"
#import <react/renderer/components/PiedPiperSourceTextSpec/Props.h>
#import <react/renderer/components/PiedPiperSourceTextSpec/RCTComponentViewHelpers.h>

using namespace facebook::react;

@interface PiedPiperSourceTextRun () <RCTT3SourceTextRunViewProtocol>

@end

@implementation PiedPiperSourceTextRun {
  NSString *_text;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<
      PiedPiperSourceTextRunComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps =
        std::make_shared<const PiedPiperSourceTextRunProps>();
    _props = defaultProps;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props
           oldProps:(Props::Shared const &)oldProps {
  const auto &oldViewProps =
      *std::static_pointer_cast<PiedPiperSourceTextRunProps const>(_props);
  const auto &newViewProps =
      *std::static_pointer_cast<PiedPiperSourceTextRunProps const>(props);

  if (newViewProps.text != oldViewProps.text) {
    NSString *text = [NSString stringWithUTF8String:newViewProps.text.c_str()];
    _text = text;
  }

  [super updateProps:props oldProps:oldProps];
}

+ (BOOL)shouldBeRecycled {
  return NO;
}

Class<RCTComponentViewProtocol> PiedPiperSourceTextRunCls(void) {
  return PiedPiperSourceTextRun.class;
}

@end
