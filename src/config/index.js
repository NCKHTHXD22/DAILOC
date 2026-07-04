require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3001,
  MONGO_URI: process.env.MONGO_URI || '',
  ZALO_APP_ID: process.env.ZALO_APP_ID || '',
  ZALO_APP_SECRET: process.env.ZALO_APP_SECRET || '',
  ZALO_OA_TOKEN: process.env.ZALO_OA_TOKEN || '',
  ZALO_REFRESH_TOKEN: process.env.ZALO_REFRESH_TOKEN || '',
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || '',
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || '',
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
  PUBLIC_URL: process.env.PUBLIC_URL || '',
  ZALO_GROUP_ID: process.env.ZALO_GROUP_ID || '',
  EMAIL_ADMIN: process.env.EMAIL_ADMIN || '',
  EMAIL_ADMIN_PASSWORD: process.env.EMAIL_ADMIN_PASSWORD || '',
  DASHBOARD_URL: process.env.DASHBOARD_URL || '',
  // ===== IOCTC (Tra cứu thủ tục hành chính / hồ sơ) =====
  IOCTC_BASE_URL: process.env.IOCTC_BASE_URL || '',
  IOCTC_USERNAME: process.env.IOCTC_USERNAME || '',
  IOCTC_PASSWORD: process.env.IOCTC_PASSWORD || '',

  // ===== EVNCPC (Lịch cắt điện) =====
  EVNCPC_API_URL: process.env.EVNCPC_API_URL || 'https://cskh-api.cpc.vn/api/remote/outages/area',
  EVNCPC_ORG_LIST_URL: process.env.EVNCPC_ORG_LIST_URL || 'https://cskh-api.cpc.vn/api/remote/organizations',
  EVNCPC_ORG_CODE: process.env.EVNCPC_ORG_CODE || 'PP',
  EVNCPC_SUBORG_CODE: process.env.EVNCPC_SUBORG_CODE || '',
};

