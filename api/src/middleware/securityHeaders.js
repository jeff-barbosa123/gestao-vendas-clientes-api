function securityHeaders(req, res, next) {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Control referrer information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Disable XSS filter (modern browsers handle this better)
  res.setHeader('X-XSS-Protection', '0');
  
  // Permissions Policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=()');
  
  // Content Security Policy
  const isProduction = process.env.NODE_ENV === 'production';
  {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
    const defaultSrc = ["'self'"];
    const scriptSrc = ["'self'"];
    const styleSrc = ["'self'", "https://fonts.googleapis.com"];
    const fontSrc = ["'self'", "https://fonts.gstatic.com"];
    const connectSrc = ["'self'", ...allowedOrigins];
    const imgSrc = ["'self'", "data:", "https:"];

    // Em dev/staging, permitir eval/inline apenas para facilitar tooling (HMR, sourcemaps etc.)
    if (!isProduction) {
      scriptSrc.push("'unsafe-eval'", "'unsafe-inline'");
      styleSrc.push("'unsafe-inline'");
    }
    
    res.setHeader(
      'Content-Security-Policy',
      `default-src ${defaultSrc.join(' ')}; ` +
      `script-src ${scriptSrc.join(' ')}; ` +
      `style-src ${styleSrc.join(' ')}; ` +
      `font-src ${fontSrc.join(' ')}; ` +
      `connect-src ${connectSrc.join(' ')}; ` +
      `img-src ${imgSrc.join(' ')}; ` +
      `frame-ancestors 'none'; ` +
      `base-uri 'self'; ` +
      `form-action 'self';`
    );
  }
  
  // Force HTTPS in production
  if (isProduction) {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    if (protocol === 'http') {
      const httpsUrl = `https://${req.get('host')}${req.originalUrl}`;
      return res.redirect(301, httpsUrl);
    }
    
    // HSTS (HTTP Strict Transport Security) - 1 year
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Basic hardening headers (safe defaults)
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  // Avoid enabling COEP by default (can break loading cross-origin assets)
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  
  next();
}

module.exports = { securityHeaders };
