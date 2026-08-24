
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  username: 'username',
  displayName: 'displayName',
  email: 'email',
  passwordHash: 'passwordHash',
  googleId: 'googleId',
  avatarUrl: 'avatarUrl',
  bio: 'bio',
  createdAt: 'createdAt',
  birthDate: 'birthDate',
  headerBannerUrl: 'headerBannerUrl',
  location: 'location',
  professionalCategory: 'professionalCategory',
  websiteUrl: 'websiteUrl',
  verified: 'verified',
  role: 'role',
  isPrivate: 'isPrivate',
  unreadNotificationCount: 'unreadNotificationCount'
};

exports.Prisma.RelationLoadStrategy = {
  query: 'query',
  join: 'join'
};

exports.Prisma.SessionScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  expiresAt: 'expiresAt'
};

exports.Prisma.FollowScalarFieldEnum = {
  followerId: 'followerId',
  followingId: 'followingId',
  status: 'status'
};

exports.Prisma.PostScalarFieldEnum = {
  id: 'id',
  content: 'content',
  userId: 'userId',
  createdAt: 'createdAt',
  altText: 'altText',
  audience: 'audience',
  collaborators: 'collaborators',
  disableComments: 'disableComments',
  hideLikes: 'hideLikes',
  location: 'location',
  locationName: 'locationName',
  locationCity: 'locationCity',
  locationState: 'locationState',
  locationCountry: 'locationCountry',
  locationDisplay: 'locationDisplay',
  latitude: 'latitude',
  longitude: 'longitude',
  tags: 'tags',
  contentFormat: 'contentFormat',
  quotedPostId: 'quotedPostId'
};

exports.Prisma.MediaScalarFieldEnum = {
  id: 'id',
  postId: 'postId',
  mediaType: 'mediaType',
  url: 'url',
  createdAt: 'createdAt',
  height: 'height',
  width: 'width'
};

exports.Prisma.CommentScalarFieldEnum = {
  id: 'id',
  content: 'content',
  userId: 'userId',
  postId: 'postId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  parentCommentId: 'parentCommentId',
  viewsCount: 'viewsCount'
};

exports.Prisma.LikeScalarFieldEnum = {
  userId: 'userId',
  postId: 'postId'
};

exports.Prisma.BookmarkScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  postId: 'postId',
  createdAt: 'createdAt'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  type: 'type',
  createdAt: 'createdAt',
  issuerId: 'issuerId',
  postId: 'postId',
  read: 'read',
  recipientId: 'recipientId',
  deepLink: 'deepLink',
  metadata: 'metadata'
};

exports.Prisma.StoryScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  mediaUrl: 'mediaUrl',
  mediaType: 'mediaType',
  createdAt: 'createdAt'
};

exports.Prisma.DetectedObjectScalarFieldEnum = {
  id: 'id',
  postId: 'postId',
  name: 'name',
  box: 'box',
  createdAt: 'createdAt'
};

exports.Prisma.DetectedProductScalarFieldEnum = {
  id: 'id',
  postId: 'postId',
  label: 'label',
  category: 'category',
  box: 'box',
  thumbnailUrl: 'thumbnailUrl',
  createdAt: 'createdAt',
  color: 'color',
  confidence: 'confidence',
  dominantColor: 'dominantColor',
  frameTimestamp: 'frameTimestamp',
  productEmbedding: 'productEmbedding',
  sourceFrameUrl: 'sourceFrameUrl',
  completenessScore: 'completenessScore',
  gender: 'gender',
  isVerifiedMatch: 'isVerifiedMatch',
  keywords: 'keywords',
  material: 'material',
  season: 'season',
  shoppingMatchConfidence: 'shoppingMatchConfidence',
  style: 'style',
  visionConfidence: 'visionConfidence',
  creatorId: 'creatorId',
  images: 'images',
  brand: 'brand',
  description: 'description',
  viewsCount: 'viewsCount',
  drawerOpensCount: 'drawerOpensCount',
  productClicksCount: 'productClicksCount',
  retailerClicksCount: 'retailerClicksCount',
  wishlistSavesCount: 'wishlistSavesCount',
  boundingBox: 'boundingBox',
  confidenceBreakdown: 'confidenceBreakdown',
  cropImageUrl: 'cropImageUrl',
  cropQualityScore: 'cropQualityScore',
  detectedBarcode: 'detectedBarcode',
  detectedLogo: 'detectedLogo',
  detectionConfidence: 'detectionConfidence',
  detectionSessionId: 'detectionSessionId',
  frameAppearances: 'frameAppearances',
  marketplaceConfidence: 'marketplaceConfidence',
  ocrText: 'ocrText',
  resolvedQueries: 'resolvedQueries',
  trackingId: 'trackingId',
  verificationScore: 'verificationScore',
  visualEmbedding: 'visualEmbedding',
  canonicalProductId: 'canonicalProductId'
};

exports.Prisma.ShoppingMatchScalarFieldEnum = {
  id: 'id',
  detectedProductId: 'detectedProductId',
  title: 'title',
  price: 'price',
  currency: 'currency',
  sourceStore: 'sourceStore',
  productUrl: 'productUrl',
  imageUrl: 'imageUrl',
  createdAt: 'createdAt',
  affiliateUrl: 'affiliateUrl',
  clickCount: 'clickCount',
  merchantId: 'merchantId',
  deliveryText: 'deliveryText',
  availability: 'availability',
  retailerSource: 'retailerSource',
  trackingCode: 'trackingCode',
  directUrl: 'directUrl',
  cachedAt: 'cachedAt',
  categoryPath: 'categoryPath',
  cleanedTitle: 'cleanedTitle',
  condition: 'condition',
  discountPercent: 'discountPercent',
  estimatedDelivery: 'estimatedDelivery',
  features: 'features',
  galleryImageUrls: 'galleryImageUrls',
  highlights: 'highlights',
  manufacturer: 'manufacturer',
  matchBrand: 'matchBrand',
  matchDescription: 'matchDescription',
  modelNumber: 'modelNumber',
  originalPrice: 'originalPrice',
  rating: 'rating',
  returnPolicy: 'returnPolicy',
  reviewCount: 'reviewCount',
  sellerName: 'sellerName',
  sellerRating: 'sellerRating',
  sellerReviews: 'sellerReviews',
  shippingCost: 'shippingCost',
  sku: 'sku',
  specifications: 'specifications',
  stockAvailability: 'stockAvailability',
  upc: 'upc',
  verificationScore: 'verificationScore',
  warranty: 'warranty',
  rawPayload: 'rawPayload'
};

exports.Prisma.CanonicalProductScalarFieldEnum = {
  id: 'id',
  brand: 'brand',
  modelLine: 'modelLine',
  subcategory: 'subcategory',
  canonicalTitle: 'canonicalTitle',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MarketplaceSearchCacheScalarFieldEnum = {
  id: 'id',
  query: 'query',
  normalizedQuery: 'normalizedQuery',
  marketplace: 'marketplace',
  country: 'country',
  currency: 'currency',
  language: 'language',
  results: 'results',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.VideoProcessingJobScalarFieldEnum = {
  id: 'id',
  postId: 'postId',
  status: 'status',
  retryCount: 'retryCount',
  lastRetryAt: 'lastRetryAt',
  error: 'error',
  startedAt: 'startedAt',
  completedAt: 'completedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.VideoProcessingLogScalarFieldEnum = {
  id: 'id',
  videoId: 'videoId',
  processingTime: 'processingTime',
  visionCalls: 'visionCalls',
  openrouterCalls: 'openrouterCalls',
  nvidiaCalls: 'nvidiaCalls',
  serpapiCalls: 'serpapiCalls',
  processingCost: 'processingCost',
  visionResults: 'visionResults',
  openrouterResults: 'openrouterResults',
  nvidiaFallbackUsage: 'nvidiaFallbackUsage',
  shoppingResultsCount: 'shoppingResultsCount',
  errorMessages: 'errorMessages',
  createdAt: 'createdAt'
};

exports.Prisma.PollScalarFieldEnum = {
  id: 'id',
  postId: 'postId',
  expiresAt: 'expiresAt'
};

exports.Prisma.PollOptionScalarFieldEnum = {
  id: 'id',
  pollId: 'pollId',
  text: 'text'
};

exports.Prisma.PollVoteScalarFieldEnum = {
  id: 'id',
  optionId: 'optionId',
  userId: 'userId',
  pollId: 'pollId'
};

exports.Prisma.PostViewScalarFieldEnum = {
  id: 'id',
  postId: 'postId',
  userId: 'userId',
  ip: 'ip',
  watchDuration: 'watchDuration',
  completed: 'completed',
  createdAt: 'createdAt'
};

exports.Prisma.RepostScalarFieldEnum = {
  id: 'id',
  postId: 'postId',
  userId: 'userId',
  createdAt: 'createdAt'
};

exports.Prisma.PostMentionScalarFieldEnum = {
  id: 'id',
  postId: 'postId',
  userId: 'userId',
  createdAt: 'createdAt'
};

exports.Prisma.DraftPostScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  content: 'content',
  attachments: 'attachments',
  updatedAt: 'updatedAt'
};

exports.Prisma.SavedCollectionScalarFieldEnum = {
  id: 'id',
  name: 'name',
  userId: 'userId',
  createdAt: 'createdAt'
};

exports.Prisma.SavedCollectionItemScalarFieldEnum = {
  id: 'id',
  collectionId: 'collectionId',
  postId: 'postId',
  createdAt: 'createdAt'
};

exports.Prisma.CommentLikeScalarFieldEnum = {
  id: 'id',
  commentId: 'commentId',
  userId: 'userId',
  createdAt: 'createdAt'
};

exports.Prisma.PriceHistoryScalarFieldEnum = {
  id: 'id',
  shoppingMatchId: 'shoppingMatchId',
  price: 'price',
  capturedAt: 'capturedAt'
};

exports.Prisma.ProductCollectionScalarFieldEnum = {
  id: 'id',
  name: 'name',
  userId: 'userId',
  createdAt: 'createdAt',
  description: 'description',
  coverImage: 'coverImage',
  isPublic: 'isPublic',
  featured: 'featured',
  updatedAt: 'updatedAt'
};

exports.Prisma.ProductCollectionItemScalarFieldEnum = {
  id: 'id',
  collectionId: 'collectionId',
  productId: 'productId',
  createdAt: 'createdAt'
};

exports.Prisma.ProductAssignmentScalarFieldEnum = {
  id: 'id',
  postId: 'postId',
  productId: 'productId',
  assignedById: 'assignedById',
  displayOrder: 'displayOrder',
  featured: 'featured',
  status: 'status',
  verificationSource: 'verificationSource',
  sourceType: 'sourceType',
  manuallyAssigned: 'manuallyAssigned',
  reviewReason: 'reviewReason',
  aiConfidence: 'aiConfidence',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  productType: 'productType',
  productSource: 'productSource'
};

exports.Prisma.ProductEventScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  assignmentId: 'assignmentId',
  userId: 'userId',
  eventType: 'eventType',
  metadata: 'metadata',
  createdAt: 'createdAt'
};

exports.Prisma.MerchantScalarFieldEnum = {
  id: 'id',
  name: 'name',
  logoUrl: 'logoUrl',
  rating: 'rating',
  reviews: 'reviews',
  createdAt: 'createdAt'
};

exports.Prisma.BrandScalarFieldEnum = {
  id: 'id',
  name: 'name',
  slug: 'slug',
  logoUrl: 'logoUrl',
  description: 'description',
  featured: 'featured',
  createdAt: 'createdAt'
};

exports.Prisma.CampaignScalarFieldEnum = {
  id: 'id',
  brandId: 'brandId',
  creatorId: 'creatorId',
  name: 'name',
  status: 'status',
  commissionRate: 'commissionRate',
  commissionEarned: 'commissionEarned',
  createdAt: 'createdAt'
};

exports.Prisma.LocationCacheScalarFieldEnum = {
  id: 'id',
  latRounded: 'latRounded',
  lngRounded: 'lngRounded',
  osmId: 'osmId',
  displayName: 'displayName',
  city: 'city',
  state: 'state',
  country: 'country',
  expiresAt: 'expiresAt'
};

exports.Prisma.RecentLocationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  locationName: 'locationName',
  city: 'city',
  state: 'state',
  country: 'country',
  latitude: 'latitude',
  longitude: 'longitude',
  createdAt: 'createdAt'
};

exports.Prisma.PinnedContentScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  postId: 'postId',
  position: 'position',
  createdAt: 'createdAt'
};

exports.Prisma.NotificationPreferenceScalarFieldEnum = {
  userId: 'userId',
  likes: 'likes',
  comments: 'comments',
  mentions: 'mentions',
  follows: 'follows',
  reposts: 'reposts',
  quotes: 'quotes',
  shares: 'shares',
  orders: 'orders',
  products: 'products',
  security: 'security',
  system: 'system',
  messages: 'messages'
};

exports.Prisma.ChatPinScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  channelId: 'channelId',
  createdAt: 'createdAt'
};

exports.Prisma.ChatArchiveScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  channelId: 'channelId',
  createdAt: 'createdAt'
};

exports.Prisma.ChatMuteScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  channelId: 'channelId',
  createdAt: 'createdAt',
  expiresAt: 'expiresAt'
};

exports.Prisma.ConversationSettingsScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  channelId: 'channelId',
  wallpaper: 'wallpaper',
  createdAt: 'createdAt',
  lastClearedAt: 'lastClearedAt'
};

exports.Prisma.CloseFriendScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  friendId: 'friendId',
  createdAt: 'createdAt'
};

exports.Prisma.InstantScalarFieldEnum = {
  id: 'id',
  senderId: 'senderId',
  mediaUrl: 'mediaUrl',
  audience: 'audience',
  createdAt: 'createdAt'
};

exports.Prisma.InstantViewScalarFieldEnum = {
  id: 'id',
  instantId: 'instantId',
  userId: 'userId',
  viewedAt: 'viewedAt'
};

exports.Prisma.CommentRepostScalarFieldEnum = {
  id: 'id',
  commentId: 'commentId',
  userId: 'userId',
  createdAt: 'createdAt'
};

exports.Prisma.CommentBookmarkScalarFieldEnum = {
  id: 'id',
  commentId: 'commentId',
  userId: 'userId',
  createdAt: 'createdAt'
};

exports.Prisma.UserMuteScalarFieldEnum = {
  id: 'id',
  muterId: 'muterId',
  mutedId: 'mutedId',
  createdAt: 'createdAt'
};

exports.Prisma.UserBlockScalarFieldEnum = {
  id: 'id',
  blockerId: 'blockerId',
  blockedId: 'blockedId',
  createdAt: 'createdAt'
};

exports.Prisma.MutedConversationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  commentId: 'commentId',
  createdAt: 'createdAt'
};

exports.Prisma.CommentReportScalarFieldEnum = {
  id: 'id',
  commentId: 'commentId',
  postId: 'postId',
  userId: 'userId',
  reason: 'reason',
  createdAt: 'createdAt'
};

exports.Prisma.StoryViewScalarFieldEnum = {
  id: 'id',
  storyId: 'storyId',
  userId: 'userId',
  viewedAt: 'viewedAt'
};

exports.Prisma.StoryLikeScalarFieldEnum = {
  id: 'id',
  storyId: 'storyId',
  userId: 'userId',
  createdAt: 'createdAt'
};

exports.Prisma.DetectionSessionScalarFieldEnum = {
  id: 'id',
  postId: 'postId',
  sessionHash: 'sessionHash',
  frameCount: 'frameCount',
  sceneChangeCount: 'sceneChangeCount',
  rawObjectCount: 'rawObjectCount',
  cropsPassedQuality: 'cropsPassedQuality',
  cropsFailedQuality: 'cropsFailedQuality',
  trackedObjectCount: 'trackedObjectCount',
  mergedProductCount: 'mergedProductCount',
  geminiCallCount: 'geminiCallCount',
  cacheHitCount: 'cacheHitCount',
  processingTimeMs: 'processingTimeMs',
  status: 'status',
  createdAt: 'createdAt',
  completedAt: 'completedAt'
};

exports.Prisma.ProductTimelineScalarFieldEnum = {
  id: 'id',
  detectedProductId: 'detectedProductId',
  timestamp: 'timestamp',
  createdAt: 'createdAt'
};

exports.Prisma.ProductVariantScalarFieldEnum = {
  id: 'id',
  shoppingMatchId: 'shoppingMatchId',
  variantType: 'variantType',
  variantValue: 'variantValue',
  price: 'price',
  sku: 'sku',
  imageUrl: 'imageUrl',
  availability: 'availability',
  createdAt: 'createdAt'
};

exports.Prisma.ShopBannerScalarFieldEnum = {
  id: 'id',
  title: 'title',
  subtitle: 'subtitle',
  imageUrl: 'imageUrl',
  desktopImageUrl: 'desktopImageUrl',
  mobileImageUrl: 'mobileImageUrl',
  tabletImageUrl: 'tabletImageUrl',
  ctaText: 'ctaText',
  ctaLink: 'ctaLink',
  active: 'active',
  startAt: 'startAt',
  endAt: 'endAt',
  order: 'order',
  createdAt: 'createdAt'
};

exports.Prisma.ShopHomepageSectionScalarFieldEnum = {
  id: 'id',
  type: 'type',
  title: 'title',
  subtitle: 'subtitle',
  layout: 'layout',
  columns: 'columns',
  background: 'background',
  icon: 'icon',
  cta: 'cta',
  visible: 'visible',
  priority: 'priority',
  desktopVisible: 'desktopVisible',
  tabletVisible: 'tabletVisible',
  mobileVisible: 'mobileVisible',
  startDate: 'startDate',
  endDate: 'endDate',
  active: 'active',
  order: 'order',
  configuration: 'configuration',
  items: 'items',
  createdAt: 'createdAt'
};

exports.Prisma.ShopDealScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  originalPrice: 'originalPrice',
  dealPrice: 'dealPrice',
  soldCount: 'soldCount',
  totalCount: 'totalCount',
  startAt: 'startAt',
  endAt: 'endAt',
  active: 'active',
  createdAt: 'createdAt'
};

exports.Prisma.ShopCreatorPickScalarFieldEnum = {
  id: 'id',
  creatorId: 'creatorId',
  productId: 'productId',
  discountLabel: 'discountLabel',
  active: 'active',
  order: 'order',
  createdAt: 'createdAt'
};

exports.Prisma.ShopSellerScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  storeName: 'storeName',
  slug: 'slug',
  logoUrl: 'logoUrl',
  bannerUrl: 'bannerUrl',
  description: 'description',
  status: 'status',
  commissionRate: 'commissionRate',
  verified: 'verified',
  kycSubmitted: 'kycSubmitted',
  kycData: 'kycData',
  payoutBalance: 'payoutBalance',
  payoutEmail: 'payoutEmail',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ShopWishlistScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  productId: 'productId',
  createdAt: 'createdAt'
};

exports.Prisma.ShopAddressScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  firstName: 'firstName',
  lastName: 'lastName',
  addressLine: 'addressLine',
  addressLine2: 'addressLine2',
  city: 'city',
  state: 'state',
  postalCode: 'postalCode',
  countryCode: 'countryCode',
  phone: 'phone',
  isDefault: 'isDefault',
  createdAt: 'createdAt'
};

exports.Prisma.ShopProductScalarFieldEnum = {
  id: 'id',
  title: 'title',
  slug: 'slug',
  description: 'description',
  shortDescription: 'shortDescription',
  specifications: 'specifications',
  features: 'features',
  price: 'price',
  salePrice: 'salePrice',
  costPrice: 'costPrice',
  sku: 'sku',
  barcode: 'barcode',
  weight: 'weight',
  width: 'width',
  height: 'height',
  length: 'length',
  brandId: 'brandId',
  categoryId: 'categoryId',
  sellerId: 'sellerId',
  status: 'status',
  featured: 'featured',
  trending: 'trending',
  seoTitle: 'seoTitle',
  seoDescription: 'seoDescription',
  seoKeywords: 'seoKeywords',
  metaData: 'metaData',
  viewCount: 'viewCount',
  salesCount: 'salesCount',
  publishedAt: 'publishedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ShopProductImageScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  originalUrl: 'originalUrl',
  thumbnailUrl: 'thumbnailUrl',
  webpUrl: 'webpUrl',
  blurHash: 'blurHash',
  alt: 'alt',
  width: 'width',
  height: 'height',
  displayOrder: 'displayOrder',
  createdAt: 'createdAt'
};

exports.Prisma.ShopProductVariantScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  title: 'title',
  sku: 'sku',
  barcode: 'barcode',
  price: 'price',
  salePrice: 'salePrice',
  stock: 'stock',
  lowStockThreshold: 'lowStockThreshold',
  weight: 'weight',
  isDefault: 'isDefault',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ShopVariantAttributeScalarFieldEnum = {
  id: 'id',
  variantId: 'variantId',
  key: 'key',
  value: 'value'
};

exports.Prisma.ShopCategoryScalarFieldEnum = {
  id: 'id',
  name: 'name',
  slug: 'slug',
  description: 'description',
  imageUrl: 'imageUrl',
  iconUrl: 'iconUrl',
  parentId: 'parentId',
  order: 'order',
  active: 'active',
  createdAt: 'createdAt'
};

exports.Prisma.ShopCollectionScalarFieldEnum = {
  id: 'id',
  name: 'name',
  slug: 'slug',
  description: 'description',
  imageUrl: 'imageUrl',
  active: 'active',
  order: 'order',
  createdAt: 'createdAt'
};

exports.Prisma.ShopCollectionProductScalarFieldEnum = {
  id: 'id',
  collectionId: 'collectionId',
  productId: 'productId',
  order: 'order'
};

exports.Prisma.ShopCartScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  sessionId: 'sessionId',
  countryCode: 'countryCode',
  currencyCode: 'currencyCode',
  couponId: 'couponId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ShopCartItemScalarFieldEnum = {
  id: 'id',
  cartId: 'cartId',
  productId: 'productId',
  variantId: 'variantId',
  quantity: 'quantity',
  unitPrice: 'unitPrice',
  selected: 'selected',
  recentlyAdded: 'recentlyAdded',
  snapTitle: 'snapTitle',
  snapBrand: 'snapBrand',
  snapThumbnailUrl: 'snapThumbnailUrl',
  snapVariantTitle: 'snapVariantTitle',
  snapSku: 'snapSku',
  snapPrice: 'snapPrice',
  createdAt: 'createdAt'
};

exports.Prisma.ShopOrderScalarFieldEnum = {
  id: 'id',
  orderNumber: 'orderNumber',
  userId: 'userId',
  sellerId: 'sellerId',
  subtotal: 'subtotal',
  shippingTotal: 'shippingTotal',
  taxTotal: 'taxTotal',
  discountTotal: 'discountTotal',
  total: 'total',
  status: 'status',
  shippingAddressId: 'shippingAddressId',
  trackingNumber: 'trackingNumber',
  courier: 'courier',
  estimatedDeliveryAt: 'estimatedDeliveryAt',
  deliveredAt: 'deliveredAt',
  cancelledAt: 'cancelledAt',
  cancelReason: 'cancelReason',
  refundStatus: 'refundStatus',
  refundAmount: 'refundAmount',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ShopOrderItemScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  productId: 'productId',
  variantId: 'variantId',
  productTitle: 'productTitle',
  variantTitle: 'variantTitle',
  thumbnailUrl: 'thumbnailUrl',
  quantity: 'quantity',
  unitPrice: 'unitPrice',
  totalPrice: 'totalPrice',
  createdAt: 'createdAt'
};

exports.Prisma.ShopCouponScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  description: 'description',
  type: 'type',
  value: 'value',
  minOrderAmount: 'minOrderAmount',
  maxDiscountAmount: 'maxDiscountAmount',
  maxUses: 'maxUses',
  usedCount: 'usedCount',
  sellerId: 'sellerId',
  startAt: 'startAt',
  endAt: 'endAt',
  active: 'active',
  createdAt: 'createdAt'
};

exports.Prisma.ShopReviewScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  userId: 'userId',
  rating: 'rating',
  title: 'title',
  body: 'body',
  images: 'images',
  status: 'status',
  adminNote: 'adminNote',
  helpfulCount: 'helpfulCount',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ShopCommerceNotificationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  type: 'type',
  title: 'title',
  body: 'body',
  icon: 'icon',
  actionUrl: 'actionUrl',
  priority: 'priority',
  read: 'read',
  readAt: 'readAt',
  metadata: 'metadata',
  createdAt: 'createdAt'
};

exports.Prisma.UserRoleScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  role: 'role',
  createdAt: 'createdAt'
};

exports.Prisma.ShopInventoryHistoryScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  variantId: 'variantId',
  changeType: 'changeType',
  quantityBefore: 'quantityBefore',
  quantityAfter: 'quantityAfter',
  quantityDelta: 'quantityDelta',
  reason: 'reason',
  performedBy: 'performedBy',
  orderId: 'orderId',
  createdAt: 'createdAt'
};

exports.Prisma.ShopAnalyticsEventScalarFieldEnum = {
  id: 'id',
  eventType: 'eventType',
  productId: 'productId',
  categoryId: 'categoryId',
  sellerId: 'sellerId',
  userId: 'userId',
  sessionId: 'sessionId',
  metadata: 'metadata',
  revenue: 'revenue',
  createdAt: 'createdAt'
};

exports.Prisma.ShopCartAuditLogScalarFieldEnum = {
  id: 'id',
  cartId: 'cartId',
  userId: 'userId',
  action: 'action',
  payload: 'payload',
  createdAt: 'createdAt'
};

exports.Prisma.ShopAdminSettingScalarFieldEnum = {
  key: 'key',
  value: 'value',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.UserOrderByRelevanceFieldEnum = {
  id: 'id',
  username: 'username',
  displayName: 'displayName',
  email: 'email',
  passwordHash: 'passwordHash',
  googleId: 'googleId',
  avatarUrl: 'avatarUrl',
  bio: 'bio',
  headerBannerUrl: 'headerBannerUrl',
  location: 'location',
  professionalCategory: 'professionalCategory',
  websiteUrl: 'websiteUrl',
  role: 'role'
};

exports.Prisma.SessionOrderByRelevanceFieldEnum = {
  id: 'id',
  userId: 'userId'
};

exports.Prisma.FollowOrderByRelevanceFieldEnum = {
  followerId: 'followerId',
  followingId: 'followingId'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};

exports.Prisma.PostOrderByRelevanceFieldEnum = {
  id: 'id',
  content: 'content',
  userId: 'userId',
  altText: 'altText',
  audience: 'audience',
  location: 'location',
  locationName: 'locationName',
  locationCity: 'locationCity',
  locationState: 'locationState',
  locationCountry: 'locationCountry',
  locationDisplay: 'locationDisplay',
  quotedPostId: 'quotedPostId'
};

exports.Prisma.MediaOrderByRelevanceFieldEnum = {
  id: 'id',
  postId: 'postId',
  url: 'url'
};

exports.Prisma.CommentOrderByRelevanceFieldEnum = {
  id: 'id',
  content: 'content',
  userId: 'userId',
  postId: 'postId',
  parentCommentId: 'parentCommentId'
};

exports.Prisma.LikeOrderByRelevanceFieldEnum = {
  userId: 'userId',
  postId: 'postId'
};

exports.Prisma.BookmarkOrderByRelevanceFieldEnum = {
  id: 'id',
  userId: 'userId',
  postId: 'postId'
};

exports.Prisma.NotificationOrderByRelevanceFieldEnum = {
  id: 'id',
  issuerId: 'issuerId',
  postId: 'postId',
  recipientId: 'recipientId',
  deepLink: 'deepLink'
};

exports.Prisma.StoryOrderByRelevanceFieldEnum = {
  id: 'id',
  userId: 'userId',
  mediaUrl: 'mediaUrl'
};

exports.Prisma.DetectedObjectOrderByRelevanceFieldEnum = {
  id: 'id',
  postId: 'postId',
  name: 'name'
};

exports.Prisma.DetectedProductOrderByRelevanceFieldEnum = {
  id: 'id',
  postId: 'postId',
  label: 'label',
  category: 'category',
  thumbnailUrl: 'thumbnailUrl',
  color: 'color',
  dominantColor: 'dominantColor',
  sourceFrameUrl: 'sourceFrameUrl',
  gender: 'gender',
  keywords: 'keywords',
  material: 'material',
  season: 'season',
  style: 'style',
  creatorId: 'creatorId',
  images: 'images',
  brand: 'brand',
  description: 'description',
  cropImageUrl: 'cropImageUrl',
  detectedBarcode: 'detectedBarcode',
  detectedLogo: 'detectedLogo',
  detectionSessionId: 'detectionSessionId',
  ocrText: 'ocrText',
  resolvedQueries: 'resolvedQueries',
  trackingId: 'trackingId',
  canonicalProductId: 'canonicalProductId'
};

exports.Prisma.ShoppingMatchOrderByRelevanceFieldEnum = {
  id: 'id',
  detectedProductId: 'detectedProductId',
  title: 'title',
  price: 'price',
  currency: 'currency',
  sourceStore: 'sourceStore',
  productUrl: 'productUrl',
  imageUrl: 'imageUrl',
  affiliateUrl: 'affiliateUrl',
  merchantId: 'merchantId',
  deliveryText: 'deliveryText',
  trackingCode: 'trackingCode',
  directUrl: 'directUrl',
  categoryPath: 'categoryPath',
  cleanedTitle: 'cleanedTitle',
  condition: 'condition',
  estimatedDelivery: 'estimatedDelivery',
  features: 'features',
  galleryImageUrls: 'galleryImageUrls',
  highlights: 'highlights',
  manufacturer: 'manufacturer',
  matchBrand: 'matchBrand',
  matchDescription: 'matchDescription',
  modelNumber: 'modelNumber',
  originalPrice: 'originalPrice',
  returnPolicy: 'returnPolicy',
  sellerName: 'sellerName',
  shippingCost: 'shippingCost',
  sku: 'sku',
  stockAvailability: 'stockAvailability',
  upc: 'upc',
  warranty: 'warranty'
};

exports.Prisma.CanonicalProductOrderByRelevanceFieldEnum = {
  id: 'id',
  brand: 'brand',
  modelLine: 'modelLine',
  subcategory: 'subcategory',
  canonicalTitle: 'canonicalTitle'
};

exports.Prisma.MarketplaceSearchCacheOrderByRelevanceFieldEnum = {
  id: 'id',
  query: 'query',
  normalizedQuery: 'normalizedQuery',
  marketplace: 'marketplace',
  country: 'country',
  currency: 'currency',
  language: 'language'
};

exports.Prisma.VideoProcessingJobOrderByRelevanceFieldEnum = {
  id: 'id',
  postId: 'postId',
  status: 'status',
  error: 'error'
};

exports.Prisma.VideoProcessingLogOrderByRelevanceFieldEnum = {
  id: 'id',
  videoId: 'videoId',
  errorMessages: 'errorMessages'
};

exports.Prisma.PollOrderByRelevanceFieldEnum = {
  id: 'id',
  postId: 'postId'
};

exports.Prisma.PollOptionOrderByRelevanceFieldEnum = {
  id: 'id',
  pollId: 'pollId',
  text: 'text'
};

exports.Prisma.PollVoteOrderByRelevanceFieldEnum = {
  id: 'id',
  optionId: 'optionId',
  userId: 'userId',
  pollId: 'pollId'
};

exports.Prisma.PostViewOrderByRelevanceFieldEnum = {
  id: 'id',
  postId: 'postId',
  userId: 'userId',
  ip: 'ip'
};

exports.Prisma.RepostOrderByRelevanceFieldEnum = {
  id: 'id',
  postId: 'postId',
  userId: 'userId'
};

exports.Prisma.PostMentionOrderByRelevanceFieldEnum = {
  id: 'id',
  postId: 'postId',
  userId: 'userId'
};

exports.Prisma.DraftPostOrderByRelevanceFieldEnum = {
  id: 'id',
  userId: 'userId',
  content: 'content'
};

exports.Prisma.SavedCollectionOrderByRelevanceFieldEnum = {
  id: 'id',
  name: 'name',
  userId: 'userId'
};

exports.Prisma.SavedCollectionItemOrderByRelevanceFieldEnum = {
  id: 'id',
  collectionId: 'collectionId',
  postId: 'postId'
};

exports.Prisma.CommentLikeOrderByRelevanceFieldEnum = {
  id: 'id',
  commentId: 'commentId',
  userId: 'userId'
};

exports.Prisma.PriceHistoryOrderByRelevanceFieldEnum = {
  id: 'id',
  shoppingMatchId: 'shoppingMatchId'
};

exports.Prisma.ProductCollectionOrderByRelevanceFieldEnum = {
  id: 'id',
  name: 'name',
  userId: 'userId',
  description: 'description',
  coverImage: 'coverImage'
};

exports.Prisma.ProductCollectionItemOrderByRelevanceFieldEnum = {
  id: 'id',
  collectionId: 'collectionId',
  productId: 'productId'
};

exports.Prisma.ProductAssignmentOrderByRelevanceFieldEnum = {
  id: 'id',
  postId: 'postId',
  productId: 'productId',
  assignedById: 'assignedById',
  reviewReason: 'reviewReason'
};

exports.Prisma.ProductEventOrderByRelevanceFieldEnum = {
  id: 'id',
  productId: 'productId',
  assignmentId: 'assignmentId',
  userId: 'userId'
};

exports.Prisma.MerchantOrderByRelevanceFieldEnum = {
  id: 'id',
  name: 'name',
  logoUrl: 'logoUrl'
};

exports.Prisma.BrandOrderByRelevanceFieldEnum = {
  id: 'id',
  name: 'name',
  slug: 'slug',
  logoUrl: 'logoUrl',
  description: 'description'
};

exports.Prisma.CampaignOrderByRelevanceFieldEnum = {
  id: 'id',
  brandId: 'brandId',
  creatorId: 'creatorId',
  name: 'name'
};

exports.Prisma.LocationCacheOrderByRelevanceFieldEnum = {
  id: 'id',
  osmId: 'osmId',
  displayName: 'displayName',
  city: 'city',
  state: 'state',
  country: 'country'
};

exports.Prisma.RecentLocationOrderByRelevanceFieldEnum = {
  id: 'id',
  userId: 'userId',
  locationName: 'locationName',
  city: 'city',
  state: 'state',
  country: 'country'
};

exports.Prisma.PinnedContentOrderByRelevanceFieldEnum = {
  id: 'id',
  userId: 'userId',
  postId: 'postId'
};

exports.Prisma.NotificationPreferenceOrderByRelevanceFieldEnum = {
  userId: 'userId'
};

exports.Prisma.ChatPinOrderByRelevanceFieldEnum = {
  id: 'id',
  userId: 'userId',
  channelId: 'channelId'
};

exports.Prisma.ChatArchiveOrderByRelevanceFieldEnum = {
  id: 'id',
  userId: 'userId',
  channelId: 'channelId'
};

exports.Prisma.ChatMuteOrderByRelevanceFieldEnum = {
  id: 'id',
  userId: 'userId',
  channelId: 'channelId'
};

exports.Prisma.ConversationSettingsOrderByRelevanceFieldEnum = {
  id: 'id',
  userId: 'userId',
  channelId: 'channelId',
  wallpaper: 'wallpaper'
};

exports.Prisma.CloseFriendOrderByRelevanceFieldEnum = {
  id: 'id',
  userId: 'userId',
  friendId: 'friendId'
};

exports.Prisma.InstantOrderByRelevanceFieldEnum = {
  id: 'id',
  senderId: 'senderId',
  mediaUrl: 'mediaUrl',
  audience: 'audience'
};

exports.Prisma.InstantViewOrderByRelevanceFieldEnum = {
  id: 'id',
  instantId: 'instantId',
  userId: 'userId'
};

exports.Prisma.CommentRepostOrderByRelevanceFieldEnum = {
  id: 'id',
  commentId: 'commentId',
  userId: 'userId'
};

exports.Prisma.CommentBookmarkOrderByRelevanceFieldEnum = {
  id: 'id',
  commentId: 'commentId',
  userId: 'userId'
};

exports.Prisma.UserMuteOrderByRelevanceFieldEnum = {
  id: 'id',
  muterId: 'muterId',
  mutedId: 'mutedId'
};

exports.Prisma.UserBlockOrderByRelevanceFieldEnum = {
  id: 'id',
  blockerId: 'blockerId',
  blockedId: 'blockedId'
};

exports.Prisma.MutedConversationOrderByRelevanceFieldEnum = {
  id: 'id',
  userId: 'userId',
  commentId: 'commentId'
};

exports.Prisma.CommentReportOrderByRelevanceFieldEnum = {
  id: 'id',
  commentId: 'commentId',
  postId: 'postId',
  userId: 'userId',
  reason: 'reason'
};

exports.Prisma.StoryViewOrderByRelevanceFieldEnum = {
  id: 'id',
  storyId: 'storyId',
  userId: 'userId'
};

exports.Prisma.StoryLikeOrderByRelevanceFieldEnum = {
  id: 'id',
  storyId: 'storyId',
  userId: 'userId'
};

exports.Prisma.DetectionSessionOrderByRelevanceFieldEnum = {
  id: 'id',
  postId: 'postId',
  sessionHash: 'sessionHash',
  status: 'status'
};

exports.Prisma.ProductTimelineOrderByRelevanceFieldEnum = {
  id: 'id',
  detectedProductId: 'detectedProductId'
};

exports.Prisma.ProductVariantOrderByRelevanceFieldEnum = {
  id: 'id',
  shoppingMatchId: 'shoppingMatchId',
  variantType: 'variantType',
  variantValue: 'variantValue',
  price: 'price',
  sku: 'sku',
  imageUrl: 'imageUrl',
  availability: 'availability'
};

exports.Prisma.ShopBannerOrderByRelevanceFieldEnum = {
  id: 'id',
  title: 'title',
  subtitle: 'subtitle',
  imageUrl: 'imageUrl',
  desktopImageUrl: 'desktopImageUrl',
  mobileImageUrl: 'mobileImageUrl',
  tabletImageUrl: 'tabletImageUrl',
  ctaText: 'ctaText',
  ctaLink: 'ctaLink'
};

exports.Prisma.ShopHomepageSectionOrderByRelevanceFieldEnum = {
  id: 'id',
  type: 'type',
  title: 'title',
  subtitle: 'subtitle',
  layout: 'layout',
  background: 'background',
  icon: 'icon',
  cta: 'cta'
};

exports.Prisma.ShopDealOrderByRelevanceFieldEnum = {
  id: 'id',
  productId: 'productId'
};

exports.Prisma.ShopCreatorPickOrderByRelevanceFieldEnum = {
  id: 'id',
  creatorId: 'creatorId',
  productId: 'productId',
  discountLabel: 'discountLabel'
};

exports.Prisma.ShopSellerOrderByRelevanceFieldEnum = {
  id: 'id',
  userId: 'userId',
  storeName: 'storeName',
  slug: 'slug',
  logoUrl: 'logoUrl',
  bannerUrl: 'bannerUrl',
  description: 'description',
  status: 'status',
  payoutEmail: 'payoutEmail'
};

exports.Prisma.ShopWishlistOrderByRelevanceFieldEnum = {
  id: 'id',
  userId: 'userId',
  productId: 'productId'
};

exports.Prisma.ShopAddressOrderByRelevanceFieldEnum = {
  id: 'id',
  userId: 'userId',
  firstName: 'firstName',
  lastName: 'lastName',
  addressLine: 'addressLine',
  addressLine2: 'addressLine2',
  city: 'city',
  state: 'state',
  postalCode: 'postalCode',
  countryCode: 'countryCode',
  phone: 'phone'
};

exports.Prisma.ShopProductOrderByRelevanceFieldEnum = {
  id: 'id',
  title: 'title',
  slug: 'slug',
  description: 'description',
  shortDescription: 'shortDescription',
  sku: 'sku',
  barcode: 'barcode',
  brandId: 'brandId',
  categoryId: 'categoryId',
  sellerId: 'sellerId',
  seoTitle: 'seoTitle',
  seoDescription: 'seoDescription',
  seoKeywords: 'seoKeywords'
};

exports.Prisma.ShopProductImageOrderByRelevanceFieldEnum = {
  id: 'id',
  productId: 'productId',
  originalUrl: 'originalUrl',
  thumbnailUrl: 'thumbnailUrl',
  webpUrl: 'webpUrl',
  blurHash: 'blurHash',
  alt: 'alt'
};

exports.Prisma.ShopProductVariantOrderByRelevanceFieldEnum = {
  id: 'id',
  productId: 'productId',
  title: 'title',
  sku: 'sku',
  barcode: 'barcode'
};

exports.Prisma.ShopVariantAttributeOrderByRelevanceFieldEnum = {
  id: 'id',
  variantId: 'variantId',
  key: 'key',
  value: 'value'
};

exports.Prisma.ShopCategoryOrderByRelevanceFieldEnum = {
  id: 'id',
  name: 'name',
  slug: 'slug',
  description: 'description',
  imageUrl: 'imageUrl',
  iconUrl: 'iconUrl',
  parentId: 'parentId'
};

exports.Prisma.ShopCollectionOrderByRelevanceFieldEnum = {
  id: 'id',
  name: 'name',
  slug: 'slug',
  description: 'description',
  imageUrl: 'imageUrl'
};

exports.Prisma.ShopCollectionProductOrderByRelevanceFieldEnum = {
  id: 'id',
  collectionId: 'collectionId',
  productId: 'productId'
};

exports.Prisma.ShopCartOrderByRelevanceFieldEnum = {
  id: 'id',
  userId: 'userId',
  sessionId: 'sessionId',
  countryCode: 'countryCode',
  currencyCode: 'currencyCode',
  couponId: 'couponId'
};

exports.Prisma.ShopCartItemOrderByRelevanceFieldEnum = {
  id: 'id',
  cartId: 'cartId',
  productId: 'productId',
  variantId: 'variantId',
  snapTitle: 'snapTitle',
  snapBrand: 'snapBrand',
  snapThumbnailUrl: 'snapThumbnailUrl',
  snapVariantTitle: 'snapVariantTitle',
  snapSku: 'snapSku'
};

exports.Prisma.ShopOrderOrderByRelevanceFieldEnum = {
  id: 'id',
  userId: 'userId',
  sellerId: 'sellerId',
  shippingAddressId: 'shippingAddressId',
  trackingNumber: 'trackingNumber',
  courier: 'courier',
  cancelReason: 'cancelReason',
  notes: 'notes'
};

exports.Prisma.ShopOrderItemOrderByRelevanceFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  productId: 'productId',
  variantId: 'variantId',
  productTitle: 'productTitle',
  variantTitle: 'variantTitle',
  thumbnailUrl: 'thumbnailUrl'
};

exports.Prisma.ShopCouponOrderByRelevanceFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  description: 'description',
  sellerId: 'sellerId'
};

exports.Prisma.ShopReviewOrderByRelevanceFieldEnum = {
  id: 'id',
  productId: 'productId',
  userId: 'userId',
  title: 'title',
  body: 'body',
  images: 'images',
  adminNote: 'adminNote'
};

exports.Prisma.ShopCommerceNotificationOrderByRelevanceFieldEnum = {
  id: 'id',
  userId: 'userId',
  type: 'type',
  title: 'title',
  body: 'body',
  icon: 'icon',
  actionUrl: 'actionUrl'
};

exports.Prisma.UserRoleOrderByRelevanceFieldEnum = {
  id: 'id',
  userId: 'userId'
};

exports.Prisma.ShopInventoryHistoryOrderByRelevanceFieldEnum = {
  id: 'id',
  productId: 'productId',
  variantId: 'variantId',
  reason: 'reason',
  performedBy: 'performedBy',
  orderId: 'orderId'
};

exports.Prisma.ShopAnalyticsEventOrderByRelevanceFieldEnum = {
  id: 'id',
  productId: 'productId',
  categoryId: 'categoryId',
  sellerId: 'sellerId',
  userId: 'userId',
  sessionId: 'sessionId'
};

exports.Prisma.ShopCartAuditLogOrderByRelevanceFieldEnum = {
  id: 'id',
  cartId: 'cartId',
  userId: 'userId',
  action: 'action'
};

exports.Prisma.ShopAdminSettingOrderByRelevanceFieldEnum = {
  key: 'key',
  value: 'value'
};
exports.FollowStatus = exports.$Enums.FollowStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED'
};

exports.ContentFormat = exports.$Enums.ContentFormat = {
  FEED: 'FEED',
  SPOT: 'SPOT'
};

exports.MediaType = exports.$Enums.MediaType = {
  IMAGE: 'IMAGE',
  VIDEO: 'VIDEO'
};

exports.NotificationType = exports.$Enums.NotificationType = {
  LIKE: 'LIKE',
  FOLLOW: 'FOLLOW',
  COMMENT: 'COMMENT',
  REPOST: 'REPOST',
  QUOTE: 'QUOTE',
  REPLY: 'REPLY',
  MENTION: 'MENTION',
  FOLLOW_REQUEST: 'FOLLOW_REQUEST',
  FOLLOW_ACCEPTED: 'FOLLOW_ACCEPTED',
  COMMENT_LIKE: 'COMMENT_LIKE',
  STORY_MENTION: 'STORY_MENTION',
  SHARE: 'SHARE',
  COLLECTION_SAVE: 'COLLECTION_SAVE',
  PRODUCT_ORDER: 'PRODUCT_ORDER',
  PRODUCT_SHIPPED: 'PRODUCT_SHIPPED',
  PRODUCT_DELIVERED: 'PRODUCT_DELIVERED',
  PRODUCT_PRICE_DROP: 'PRODUCT_PRICE_DROP',
  PRODUCT_BACK_IN_STOCK: 'PRODUCT_BACK_IN_STOCK',
  PRODUCT_APPROVED: 'PRODUCT_APPROVED',
  POST_APPROVED: 'POST_APPROVED',
  COLLECTION_INVITE: 'COLLECTION_INVITE',
  GROUP_INVITE: 'GROUP_INVITE',
  MESSAGE: 'MESSAGE',
  VERIFICATION_APPROVED: 'VERIFICATION_APPROVED',
  VERIFICATION_REJECTED: 'VERIFICATION_REJECTED',
  SECURITY_ALERT: 'SECURITY_ALERT',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  SYSTEM: 'SYSTEM'
};

exports.ProductAvailability = exports.$Enums.ProductAvailability = {
  IN_STOCK: 'IN_STOCK',
  OUT_OF_STOCK: 'OUT_OF_STOCK'
};

exports.RetailerSource = exports.$Enums.RetailerSource = {
  AI_MATCH: 'AI_MATCH',
  CREATOR_MATCH: 'CREATOR_MATCH',
  MANUAL: 'MANUAL'
};

exports.ProductStatus = exports.$Enums.ProductStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  HIDDEN: 'HIDDEN',
  ARCHIVED: 'ARCHIVED',
  PENDING_REVIEW: 'PENDING_REVIEW'
};

exports.VerificationSource = exports.$Enums.VerificationSource = {
  AI_DETECTED: 'AI_DETECTED',
  CREATOR_APPROVED: 'CREATOR_APPROVED',
  CREATOR_ADDED: 'CREATOR_ADDED',
  ADMIN_VERIFIED: 'ADMIN_VERIFIED'
};

exports.SourceType = exports.$Enums.SourceType = {
  AI_DETECTED: 'AI_DETECTED',
  CREATOR_MANUAL: 'CREATOR_MANUAL',
  BRAND_PARTNERSHIP: 'BRAND_PARTNERSHIP'
};

exports.ProductType = exports.$Enums.ProductType = {
  FEATURED: 'FEATURED',
  SIMILAR: 'SIMILAR'
};

exports.ProductSource = exports.$Enums.ProductSource = {
  AI: 'AI',
  MANUAL: 'MANUAL',
  IMPORTED: 'IMPORTED'
};

exports.ProductEventType = exports.$Enums.ProductEventType = {
  VIEW: 'VIEW',
  DRAWER_OPEN: 'DRAWER_OPEN',
  PRODUCT_CLICK: 'PRODUCT_CLICK',
  RETAILER_CLICK: 'RETAILER_CLICK',
  SAVE: 'SAVE'
};

exports.CampaignStatus = exports.$Enums.CampaignStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

exports.ShopProductStatus = exports.$Enums.ShopProductStatus = {
  DRAFT: 'DRAFT',
  PENDING_REVIEW: 'PENDING_REVIEW',
  CHANGES_REQUESTED: 'CHANGES_REQUESTED',
  REJECTED: 'REJECTED',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED'
};

exports.ShopOrderStatus = exports.$Enums.ShopOrderStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PACKED: 'PACKED',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  RETURNED: 'RETURNED',
  REFUNDED: 'REFUNDED'
};

exports.RefundStatus = exports.$Enums.RefundStatus = {
  NONE: 'NONE',
  REQUESTED: 'REQUESTED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  DENIED: 'DENIED'
};

exports.CouponType = exports.$Enums.CouponType = {
  PERCENTAGE: 'PERCENTAGE',
  FIXED: 'FIXED',
  BUY_X_GET_Y: 'BUY_X_GET_Y',
  FREE_SHIPPING: 'FREE_SHIPPING'
};

exports.ReviewStatus = exports.$Enums.ReviewStatus = {
  REVIEW_PENDING: 'REVIEW_PENDING',
  REVIEW_APPROVED: 'REVIEW_APPROVED',
  REVIEW_REJECTED: 'REVIEW_REJECTED',
  REVIEW_FEATURED: 'REVIEW_FEATURED'
};

exports.NotificationPriority = exports.$Enums.NotificationPriority = {
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  URGENT: 'URGENT'
};

exports.UserRoleEnum = exports.$Enums.UserRoleEnum = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  SELLER: 'SELLER',
  CREATOR: 'CREATOR',
  SUPPORT: 'SUPPORT',
  USER: 'USER'
};

exports.InventoryChangeType = exports.$Enums.InventoryChangeType = {
  ADDED: 'ADDED',
  SOLD: 'SOLD',
  RETURNED: 'RETURNED',
  ADJUSTED: 'ADJUSTED',
  BULK_UPDATE: 'BULK_UPDATE'
};

exports.AnalyticsEventType = exports.$Enums.AnalyticsEventType = {
  PRODUCT_VIEW: 'PRODUCT_VIEW',
  PRODUCT_CLICK: 'PRODUCT_CLICK',
  ADD_TO_CART: 'ADD_TO_CART',
  PURCHASE: 'PURCHASE',
  SEARCH: 'SEARCH',
  CATEGORY_VIEW: 'CATEGORY_VIEW'
};

exports.Prisma.ModelName = {
  User: 'User',
  Session: 'Session',
  Follow: 'Follow',
  Post: 'Post',
  Media: 'Media',
  Comment: 'Comment',
  Like: 'Like',
  Bookmark: 'Bookmark',
  Notification: 'Notification',
  Story: 'Story',
  DetectedObject: 'DetectedObject',
  DetectedProduct: 'DetectedProduct',
  ShoppingMatch: 'ShoppingMatch',
  CanonicalProduct: 'CanonicalProduct',
  MarketplaceSearchCache: 'MarketplaceSearchCache',
  VideoProcessingJob: 'VideoProcessingJob',
  VideoProcessingLog: 'VideoProcessingLog',
  Poll: 'Poll',
  PollOption: 'PollOption',
  PollVote: 'PollVote',
  PostView: 'PostView',
  Repost: 'Repost',
  PostMention: 'PostMention',
  DraftPost: 'DraftPost',
  SavedCollection: 'SavedCollection',
  SavedCollectionItem: 'SavedCollectionItem',
  CommentLike: 'CommentLike',
  PriceHistory: 'PriceHistory',
  ProductCollection: 'ProductCollection',
  ProductCollectionItem: 'ProductCollectionItem',
  ProductAssignment: 'ProductAssignment',
  ProductEvent: 'ProductEvent',
  Merchant: 'Merchant',
  Brand: 'Brand',
  Campaign: 'Campaign',
  LocationCache: 'LocationCache',
  RecentLocation: 'RecentLocation',
  PinnedContent: 'PinnedContent',
  NotificationPreference: 'NotificationPreference',
  ChatPin: 'ChatPin',
  ChatArchive: 'ChatArchive',
  ChatMute: 'ChatMute',
  ConversationSettings: 'ConversationSettings',
  CloseFriend: 'CloseFriend',
  Instant: 'Instant',
  InstantView: 'InstantView',
  CommentRepost: 'CommentRepost',
  CommentBookmark: 'CommentBookmark',
  UserMute: 'UserMute',
  UserBlock: 'UserBlock',
  MutedConversation: 'MutedConversation',
  CommentReport: 'CommentReport',
  StoryView: 'StoryView',
  StoryLike: 'StoryLike',
  DetectionSession: 'DetectionSession',
  ProductTimeline: 'ProductTimeline',
  ProductVariant: 'ProductVariant',
  ShopBanner: 'ShopBanner',
  ShopHomepageSection: 'ShopHomepageSection',
  ShopDeal: 'ShopDeal',
  ShopCreatorPick: 'ShopCreatorPick',
  ShopSeller: 'ShopSeller',
  ShopWishlist: 'ShopWishlist',
  ShopAddress: 'ShopAddress',
  ShopProduct: 'ShopProduct',
  ShopProductImage: 'ShopProductImage',
  ShopProductVariant: 'ShopProductVariant',
  ShopVariantAttribute: 'ShopVariantAttribute',
  ShopCategory: 'ShopCategory',
  ShopCollection: 'ShopCollection',
  ShopCollectionProduct: 'ShopCollectionProduct',
  ShopCart: 'ShopCart',
  ShopCartItem: 'ShopCartItem',
  ShopOrder: 'ShopOrder',
  ShopOrderItem: 'ShopOrderItem',
  ShopCoupon: 'ShopCoupon',
  ShopReview: 'ShopReview',
  ShopCommerceNotification: 'ShopCommerceNotification',
  UserRole: 'UserRole',
  ShopInventoryHistory: 'ShopInventoryHistory',
  ShopAnalyticsEvent: 'ShopAnalyticsEvent',
  ShopCartAuditLog: 'ShopCartAuditLog',
  ShopAdminSetting: 'ShopAdminSetting'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
