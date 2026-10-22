/** Keep the browser on one origin; credentials remain in the FastAPI process. */
const config = {
  async rewrites() {
    const backend = process.env.PARLONS_BACKEND_URL || "http://127.0.0.1:8000";
    return [
      { source: "/api/backend/:path*", destination: `${backend}/:path*` },
    ];
  },
};
export default config;
