const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "https://wealthx-backend-brsx.onrender.com";

/**
 * Universal Fetch Wrapper for WealthX
 */
async function request(endpoint, options = {}) {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint}`;

  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);

    let data;

    try {
      data = await response.json();
    } catch {
      data = {
        message: response.statusText || "Response parsing failed",
      };
    }

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid
        // If not already on login/signup, allow components to catch or handle logout
      }

      const errorMsg =
        data.message || `Request failed with status ${response.status}`;

      const err = new Error(errorMsg);
      err.status = response.status;
      err.data = data;

      throw err;
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export const api = {
  get: (endpoint, headers = {}) =>
    request(endpoint, {
      method: "GET",
      headers,
    }),

  post: (endpoint, body, headers = {}) =>
    request(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
      headers,
    }),

  put: (endpoint, body, headers = {}) =>
    request(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
      headers,
    }),

  delete: (endpoint, headers = {}) =>
    request(endpoint, {
      method: "DELETE",
      headers,
    }),
};

export default api;