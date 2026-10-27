import logging
logger = logging.getLogger(__name__)

"""
THIS  FILE HOLD ALL TYPE OF LOGGIN FOR FURTHER USAGE,
ITS SOLE PURPOSE IS TO HOLD LOGGING CONFIGURATION FOR THE PROJECT
""" 
from django.conf import settings
debug_base = getattr(settings, "DEBUG", False)


def info_logger(logger = logger, debug = debug_base, msg = "NO MESSAGE PASSED"):
    "Info / Debug Logger"
    if debug: print(msg)
    else: return logger.info(msg=msg)
    
def warning_logger(logger = logger, debug = debug_base, msg = "NO MESSAGE PASSED"):
    "Warning / Debug Logger"
    if debug: print(msg)
    else: return logger.warning(msg=msg)

def error_logger(logger = logger, debug = debug_base, msg = "NO MESSAGE PASSED"):
    "Error / Debug Logger"
    if debug: print(msg)
    else: return logger.error(msg=msg)

