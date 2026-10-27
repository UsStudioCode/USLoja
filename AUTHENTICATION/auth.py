# CUSTOM AUTHENTICATION RULE
def should_authenticate(user):
    return user.is_Active and not user.is_suspended