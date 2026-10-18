import os
from pathlib import Path

os.environ["KNOWLEDGE_DIR"] = str(Path(__file__).parent / "fixtures" / "knowledge")
os.environ["LLM_MODEL"] = "test"
