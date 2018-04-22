
# flake8: noqa

from enum import Enum

from .parser import Parser
from .transmogrifier import Transmogrifier
from .transfilterifier import Transfilterifier
from .checker import Checker


class FormulaStatus(Enum):
    EMPTY = 0
    OK = 1
    ERROR = 2
