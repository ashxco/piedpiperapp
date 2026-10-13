#pragma once

#include <react/renderer/components/PiedPiperSourceTextSpec/EventEmitters.h>
#include <react/renderer/components/PiedPiperSourceTextSpec/Props.h>
#include <react/renderer/components/PiedPiperSourceTextSpec/States.h>
#include <react/renderer/components/view/ConcreteViewShadowNode.h>

namespace facebook::react {
extern const char PiedPiperSourceTextRunComponentName[];

using PiedPiperSourceTextRunShadowNode =
    ConcreteViewShadowNode<PiedPiperSourceTextRunComponentName, PiedPiperSourceTextRunProps,
                           PiedPiperSourceTextRunEventEmitter, PiedPiperSourceTextRunState>;
} // namespace facebook::react
