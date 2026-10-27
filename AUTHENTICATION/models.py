from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager


from SERVICES.logging import info_logger
"""
SIMILAR TO A REGULAR DJANGO USER MODEL BUT SOME CRDENTIALS ARE NEGLECTED
email = unique id
password = get hashed

"""

class AuthManager(BaseUserManager):
    def _blueprint(self, email, password=None, **extra_fields):
        if not email:raise ValueError('Users must have an email is req')
        user = self.model(email=email.upper(), **extra_fields)
        if password:
            user.set_password(password)
            info_logger(msg=f"ACCOUNT CREATION: user ({email.upper()}) created account with password set")
        else:
            user.set_unusable_password()
            info_logger(msg=f"ACCOUNT CREATION: user ({email.upper()}) created account with NO password set")
        user.save(using=self._db)
        return user
    
    def create_buyer(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('is_active', True)
        return self._blueprint(email=email, password=password, **extra_fields)

    def create_staff(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        return self._blueprint(email=email, password=password, **extra_fields)

    def create_admin(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_admin', True)
        return self.create_staff(email=email, password=password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_superuser', True)
        return self.create_admin(email=email, password=password, **extra_fields)
    


class Auth(AbstractBaseUser):
    email = models.EmailField(unique=True, null=False, blank=False)
    date_joined = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True, help_text = "if the user want to manually disable their account / soft delete")   
    is_suspended = models.BooleanField(default=False, help_text = "temporal ban that can be placed by the admins")   
    
    is_buyer = models.BooleanField(default = False)
    is_transporter = models.BooleanField(default = False)
    is_seller = models.BooleanField(default = False)
    
    is_admin = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default = False)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []
     
    objects = AuthManager()

    def has_perm(self, perm, obj=None):
        return True

    def has_module_perms(self, app_label):
        return True

    def has_module_perm(self, app_label):
        return self.has_module_perms(app_label)

    def __str__(self):
        staff_type = "buyer"
        if self.is_seller: staff_type = "seller"
        if self.is_transporter: staff_type = "transporter"
        if self.is_admin: staff_type = "Admin"
        if self.is_superuser: staff_type = "S-Admin"
        
        return f"({staff_type}):- {self.email}"