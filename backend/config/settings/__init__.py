"""dev/prod 중 어느 settings 모듈을 쓸지 고른다.

.envs/ 아래 어떤 env 파일을 읽을지 정하는 DJANGO_ENV_FILE 하나로 두 가지를
같이 정한다 (base.py에서 실제로 그 파일을 읽는다):

- 기본값(unset) 또는 그 외 값 → dev.py (+ .envs/.env.dev)
- ".env.prod"                → prod.py (+ .envs/.env.prod)

manage.py / config/wsgi.py / config/asgi.py / pytest는 전부
DJANGO_SETTINGS_MODULE=config.settings만 가리키면 되고, 그걸 dev로 쓸지
prod로 쓸지는 여기서 갈린다.
"""

import os

if os.environ.get("DJANGO_ENV_FILE") == ".env.prod":
    from .prod import *  # noqa: F401,F403
else:
    from .dev import *  # noqa: F401,F403
