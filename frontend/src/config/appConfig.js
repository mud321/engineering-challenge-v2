// src/config/appConfig.js

// App metadata
export const appInfo = {
  name: "frontend",
  version: "1.0.0",
  environment: "development",
};

// API endpoints
export const apiConfig = {
  baseUrl: "http://localhost:4001/api",
  timeout: 10000, // ms
};

// Feature toggles
export const featureFlags = {
  enableAIAssistant: true,
  enableNFTSupport: false,
  enableAnalytics: true,
};

// UI / Branding
export const uiConfig = {
  theme: "light",
  primaryColor: "#3b82f6",
  logoPath: "/assets/logo.svg",
};

// Other constants
export const defaultLanguage = "en";
