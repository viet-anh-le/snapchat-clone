import axiosInstance from "./axios.config";

/**
 * API Client Builder Pattern
 * Provides a fluent interface for building API requests
 */
class ApiClient {
  constructor() {
    this.config = {
      method: "GET",
      url: "",
      data: null,
      params: null,
      headers: {},
    };
  }

  /**
   * Set the HTTP method
   */
  method(method) {
    this.config.method = method.toUpperCase();
    return this;
  }

  /**
   * Set the endpoint URL
   */
  url(endpoint) {
    this.config.url = endpoint;
    return this;
  }

  /**
   * Set request body data
   */
  data(body) {
    this.config.data = body;
    return this;
  }

  /**
   * Set query parameters
   */
  params(queryParams) {
    this.config.params = queryParams;
    return this;
  }

  /**
   * Set custom headers
   */
  headers(customHeaders) {
    this.config.headers = { ...this.config.headers, ...customHeaders };
    return this;
  }

  /**
   * Execute the request
   */
  async execute() {
    try {
      const response = await axiosInstance({
        method: this.config.method,
        url: this.config.url,
        data: this.config.data,
        params: this.config.params,
        headers: this.config.headers,
      });

      return response.data;
    } catch (error) {
      throw error;
    } finally {
      // Reset config for next request
      this.reset();
    }
  }

  /**
   * Reset the builder configuration
   */
  reset() {
    this.config = {
      method: "GET",
      url: "",
      data: null,
      params: null,
      headers: {},
    };
    return this;
  }

  // Convenience methods for common HTTP verbs
  get(endpoint, params = null) {
    return this.method("GET").url(endpoint).params(params).execute();
  }

  post(endpoint, data = null) {
    return this.method("POST").url(endpoint).data(data).execute();
  }

  put(endpoint, data = null) {
    return this.method("PUT").url(endpoint).data(data).execute();
  }

  patch(endpoint, data = null) {
    return this.method("PATCH").url(endpoint).data(data).execute();
  }

  delete(endpoint, params = null) {
    return this.method("DELETE").url(endpoint).params(params).execute();
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export class for creating new instances if needed
export { ApiClient };

