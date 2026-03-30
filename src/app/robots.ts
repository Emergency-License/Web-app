import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/cancel"],
    },
    sitemap: "https://emergencylicense.com/sitemap.xml",
  };
}
