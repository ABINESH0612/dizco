import sys
try:
    from app.main import app
    print("app.main: OK")
except Exception as e:
    print(f"app.main: FAIL - {e}")
    sys.exit(1)

try:
    from app.models.models import Base
    print("app.models.models: OK")
except Exception as e:
    print(f"app.models.models: FAIL - {e}")
    sys.exit(1)

try:
    from app.schemas.schemas import UserOut
    print("app.schemas.schemas: OK")
except Exception as e:
    print(f"app.schemas.schemas: FAIL - {e}")
    sys.exit(1)

print("ALL IMPORTS OK")
