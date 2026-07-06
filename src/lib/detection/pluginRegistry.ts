import {
  IObjectDetector,
  IObjectTracker,
  IVisualMatcher,
  IMarketplaceMatcher,
  IProductResolver,
} from "./interfaces";

// We will import these classes from their respective files once implemented
import { OpenImagesDetector, FashionpediaDetector } from "./detectionPipeline";
import { ClassicalTracker, EnhancedTracker } from "./frameFusion";
import { HashVisualMatcher, ClipVisualMatcher } from "./visualMatchers";
import { ProductResolverPlugin } from "./productResolver";
import { DefaultMarketplaceMatcher } from "./marketplaceMatcher";

export class PluginRegistry {
  static getDetector(): IObjectDetector {
    const provider = (process.env.DETECTOR_PROVIDER || "openimages").toLowerCase();
    if (provider === "fashionpedia") {
      return new FashionpediaDetector();
    }
    return new OpenImagesDetector();
  }

  static getTracker(): IObjectTracker {
    const provider = (process.env.TRACKER_PROVIDER || "enhanced").toLowerCase();
    if (provider === "classical") {
      return new ClassicalTracker();
    }
    return new EnhancedTracker();
  }

  static getVisualMatcher(): IVisualMatcher {
    const provider = (process.env.VISUAL_MATCHER_PROVIDER || "hash").toLowerCase();
    if (provider === "clip") {
      return new ClipVisualMatcher();
    }
    return new HashVisualMatcher();
  }

  static getMarketplaceMatcher(): IMarketplaceMatcher {
    return new DefaultMarketplaceMatcher();
  }

  static getProductResolver(): IProductResolver {
    return new ProductResolverPlugin();
  }

  static getVerifyThreshold(): number {
    const threshold = parseFloat(process.env.VERIFY_THRESHOLD || "0.82");
    return isNaN(threshold) ? 0.82 : threshold;
  }
}
