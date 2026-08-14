"""Server configuration for integration tests.

!! Never use this configuration in production because it
opens the server to the world and provide access to JupyterLab
JavaScript objects through the global window variable.
"""

from tempfile import mkdtemp

from jupyterlab.galata import configure_jupyter_server

configure_jupyter_server(c)  # type: ignore # noqa: F821

# Point the server at a temporary user settings directory
c.LabApp.user_settings_dir = mkdtemp(prefix="pdf-exporter-settings-")  # type: ignore # noqa: F821

# Uncomment to set server log level to debug level
# c.ServerApp.log_level = "DEBUG"
