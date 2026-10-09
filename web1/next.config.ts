import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  /* Next's dev indicator defaults to bottom-left, which is exactly
     where the typeface switch sits (left: 14px, bottom: 14px in
     globals.css). The indicator renders in a shadow root above every
     z-index on the page, so it was swallowing the clicks meant for
     the switch. Moving the indicator rather than the switch: the
     switch's corner is a deliberate choice, the indicator's is not.
     Dev-only setting — it has no effect on a build. */
  devIndicators: {
    position: "bottom-right",
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
