/* API helper. Keep backend-specific URL and response-shape changes in this file. */
(() => {
  const config = window.LABWATCH_CONFIG;
  const tokenKey = "labwatch_token";
  const getToken = () => sessionStorage.getItem(tokenKey);
  const setToken = token => token ? sessionStorage.setItem(tokenKey, token) : sessionStorage.removeItem(tokenKey);

  async function request(path, options = {}) {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (getToken()) headers.Authorization = `Bearer ${getToken()}`;
    const response = await fetch(`${config.API_BASE_URL}${path}`, { ...options, headers });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!response.ok) {
      const message = data && (data.message || data.error) ? (data.message || data.error) : `Request failed (${response.status})`;
      throw new Error(message);
    }
    return data;
  }

  window.LabWatchAPI = {
    isDemo: () => config.USE_DEMO_DATA,
    getToken,
    setToken,
    async login(username, password) {
      const result = await request(config.ENDPOINTS.login, { method: "POST", body: JSON.stringify({ username, password }) });
      // Adjust this line if your backend returns a different token field.
      const token = result?.token || result?.accessToken || result?.access_token;
      if (token) setToken(token);
      return result;
    },
    me: () => request(config.ENDPOINTS.me),
    getIncidents: () => request(config.ENDPOINTS.incidents),
    getInventory: () => request(config.ENDPOINTS.inventory),
    getMaintenance: () => request(config.ENDPOINTS.maintenance),
    createIncident: payload => request(config.ENDPOINTS.reportIssue, { method: "POST", body: JSON.stringify(payload) }),
    updateIncident: (id, payload) => request(`${config.ENDPOINTS.incidents}/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) }),
    createInventoryItem: payload => request(config.ENDPOINTS.inventory, { method: "POST", body: JSON.stringify(payload) })
  };
})();
