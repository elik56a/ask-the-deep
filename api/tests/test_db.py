from app.config import Settings
from app.rag.db import create_pool


async def test_server_pool_limits_how_long_a_query_may_run() -> None:
    async with create_pool(Settings(db_timeout_s=2)) as pool, pool.connection() as conn:
        row = await (await conn.execute("SHOW statement_timeout")).fetchone()
    assert row == ("2s",)
