import { next } from "@vercel/functions";

export const config = {
  matcher: "/:path*",
};

function unauthorized() {
  return new Response("Acceso restringido.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Calendario", charset="UTF-8"',
    },
  });
}

export default function middleware(request) {
  const expectedUser = process.env.SITE_USER;
  const expectedPass = process.env.SITE_PASSWORD;

  if (!expectedUser || !expectedPass) {
    return unauthorized();
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return unauthorized();
  }

  let decoded;
  try {
    decoded = atob(authHeader.slice(6));
  } catch {
    return unauthorized();
  }

  const separatorIndex = decoded.indexOf(":");
  const providedUser = decoded.slice(0, separatorIndex);
  const providedPass = decoded.slice(separatorIndex + 1);

  if (providedUser !== expectedUser || providedPass !== expectedPass) {
    return unauthorized();
  }

  return next();
}
