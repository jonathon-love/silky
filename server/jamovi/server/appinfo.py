
import os.path
from sys import platform

from .utils import conf


def determine_r_version(v):
    if v is None:
        if platform == 'win32':
            v = '3.4.1'
        elif platform == 'darwin':
            v = '3.3.0'
        else:
            v = '3.5.1'
    return v


class AppInfo:

    def __init__(self):
        self._app_name = 'jamovi'
        self._version = None
        self._r_version = None

    def __str__(self):
        return self.app_name + ' ' + self.version

    @property
    def app_name(self):
        return self._app_name

    @property
    def version(self):
        if self._version is None:
            try:
                if platform == 'linux':
                    version_path = os.path.join(conf.get('home'), 'lib', 'jamovi', 'version')
                else:
                    version_path = os.path.join(conf.get('home'), 'Resources', 'jamovi', 'version')
                with open(version_path, 'r', encoding='utf-8') as version_file:
                    self._version = version_file.readline().strip()
            except Exception:
                self._version = '0.0.0.0'
        return self._version

    @property
    def r_version(self):
        if self._r_version is None:
            v = conf.get('r_version')
            v = determine_r_version(v)
            self._r_version = v
        return self._r_version

    @property
    def os(self):
        if platform == 'win32':
            return 'win64'
        elif platform == 'darwin':
            return 'macos'
        else:
            return 'linux'


app_info = AppInfo()
