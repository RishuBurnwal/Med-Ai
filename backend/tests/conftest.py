"""
Pytest configuration.
asyncio_mode = auto is set in pytest.ini for async test support.
"""

import sys
from pathlib import Path

# Add backend directory to path so imports work
sys.path.insert(0, str(Path(__file__).parent.parent))
