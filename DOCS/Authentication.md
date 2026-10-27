# AUTHENTICATION ARCHITECHTURE

This project aims to use jwt stateless token as its primary source of authentication and authorization

## TOKENS LIFESPAN

*   access key = 
*   refresh key = 

## BEARER TYPE
inside the header
```'Authorization': 'bearer xxxxxxxxxxxx'```

## AUTH ARCH

* mvp - Json web tokens authentication
* future - additional google auth / third parties authentication

## ROLE TYPES
This role is subject to get addition or update but as mvp, this is the first initial role type we have
And the flexibility allow users to switch between roles depeding of if they are allowed (jiji vibes)

* buyer = this signify the end user whoose goal is to use the platform for purchasing
* seller = this signify the end user whoose goal is to use the platform for selling product
* rider **FUTURE**= transporter
* admins = internal
* system = restrcited

### Auth Feilds - important across all users
* email
* password (will be optional in the future)

# AUTHENTICATION RULE
For an account to be authenticated, the account must be active and not suspended
active is controlled by the user itself while suspension is controlled by admins only
