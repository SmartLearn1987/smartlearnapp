import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Returns the correct full URL for an asset.
 * If the path is relative and starts with /uploads or uploads/, it prefixes it with the API base URL.
 * Static assets in the public folder (starting with /images) are returned as is.
 */
export function getAssetUrl(path: string | null | undefined): string {
  if (!path) return "";
  
  // If it's already a full URL (http/https), return it
  if (
    path.startsWith("http://") || 
    path.startsWith("https://") || 
    path.startsWith("data:") || 
    path.startsWith("blob:")
  ) {
    return path;
  }

  // Normalize path: ensure it starts with / if it refers to uploads
  let normalizedPath = path;
  if (path.startsWith("uploads/")) {
    normalizedPath = "/" + path;
  }

  // For /uploads/ paths (dynamic assets from server)
  if (normalizedPath.startsWith("/uploads/")) {
    // 1. Try to get base URL from environment variable
    const envApiBase = (import.meta as any).env?.VITE_API_BASE_URL;
    
    if (envApiBase && envApiBase.startsWith("http")) {
      const base = envApiBase.replace(/\/api\/?$/, "");
      return `${base}${normalizedPath}`;
    }

    // 2. If no env variable, use window location as base
    if (typeof window !== "undefined") {
      // In production, if served from the same domain, relative path is fine.
      // But if we need an absolute URL for some reason, we can construct it.
      return normalizedPath;
    }
    
    return normalizedPath;
  }

  // Default for static assets in /public (like /images/...)
  return normalizedPath;
}
