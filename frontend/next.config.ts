import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for better dev experience
  reactStrictMode: true,

  // Suppress cross origin warning for localtunnel/serveo/localhost.run domains
  allowedDevOrigins: [
    "twenty-crews-walk.loca.lt",
    "good-snake-0.loca.lt",
    "flat-stars-sleep.loca.lt",
    "clean-boxes-drum.loca.lt",
    "32d93f3f5d7e3f.lhr.life",
    "e73fb8fc0054f13a-223-181-82-220.serveousercontent.com",
    "7c15e3d03bd136e9-223-181-82-220.serveousercontent.com",
    "f6917468e4c22d93-223-181-82-220.serveousercontent.com",
    "a9ddcdccff31169f-223-181-82-220.serveousercontent.com",
    "b86c53160501a67a-223-181-82-220.serveousercontent.com",
    "*.serveousercontent.com",
    "*.lhr.life",
    "*.loca.lt"
  ],
};

export default nextConfig;


