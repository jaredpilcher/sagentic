"""
Extension HTTP Client

Secure HTTP client for extensions that:
1. Validates requests against the extension's allowed URL whitelist
2. Routes all traffic through a proxy for auditing
3. Logs all requests (allowed and blocked) to the audit table

Usage in extension backend:
    from src.extensions.http_client import ExtensionHttpClient
    
    client = ExtensionHttpClient("my-extension")
    
    # Make requests to whitelisted URLs
    response = client.get("https://api.example.com/data")
    response = client.post("https://api.example.com/submit", json={"key": "value"})
"""

import httpx
import hashlib
import fnmatch
import re
from typing import Any, Dict, Optional, List
from datetime import datetime
from urllib.parse import urlparse
import uuid

from ..db.database import SessionLocal
from ..db.models import Extension, ExtensionNetworkAudit


class ExtensionHttpClient:
    """Secure HTTP client for extensions with URL whitelisting and audit logging."""
    
    def __init__(self, extension_name: str, timeout: float = 30.0):
        """Initialize the HTTP client for an extension.
        
        Args:
            extension_name: Name of the extension (from manifest.json)
            timeout: Request timeout in seconds
        """
        self.extension_name = extension_name
        self.timeout = timeout
        self._extension_id: Optional[str] = None
        self._allowed_urls: Optional[List[Dict]] = None
        self._client = httpx.Client(timeout=timeout)
    
    def _get_extension_info(self) -> tuple:
        """Get the extension's ID and allowed URL patterns."""
        if self._extension_id and self._allowed_urls is not None:
            return self._extension_id, self._allowed_urls
        
        db = SessionLocal()
        try:
            ext = db.query(Extension).filter(
                Extension.name == self.extension_name
            ).first()
            
            if not ext:
                raise ValueError(f"Extension '{self.extension_name}' not found")
            
            self._extension_id = ext.id
            
            permissions = ext.manifest.get("permissions", {})
            network_perms = permissions.get("network", [])
            
            self._allowed_urls = network_perms if network_perms else []
            
            return self._extension_id, self._allowed_urls
        finally:
            db.close()
    
    def _check_url_allowed(self, url: str, method: str) -> tuple:
        """Check if a URL is allowed by the extension's whitelist.
        
        Args:
            url: The target URL
            method: HTTP method (GET, POST, etc.)
            
        Returns:
            (allowed: bool, reason: str or None)
        """
        extension_id, allowed_urls = self._get_extension_info()
        
        if not allowed_urls:
            return False, "No network permissions defined in manifest"
        
        parsed = urlparse(url)
        
        for perm in allowed_urls:
            pattern = perm.get("url", "") if isinstance(perm, dict) else perm
            allowed_methods = perm.get("methods") if isinstance(perm, dict) else None
            
            if allowed_methods and method.upper() not in [m.upper() for m in allowed_methods]:
                continue
            
            if self._url_matches_pattern(url, pattern):
                return True, None
        
        return False, f"URL not in whitelist: {url}"
    
    def _url_matches_pattern(self, url: str, pattern: str) -> bool:
        """Check if a URL matches an allowed pattern.
        
        Supports:
        - Exact match: https://api.example.com/endpoint
        - Wildcard path: https://api.example.com/*
        - Wildcard subdomain: https://*.example.com/*
        - Domain only: https://example.com (matches all paths)
        """
        pattern_parsed = urlparse(pattern)
        url_parsed = urlparse(url)
        
        if pattern_parsed.scheme and pattern_parsed.scheme != url_parsed.scheme:
            return False
        
        pattern_host = pattern_parsed.netloc or pattern_parsed.path.split('/')[0]
        url_host = url_parsed.netloc
        
        if pattern_host.startswith('*.'):
            domain_pattern = pattern_host[2:]
            if not url_host.endswith('.' + domain_pattern):
                return False
        elif pattern_host != url_host:
            return False
        
        pattern_path = pattern_parsed.path
        url_path = url_parsed.path or '/'
        
        if not pattern_path or pattern_path == '/' or pattern_path.endswith('*'):
            path_pattern = pattern_path.rstrip('*') if pattern_path else ''
            if path_pattern and not url_path.startswith(path_pattern.rstrip('/')):
                if path_pattern.rstrip('/') != url_path.rstrip('/'):
                    return False
            return True
        else:
            return url_path.rstrip('/') == pattern_path.rstrip('/')
    
    def _hash_body(self, body: Any) -> Optional[str]:
        """Create a hash of the request body for auditing."""
        if body is None:
            return None
        
        if isinstance(body, (dict, list)):
            import json
            body_str = json.dumps(body, sort_keys=True)
        elif isinstance(body, bytes):
            body_str = body.decode('utf-8', errors='replace')
        else:
            body_str = str(body)
        
        return hashlib.sha256(body_str.encode()).hexdigest()[:16]
    
    def _log_request(
        self,
        method: str,
        url: str,
        allowed: bool,
        blocked_reason: Optional[str] = None,
        request_headers: Optional[Dict] = None,
        request_body: Any = None,
        response_status: Optional[int] = None,
        response_time_ms: Optional[int] = None,
        response_headers: Optional[Dict] = None,
        response_body: Optional[str] = None,
        error: Optional[str] = None
    ):
        """Log a network request to the audit table."""
        extension_id, _ = self._get_extension_info()
        
        safe_headers = {}
        if request_headers:
            for k, v in request_headers.items():
                if k.lower() in ('authorization', 'x-api-key', 'api-key', 'cookie'):
                    safe_headers[k] = '[REDACTED]'
                else:
                    safe_headers[k] = v
        
        safe_response_headers = {}
        if response_headers:
            for k, v in response_headers.items():
                if k.lower() in ('set-cookie', 'authorization'):
                    safe_response_headers[k] = '[REDACTED]'
                else:
                    safe_response_headers[k] = str(v)
        
        body_excerpt = None
        body_size = None
        if response_body:
            body_size = len(response_body)
            body_excerpt = response_body[:500] if len(response_body) > 500 else response_body
        
        db = SessionLocal()
        try:
            audit = ExtensionNetworkAudit(
                id=str(uuid.uuid4()),
                extension_id=extension_id,
                extension_name=self.extension_name,
                target_url=url,
                method=method.upper(),
                request_headers=safe_headers if safe_headers else None,
                request_body_hash=self._hash_body(request_body),
                request_body_size=len(str(request_body)) if request_body else None,
                response_status=response_status,
                response_time_ms=response_time_ms,
                response_headers=safe_response_headers if safe_response_headers else None,
                response_body_excerpt=body_excerpt,
                response_body_size=body_size,
                allowed=allowed,
                blocked_reason=blocked_reason,
                error=error
            )
            db.add(audit)
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"Failed to log network request: {e}")
        finally:
            db.close()
    
    def request(
        self,
        method: str,
        url: str,
        headers: Optional[Dict] = None,
        json: Any = None,
        data: Any = None,
        params: Optional[Dict] = None
    ) -> httpx.Response:
        """Make an HTTP request through the secure proxy.
        
        Args:
            method: HTTP method (GET, POST, PUT, DELETE, etc.)
            url: Target URL (must be in extension's whitelist)
            headers: Optional request headers
            json: Optional JSON body
            data: Optional form data
            params: Optional query parameters
            
        Returns:
            httpx.Response object
            
        Raises:
            PermissionError: If URL is not in the whitelist
            httpx.HTTPError: If the request fails
        """
        allowed, reason = self._check_url_allowed(url, method)
        
        if not allowed:
            self._log_request(
                method=method,
                url=url,
                allowed=False,
                blocked_reason=reason,
                request_headers=headers,
                request_body=json or data
            )
            raise PermissionError(f"Network request blocked: {reason}")
        
        start_time = datetime.utcnow()
        error_msg = None
        response = None
        
        try:
            response = self._client.request(
                method=method,
                url=url,
                headers=headers,
                json=json,
                data=data,
                params=params
            )
            
            elapsed_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            
            self._log_request(
                method=method,
                url=url,
                allowed=True,
                request_headers=headers,
                request_body=json or data,
                response_status=response.status_code,
                response_time_ms=elapsed_ms,
                response_headers=dict(response.headers),
                response_body=response.text[:1000] if response.text else None
            )
            
            return response
            
        except Exception as e:
            elapsed_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            error_msg = str(e)
            
            self._log_request(
                method=method,
                url=url,
                allowed=True,
                request_headers=headers,
                request_body=json or data,
                response_time_ms=elapsed_ms,
                error=error_msg
            )
            raise
    
    def get(self, url: str, **kwargs) -> httpx.Response:
        """Make a GET request."""
        return self.request("GET", url, **kwargs)
    
    def post(self, url: str, **kwargs) -> httpx.Response:
        """Make a POST request."""
        return self.request("POST", url, **kwargs)
    
    def put(self, url: str, **kwargs) -> httpx.Response:
        """Make a PUT request."""
        return self.request("PUT", url, **kwargs)
    
    def patch(self, url: str, **kwargs) -> httpx.Response:
        """Make a PATCH request."""
        return self.request("PATCH", url, **kwargs)
    
    def delete(self, url: str, **kwargs) -> httpx.Response:
        """Make a DELETE request."""
        return self.request("DELETE", url, **kwargs)
    
    def close(self):
        """Close the HTTP client."""
        self._client.close()
    
    def __enter__(self):
        return self
    
    def __exit__(self, *args):
        self.close()
