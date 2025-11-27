export const getApiUrl = (path: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    // Ensure path starts with / if not present
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    // If baseUrl is present, it should be the host (e.g. https://backend.onrender.com)
    // We assume the backend routes are prefixed with /api as per our previous change
    return `${baseUrl}${cleanPath}`;
};
