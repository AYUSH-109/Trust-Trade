import jwt from "jsonwebtoken";

function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required for protected routes");
  }

  return process.env.JWT_SECRET;
}

export function requireAuth(request, response, next) {
  const authorization = request.get("authorization");
  const [scheme, token] = authorization?.split(" ") ?? [];

  if (scheme !== "Bearer" || !token) {
    return response.status(401).json({ error: "Authentication required" });
  }

  try {
    request.auth = jwt.verify(token, getJwtSecret());
    return next();
  } catch (error) {
    console.error("Authentication token verification failed", error);
    return response.status(401).json({ error: "Invalid or expired token" });
  }
}
