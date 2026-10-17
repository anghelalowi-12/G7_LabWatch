/*
 * LABWATCH API CONFIGURATION
 * Replace API_BASE_URL and endpoint paths with the values from your backend team.
 * Example: API_BASE_URL: "http://localhost:5000/api"
 */
window.LABWATCH_CONFIG = {
  API_BASE_URL: "http://localhost:5000/api",
  USE_DEMO_DATA: true,
  ENDPOINTS: {
    login: "/auth/login",
    me: "/auth/me",
    incidents: "/incidents",
    inventory: "/inventory",
    maintenance: "/maintenance",
    reportIssue: "/incidents"
  }
};
