from django.http import HttpResponseForbidden, HttpResponseRedirect

try:
    # Import the project's IsAdmin permission (central logic lives in customers.views)
    from customers.views import IsAdmin
except Exception:
    IsAdmin = None


class AdminPathIsAdminMiddleware:
    """Require IsAdmin permission for any request starting with /admin/.

    This middleware runs after AuthenticationMiddleware so request.user is set.
    It returns 403 Forbidden when the IsAdmin permission denies access.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Only protect the admin site path
        path = request.path or ''
        if path.startswith('/admin'):
            try:
                if IsAdmin is None:
                    # If we can't resolve IsAdmin, fail closed and return 403 so
                    # the SPA can centrally handle navigation on 403 responses.
                    return HttpResponseForbidden('Forbidden')
                allowed = IsAdmin().has_permission(request, None)
                if not allowed:
                    # Deny access: return 403 so SPA can handle redirect to '/'.
                    return HttpResponseForbidden('Forbidden')
            except Exception:
                # Fail closed: always return 403 so SPA can handle it centrally.
                return HttpResponseForbidden('Forbidden')

        return self.get_response(request)
